import { reactive, computed } from 'vue'

/**
 * A single entry in the Crouton dev-tools menu (#809).
 *
 * Tools register themselves (from their own client plugin) via
 * `useCroutonDevTools().registerTool(...)`; the launcher renders the registry,
 * so adding the next tool is one `registerTool` call — not another floating
 * button. Console + Annotate fold in as the first two tools in #810.
 */
export interface CroutonDevTool {
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

interface DevToolsState {
  tools: Map<string, CroutonDevTool>
  active: Set<string>
}

// Module-singleton, client-only UI state. Reactive Map/Set so the launcher
// re-renders as tools register and toggle.
const state: DevToolsState = reactive({
  tools: new Map<string, CroutonDevTool>(),
  active: new Set<string>()
})

/**
 * The dev-tools registry. Returns the registration + toggle API plus a reactive
 * `tools` list (filtered by `isAvailable`, sorted by `order`) the launcher reads.
 */
export function useCroutonDevTools() {
  function registerTool(tool: CroutonDevTool): void {
    if (!tool?.id) return
    state.tools.set(tool.id, tool)
  }

  function unregisterTool(id: string): void {
    state.tools.delete(id)
    state.active.delete(id)
  }

  const tools = computed<CroutonDevTool[]>(() =>
    [...state.tools.values()]
      .filter(tool => (tool.isAvailable ? !!tool.isAvailable() : true))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  )

  function isActive(id: string): boolean {
    return state.active.has(id)
  }

  async function activate(tool: CroutonDevTool): Promise<void> {
    if (state.active.has(tool.id)) return
    await tool.activate?.()
    state.active.add(tool.id)
  }

  function deactivate(tool: CroutonDevTool): void {
    if (!state.active.has(tool.id)) return
    tool.deactivate?.()
    state.active.delete(tool.id)
  }

  async function toggle(tool: CroutonDevTool): Promise<void> {
    if (state.active.has(tool.id)) deactivate(tool)
    else await activate(tool)
  }

  return { registerTool, unregisterTool, tools, isActive, activate, deactivate, toggle }
}

/** Clear all tools + active state (HMR / test isolation). */
export function resetCroutonDevTools(): void {
  state.tools.clear()
  state.active.clear()
}
