import type { ThinkgraphDecision } from '../../layers/thinkgraph/collections/decisions/types'

/**
 * Panel visibility and panel-specific state.
 */
export function useGraphPanels(decisions: Ref<ThinkgraphDecision[]>) {
  // Panel visibility
  const showPath = ref(true)
  const showChat = ref(false)
  const showFilters = ref(false)
  const showInspector = ref(false)
  const showQuickAdd = ref(false)
  const showTerminal = ref(false)
  const showDispatch = ref(false)

  // Chat state
  const chatNodeId = ref<string | null>(null)
  const chatNodeName = computed(() => {
    if (!chatNodeId.value) return undefined
    const node = decisions.value?.find(d => d.id === chatNodeId.value)
    return node?.content?.slice(0, 50) || undefined
  })

  function openChat(nodeId: string) {
    chatNodeId.value = nodeId
    showChat.value = true
  }

  function openGlobalChat() {
    chatNodeId.value = null
    showChat.value = true
  }

  // Quick add state
  const quickAddParentId = ref<string | undefined>()

  function openQuickAdd(parentId?: string) {
    quickAddParentId.value = parentId
    showQuickAdd.value = true
  }

  // Terminal state
  const terminalNodeId = ref<string | null>(null)

  function openTerminal(nodeId: string) {
    terminalNodeId.value = nodeId
    showTerminal.value = true
  }

  // Dispatch state
  const dispatchNodeId = ref<string | null>(null)
  const dispatchNodeIds = ref<string[]>([])
  const dispatchNodeContent = computed(() => {
    if (!dispatchNodeId.value) return undefined
    const node = decisions.value?.find(d => d.id === dispatchNodeId.value)
    return node?.content?.slice(0, 100) || undefined
  })

  function openDispatch(nodeId: string) {
    dispatchNodeIds.value = [nodeId]
    dispatchNodeId.value = nodeId
    showDispatch.value = true
  }

  function openMultiDispatch(nodeIds: string[]) {
    dispatchNodeIds.value = nodeIds
    dispatchNodeId.value = nodeIds[0] || null
    showDispatch.value = true
  }

  return {
    // Visibility
    showPath,
    showChat,
    showFilters,
    showInspector,
    showQuickAdd,
    showTerminal,
    showDispatch,
    // Chat
    chatNodeId,
    chatNodeName,
    openChat,
    openGlobalChat,
    // Quick add
    quickAddParentId,
    openQuickAdd,
    // Terminal
    terminalNodeId,
    openTerminal,
    // Dispatch
    dispatchNodeId,
    dispatchNodeIds,
    dispatchNodeContent,
    openDispatch,
    openMultiDispatch,
    // Digest
  }
}
