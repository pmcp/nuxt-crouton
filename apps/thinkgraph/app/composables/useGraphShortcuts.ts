import { useEventListener } from '@vueuse/core'

interface GraphShortcutActions {
  toggleStar: (nodeId: string) => void
  togglePark: (nodeId: string) => void
  addChild: (nodeId: string) => void
  openQuickAdd: (parentId?: string) => void
  openSearch: () => void
  clearSelection: () => void
  deleteSelected: (nodeIds: string[]) => void
  expandDefault: (nodeId: string) => void
  openChat: (nodeId: string) => void
  openGlobalChat: () => void
  toggleInspector: () => void
}

export function useGraphShortcuts(
  selectedNodeId: Ref<string | null>,
  selectedNodes: Ref<Set<string>>,
  actions: GraphShortcutActions,
) {
  const isActive = ref(true)
  const showHelp = ref(false)

  function shouldHandle(e: KeyboardEvent): boolean {
    if (!isActive.value) return false
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return false
    return true
  }

  onMounted(() => {
    useEventListener('keydown', (e: KeyboardEvent) => {
      if (!shouldHandle(e)) return

      const nodeId = selectedNodeId.value

      switch (e.key) {
        case 's':
          if (nodeId) { e.preventDefault(); actions.toggleStar(nodeId) }
          break
        case 'p':
          if (nodeId) { e.preventDefault(); actions.togglePark(nodeId) }
          break
        case 'n':
          e.preventDefault()
          if (nodeId) actions.addChild(nodeId)
          break
        case 'q':
          e.preventDefault()
          actions.openQuickAdd(nodeId || undefined)
          break
        case '/':
          e.preventDefault()
          actions.openSearch()
          break
        case 'Escape':
          e.preventDefault()
          actions.clearSelection()
          break
        case 'Delete':
        case 'Backspace':
          if (selectedNodes.value.size > 0) {
            e.preventDefault()
            actions.deleteSelected(Array.from(selectedNodes.value))
          } else if (nodeId) {
            e.preventDefault()
            actions.deleteSelected([nodeId])
          }
          break
        case 'e':
          if (nodeId) { e.preventDefault(); actions.expandDefault(nodeId) }
          break
        case 'c':
          if (nodeId && !e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            actions.openChat(nodeId)
          }
          break
        case 'g':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            actions.openGlobalChat()
          }
          break
        case 'i':
          e.preventDefault()
          actions.toggleInspector()
          break
        case '?':
          e.preventDefault()
          showHelp.value = !showHelp.value
          break
      }
    })
  })

  function pause() { isActive.value = false }
  function resume() { isActive.value = true }

  return { isActive, showHelp, pause, resume }
}
