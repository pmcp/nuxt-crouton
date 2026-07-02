import type { FeedbackTool } from '../composables/useFeedbackTools'

/**
 * Context the Changelog tool needs from the host — kept injectable so the
 * factory is a pure, unit-testable description of the menu row (no Vue/Nuxt
 * imports). The client plugin wires these to `useChangelog`.
 */
export interface ChangelogToolContext {
  /** Latest version number, or null when there are no entries. */
  getLatest: () => number | null
  /** Whether any changelog entries exist (hides the tool when false). */
  hasEntries: () => boolean
  /** Open/close the changelog overlay. */
  setOpen: (open: boolean) => void
}

/**
 * The **Changelog** tool — a `vNN`-badged row in the glasses launcher that
 * opens the version timeline. Unlike Console/Annotate (persistent overlays),
 * this drives a transient modal, so activate/deactivate just flip its open flag.
 */
export function createChangelogTool(ctx: ChangelogToolContext): FeedbackTool {
  return {
    id: 'changelog',
    label: 'Changelog',
    icon: 'i-lucide-history',
    order: 5,
    isAvailable: () => ctx.hasEntries(),
    badge: () => {
      const v = ctx.getLatest()
      return v == null ? null : `v${v}`
    },
    activate: () => ctx.setOpen(true),
    deactivate: () => ctx.setOpen(false)
  }
}
