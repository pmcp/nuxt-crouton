/**
 * Local type augmentation for the crouton:pages:derive-scope Nitro hook.
 *
 * Fired by the page slug endpoint when a 'scoped' page is requested: domain
 * packages inspect the page's content blocks and may answer with the scope a
 * credential must be redeemed against (e.g. crouton-sales answers
 * ('event', eventId) for pages embedding an eventWorkspaceBlock). Nitro hooks
 * are fire-and-forget, so handlers answer via the payload's mutable `result`
 * field — the first non-null answer wins (later handlers must return early
 * when `result` is already set). No answer ⇒ the page falls back to its
 * stored config.requiredScope, then to its own ('page', pageId) gate.
 */

declare module 'nitropack' {
  interface NitroRuntimeHooks {
    'crouton:pages:derive-scope': (payload: PagesDeriveScopePayload) => void | Promise<void>
  }
}

export interface PagesDeriveScopePayload {
  /** Resolved team (organization) id */
  teamId: string
  /** Top-level content blocks of the page (TipTap doc content) */
  blocks: Array<{ type?: string, attrs?: Record<string, unknown> }>
  /** Mutable answer slot — first handler to set it wins */
  result: { resourceType: string, resourceId: string, nameRequired?: boolean } | null
}

export {}
