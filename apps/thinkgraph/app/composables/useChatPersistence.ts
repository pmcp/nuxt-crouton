/**
 * useChatPersistence — shared load/save logic for chat conversations.
 *
 * Used by both ChatPanel (global chat) and NodeChatPanel (per-node chat)
 * to persist messages via the thinkgraph-chatconversations API.
 */

interface ChatCallbacks {
  clearMessages: () => void
  exportMessages: () => AIMessage[]
  importMessages: (messages: AIMessage[]) => void
}

interface UseChatPersistenceOptions {
  /** Team ID for API base path */
  teamId: Ref<string> | ComputedRef<string>
  /** Callbacks from useChat instance */
  callbacks: ChatCallbacks
  /** Optional hook called after clearing messages (e.g., reset addedIds) */
  onClear?: () => void
}

export function useChatPersistence(options: UseChatPersistenceOptions) {
  const { teamId, callbacks, onClear } = options

  const conversationId = ref<string | null>(null)
  const isLoadingConversation = ref(false)

  const apiBase = computed(() => `/api/teams/${teamId.value}/thinkgraph-chatconversations`)

  /**
   * Load an existing conversation for a given nodeId.
   * Pass '__global__' for the global chat panel.
   */
  async function loadConversation(nodeId: string) {
    isLoadingConversation.value = true
    conversationId.value = null
    callbacks.clearMessages()
    onClear?.()

    try {
      const result = await $fetch<any>(apiBase.value, {
        query: { nodeId },
      })

      if (result?.id) {
        conversationId.value = result.id
        if (Array.isArray(result.messages) && result.messages.length > 0) {
          callbacks.importMessages(result.messages)
        }
      }
    }
    catch (e: unknown) {
      // 404 is expected (no existing conversation) — start fresh
      const status = (e as { status?: number; statusCode?: number })?.status
        ?? (e as { status?: number; statusCode?: number })?.statusCode
      if (status !== 404) {
        console.warn('Failed to load conversation:', e)
      }
    }
    finally {
      isLoadingConversation.value = false
    }
  }

  /**
   * Save the current conversation — creates or updates.
   * Fire-and-forget: does not block the UI.
   */
  async function saveConversation(nodeId: string, title?: string) {
    const exported = callbacks.exportMessages()
    if (!exported?.length) return

    try {
      if (conversationId.value) {
        await $fetch(`${apiBase.value}/${conversationId.value}`, {
          method: 'PATCH',
          body: {
            messages: exported,
            messageCount: exported.length,
            lastMessageAt: new Date().toISOString(),
          },
        })
      }
      else {
        const result = await $fetch<any>(apiBase.value, {
          method: 'POST',
          body: {
            nodeId,
            title: title || 'Chat',
            messages: exported,
            messageCount: exported.length,
            lastMessageAt: new Date().toISOString(),
          },
        })
        if (result?.id) {
          conversationId.value = result.id
        }
      }
    }
    catch (e) {
      console.warn('Failed to save conversation:', e)
    }
  }

  return {
    isLoadingConversation,
    loadConversation,
    saveConversation,
  }
}
