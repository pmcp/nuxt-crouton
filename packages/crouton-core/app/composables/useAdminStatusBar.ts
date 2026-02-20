interface StatusMessage {
  id: string
  text: string
  icon: string
  type: 'success' | 'error'
  timestamp: number
  collection?: string
  operation?: string
}

const EXPIRE_MS = 4000

export function useAdminStatusBar() {
  const messages = useState<StatusMessage[]>('crouton-status-bar-messages', () => [])
  const listenerRegistered = useState<boolean>('crouton-status-bar-listener', () => false)

  const currentMessage = computed<StatusMessage | undefined>(() => messages.value[0])

  const addMessage = (msg: Omit<StatusMessage, 'id' | 'timestamp'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    messages.value = [{ ...msg, id, timestamp: Date.now() }, ...messages.value]

    setTimeout(() => {
      messages.value = messages.value.filter((m: StatusMessage) => m.id !== id)
    }, EXPIRE_MS)
  }

  // Register listener once (singleton pattern via useState)
  if (!listenerRegistered.value) {
    listenerRegistered.value = true

    const nuxtApp = useNuxtApp()
    nuxtApp.hook('crouton:mutation', ({ operation, collection, itemIds }: { operation: string; collection: string; itemIds?: string[] }) => {
      let text = ''
      let icon = 'i-lucide-check'

      if (operation === 'create') {
        text = 'Created successfully'
        icon = 'i-lucide-plus'
      } else if (operation === 'update') {
        text = 'Saved'
        icon = 'i-lucide-check'
      } else if (operation === 'delete') {
        const count = Array.isArray(itemIds) ? itemIds.length : 1
        text = count > 1 ? `Deleted ${count} items` : 'Deleted'
        icon = 'i-lucide-trash-2'
      } else if (operation === 'move' || operation === 'reorder') {
        text = 'Reordered'
        icon = 'i-lucide-arrow-up-down'
      } else {
        text = 'Done'
      }

      addMessage({ text, icon, type: 'success', collection, operation })
    })
  }

  return { messages, currentMessage, addMessage }
}
