/**
 * Scoped-access integration for sales events.
 *
 * Two hook handlers that together let one helper PIN unlock both a scoped
 * CMS page embedding the kassa and the POS endpoints behind it:
 *
 * 1. `crouton:scoped-access:before-redeem` — lazy credential sync. Before
 *    crouton-auth verifies a presented secret for `('event', eventId)`, the
 *    event row's `helperPin` is upserted into the event's grant (the sync
 *    block that used to live in the deleted helper-login endpoint). The pin
 *    is trimmed — the generic redeem endpoint does not trim server-side, so
 *    an untrimmed sync would mismatch forever. `skipWhenLocked` keeps a
 *    locked-out attacker from driving a DB write per attempt. The grant is
 *    fully owned by this sync (role/maxUses/expiresAt/tokenTtl are
 *    overwritten on every login attempt) — never hand-edit it.
 *
 * 2. `crouton:pages:derive-scope` — read-time scope derivation. When a
 *    `scoped` page's content contains an `eventWorkspaceBlock`, the page
 *    gate must redeem the event's helper PIN instead of a page code. The
 *    handler resolves the block's `eventSlug` to the event id (tokens are
 *    id-scoped; blocks deliberately store only the slug) and answers
 *    `{ resourceType: 'event', resourceId, nameRequired: true }` on the
 *    payload's mutable `result`. Answers nothing when the event can't be
 *    resolved — the page then falls back to its page-code gate.
 */
import { eq, and } from 'drizzle-orm'
import { upsertScopedGrant } from '@fyit/crouton-auth/server/utils/scoped-access'
import { salesEvents } from '~~/layers/sales/collections/events/server/database/schema'

interface BeforeRedeemContext {
  organizationId: string
  resourceType: string
  resourceId: string
  credentialType: string
}

interface DeriveScopePayload {
  teamId: string
  blocks: Array<{ type?: string, attrs?: Record<string, unknown> }>
  result: { resourceType: string, resourceId: string, nameRequired?: boolean } | null
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('crouton:scoped-access:before-redeem' as any, async (ctx: BeforeRedeemContext) => {
    if (ctx.resourceType !== 'event' || ctx.credentialType !== 'pin') return

    const db = useDB()
    const [salesEvent] = await db
      .select({ id: salesEvents.id, helperPin: salesEvents.helperPin })
      .from(salesEvents)
      .where(and(
        eq(salesEvents.id, ctx.resourceId),
        eq(salesEvents.teamId, ctx.organizationId)
      ))
      .limit(1)

    if (!salesEvent?.helperPin) return

    await upsertScopedGrant({
      organizationId: ctx.organizationId,
      resourceType: 'event',
      resourceId: ctx.resourceId,
      secret: String(salesEvent.helperPin).trim(),
      role: 'helper',
      skipWhenLocked: true
    })
  })

  nitroApp.hooks.hook('crouton:pages:derive-scope' as any, async (payload: DeriveScopePayload) => {
    // First scoped block wins — another handler (or an earlier block) may
    // already have answered.
    if (payload.result) return

    const block = payload.blocks.find(b => b?.type === 'eventWorkspaceBlock')
    const eventSlug = typeof block?.attrs?.eventSlug === 'string' ? block.attrs.eventSlug.trim() : ''
    if (!eventSlug) return

    const db = useDB()
    const [salesEvent] = await db
      .select({ id: salesEvents.id })
      .from(salesEvents)
      .where(and(
        eq(salesEvents.slug, eventSlug),
        eq(salesEvents.teamId, payload.teamId)
      ))
      .limit(1)

    if (!salesEvent) return

    payload.result = {
      resourceType: 'event',
      resourceId: salesEvent.id,
      nameRequired: true
    }
  })
})
