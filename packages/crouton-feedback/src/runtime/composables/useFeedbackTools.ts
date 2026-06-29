import { reactive, computed } from 'vue'

/**
 * A single entry in the feedback-tools menu.
 *
 * Tools register themselves (from their own client plugin) via
 * `useFeedbackTools().registerTool(...)`; the launcher renders the registry, so
 * adding the next tool is one `registerTool` call — not another floating button.
 * Console (eruda) is the first registered tool; Annotate follows.
 *
 * Extracted from @fyit/crouton-devtools (epic #960) with neutral naming so the
 * registry reads as a standalone library.
 */
export interface FeedbackTool {
  /** Stable unique id (e.g. `'console'`, `'annotate'`). */
  id: string
  /** Human label shown in the menu row. */
  label: string
  /** `UIcon` name, e.g. `'i-lucide-terminal'`. */
  icon: string
  /** Lower sorts first; defaults to 0. */
  order?: number
  /** Return false to hide/disable the tool in the current context. */
  isAvailable?: () => boolean
  /** Turn the tool on. Awaited, so it may lazy-import (e.g. eruda). */
  activate?: () => void | Promise<void>
  /** Turn the tool off. */
  deactivate?: () => void
  /** Optional badge (e.g. an unread count) shown on the row. */
  badge?: () => string | number | null
}

interface FeedbackToolsState {
  tools: Map<string, FeedbackTool>
  active: Set<string>
}

// Module-singleton, client-only UI state. Reactive Map/Set so the launcher
// re-renders as tools register and toggle.
const state: FeedbackToolsState = reactive({
  tools: new Map<string, FeedbackTool>(),
  active: new Set<string>()
})

/**
 * The feedback-tools registry. Returns the registration + toggle API plus a
 * reactive `tools` list (filtered by `isAvailable`, sorted by `order`) the
 * launcher reads.
 */
export function useFeedbackTools() {
  function registerTool(tool: FeedbackTool): void {
    if (!tool?.id) return
    state.tools.set(tool.id, tool)
  }

  function unregisterTool(id: string): void {
    state.tools.delete(id)
    state.active.delete(id)
  }

  const tools = computed<FeedbackTool[]>(() =>
    [...state.tools.values()]
      .filter(tool => (tool.isAvailable ? !!tool.isAvailable() : true))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  )

  function isActive(id: string): boolean {
    return state.active.has(id)
  }

  async function activate(tool: FeedbackTool): Promise<void> {
    if (state.active.has(tool.id)) return
    await tool.activate?.()
    state.active.add(tool.id)
  }

  function deactivate(tool: FeedbackTool): void {
    if (!state.active.has(tool.id)) return
    tool.deactivate?.()
    state.active.delete(tool.id)
  }

  async function toggle(tool: FeedbackTool): Promise<void> {
    if (state.active.has(tool.id)) deactivate(tool)
    else await activate(tool)
  }

  return { registerTool, unregisterTool, tools, isActive, activate, deactivate, toggle }
}

/** Clear all tools + active state (HMR / test isolation). */
export function resetFeedbackTools(): void {
  state.tools.clear()
  state.active.clear()
}
