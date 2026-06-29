import type { FeedbackTool } from '../composables/useFeedbackTools'
import { useAnnotate } from '../composables/useAnnotate'

/**
 * The **Annotate** tool — pin a comment on a page element; it builds the
 * structured `Annotation` (route + selector + the owning source file from the
 * `data-feedback-src` stamp) and POSTs it to `/api/_feedback`. The launcher
 * toggle drives select-mode; the AnnotateOverlay renders the highlight + panel.
 */
export function createAnnotateTool(): FeedbackTool {
  const { start, stop } = useAnnotate()

  return {
    id: 'annotate',
    label: 'Annotate',
    icon: 'i-lucide-pen-line',
    order: 2,
    activate: () => start(),
    deactivate: () => stop()
  }
}
