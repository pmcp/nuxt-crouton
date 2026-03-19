import { eq, and } from 'drizzle-orm'
import { updateThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'
import * as tables from '~~/layers/thinkgraph/collections/workitems/server/database/schema'

/**
 * Deploy Webhook for receiving Cloudflare Pages preview URLs from GitHub Actions.
 *
 * POST /api/teams/[id]/dispatch/deploy-webhook
 * Headers: X-Webhook-Secret: <shared secret>
 * Body: {
 *   branch: string,       // Git branch name (maps to workItem.worktree)
 *   deployUrl: string,     // Cloudflare Pages preview URL
 * }
 *
 * Looks up the work item by its worktree field (branch name),
 * then sets the deployUrl field on it.
 */
export default defineEventHandler(async (event) => {
  // Verify webhook secret
  const config = useRuntimeConfig()
  const expectedSecret = config.webhookSecret || config.public?.webhookSecret
  if (expectedSecret) {
    const providedSecret = getHeader(event, 'x-webhook-secret')
    if (providedSecret !== expectedSecret) {
      throw createError({ status: 401, statusText: 'Invalid webhook secret' })
    }
  }

  const { id: teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({ status: 400, statusText: 'Missing team ID' })
  }

  const body = await readBody(event)
  const { branch, deployUrl } = body

  if (!branch || !deployUrl) {
    throw createError({ status: 400, statusText: 'Missing required fields: branch, deployUrl' })
  }

  // Find work item by worktree (branch name)
  const db = useDB()
  const [workItem] = await (db as any)
    .select()
    .from(tables.thinkgraphWorkItems)
    .where(
      and(
        eq(tables.thinkgraphWorkItems.teamId, teamId),
        eq(tables.thinkgraphWorkItems.worktree, branch),
      ),
    )
    .limit(1)

  if (!workItem) {
    return {
      success: false,
      message: `No work item found for branch "${branch}"`,
    }
  }

  await updateThinkgraphWorkItem(
    workItem.id,
    teamId,
    'system',
    { deployUrl },
    { role: 'admin' },
  )

  return {
    success: true,
    workItemId: workItem.id,
    deployUrl,
  }
})
