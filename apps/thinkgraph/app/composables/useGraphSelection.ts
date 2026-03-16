/**
 * Selection state: selected node, multi-select, context mode.
 */
export function useGraphSelection() {
  const toast = useToast()

  const selectedNodeId = ref<string | null>(null)
  const selectedNodes = ref<Set<string>>(new Set())
  const selectedNodeIds = computed(() => Array.from(selectedNodes.value))

  // Context mode: which nodes provide AI context
  const contextMode = ref<'path' | 'selection'>('path')
  const contextNodeIds = ref<string[]>([])

  function onNodeClick(nodeId: string, _data: Record<string, unknown>, event?: MouseEvent) {
    if (event?.shiftKey) return
    selectedNodeId.value = nodeId
  }

  function onSelectionChange(nodeIds: string[]) {
    selectedNodes.value = new Set(nodeIds)
  }

  function deselectNode(id: string) {
    const s = new Set(selectedNodes.value)
    s.delete(id)
    selectedNodes.value = s
  }

  function clearSelection() {
    selectedNodes.value = new Set()
    selectedNodeId.value = null
  }

  function useSelectionAsContext() {
    contextNodeIds.value = Array.from(selectedNodes.value)
    contextMode.value = 'selection'
    toast.add({
      title: `${contextNodeIds.value.length} nodes set as AI context`,
      icon: 'i-lucide-brain',
      color: 'info',
    })
  }

  function clearContextSelection() {
    contextMode.value = 'path'
    contextNodeIds.value = []
  }

  return {
    selectedNodeId,
    selectedNodes,
    selectedNodeIds,
    contextMode,
    contextNodeIds,
    onNodeClick,
    onSelectionChange,
    deselectNode,
    clearSelection,
    useSelectionAsContext,
    clearContextSelection,
  }
}
