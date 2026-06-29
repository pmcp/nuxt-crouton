import type { FeedbackTool } from '../composables/useFeedbackTools'

/** Minimal surface of eruda we use. */
export interface ErudaLike {
  init: () => void
  show: () => void
  hide: () => void
}

/**
 * The **Console** tool — an on-page console / DOM / network panel (eruda),
 * available from the unified menu. eruda is lazy-loaded on first activate (its
 * own chunk), so a build that never opens it pays nothing.
 *
 * `loadEruda` is injectable so the tool is unit-testable without the real lib.
 */
export function createConsoleTool(
  loadEruda: () => Promise<ErudaLike> = async () =>
    (await import('eruda')).default as unknown as ErudaLike
): FeedbackTool {
  let eruda: ErudaLike | null = null

  return {
    id: 'console',
    label: 'Console',
    icon: 'i-lucide-terminal',
    order: 1,
    activate: async () => {
      if (!eruda) {
        eruda = await loadEruda()
        eruda.init()
      }
      eruda.show()
    },
    deactivate: () => {
      eruda?.hide()
    }
  }
}
