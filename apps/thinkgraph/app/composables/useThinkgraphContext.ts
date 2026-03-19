import type { InjectionKey, Ref } from 'vue'

export interface ThinkgraphContext {
  expand: (id: string, mode?: string) => void
  expanding: Ref<string | null>
  copyContext: (id: string, pathType?: string) => Promise<void>
  openQuickAdd: (parentId?: string) => void
  openChat: (nodeId: string) => void
  openDispatch: (nodeId: string) => void
  openTerminal: (nodeId: string) => void
  openSession: (nodeId: string) => void
  togglePin: (nodeId: string) => void
  toggleStar: (nodeId: string) => void
  contextNodeIds: Ref<string[]>
  contextMode: Ref<'path' | 'selection'>
  focusInPath: (nodeId: string) => void
  graphId: Ref<string>
}

const THINKGRAPH_CONTEXT_KEY: InjectionKey<ThinkgraphContext> = Symbol('thinkgraph:context')

export function provideThinkgraphContext(ctx: ThinkgraphContext) {
  provide(THINKGRAPH_CONTEXT_KEY, ctx)
}

export function useThinkgraphContext(): ThinkgraphContext {
  const ctx = inject(THINKGRAPH_CONTEXT_KEY)
  if (!ctx) {
    throw new Error('useThinkgraphContext() must be used inside a component that calls provideThinkgraphContext()')
  }
  return ctx
}