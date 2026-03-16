import type { InjectionKey, Ref } from 'vue'

/**
 * Typed injection keys for ThinkGraph provide/inject communication.
 * Replaces string-keyed provide/inject with type-safe symbols.
 */

export const THINKGRAPH_EXPAND: InjectionKey<(id: string, mode?: string) => void> =
  Symbol('thinkgraph:expand')

export const THINKGRAPH_EXPANDING: InjectionKey<Ref<string | null>> =
  Symbol('thinkgraph:expanding')

export const THINKGRAPH_COPY_CONTEXT: InjectionKey<(id: string, pathType?: string) => Promise<void>> =
  Symbol('thinkgraph:copyContext')

export const THINKGRAPH_OPEN_QUICK_ADD: InjectionKey<(parentId?: string) => void> =
  Symbol('thinkgraph:openQuickAdd')

export const THINKGRAPH_OPEN_CHAT: InjectionKey<(nodeId: string) => void> =
  Symbol('thinkgraph:openChat')

export const THINKGRAPH_DISPATCH: InjectionKey<(nodeId: string) => void> =
  Symbol('thinkgraph:dispatch')

export const THINKGRAPH_OPEN_TERMINAL: InjectionKey<(nodeId: string) => void> =
  Symbol('thinkgraph:openTerminal')

export const THINKGRAPH_TOGGLE_PIN: InjectionKey<(nodeId: string) => void> =
  Symbol('thinkgraph:togglePin')

export const THINKGRAPH_TOGGLE_STAR: InjectionKey<(nodeId: string) => void> =
  Symbol('thinkgraph:toggleStar')

export const THINKGRAPH_CONTEXT_NODE_IDS: InjectionKey<Ref<string[]>> =
  Symbol('thinkgraph:contextNodeIds')

export const THINKGRAPH_CONTEXT_MODE: InjectionKey<Ref<'path' | 'selection'>> =
  Symbol('thinkgraph:contextMode')

export const THINKGRAPH_FOCUS_IN_PATH: InjectionKey<(nodeId: string) => void> =
  Symbol('thinkgraph:focusInPath')
