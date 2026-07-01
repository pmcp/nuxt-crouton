import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'

interface DispatchResult {
  success: boolean
  workItemId: string
  provider: string
  skill: string
  contextTokens: number
}

/**
 * Composable for dispatching nodes to Pi.dev or other providers.
 *
 * Handles the dispatch API call, optimistic status update, and toast notifications.
 */
export function useWorkDispatch() {
  const { teamId } = useTeamContext()
  const toast = useToast()
  const dispatching = ref(false)

  async function dispatch(
    node: ThinkgraphNode,
    options?: { prompt?: string },
  ): Promise<DispatchResult | null> {
    if (!teamId.value) return null
    dispatching.value = true

    try {
      const result = await $fetch<DispatchResult>(
        `/api/teams/${teamId.value}/dispatch/work-item`,
        {
          method: 'POST',
          body: {
            workItemId: node.id,
            prompt: options?.prompt,
          },
        },
      )

      toast.add({
        title: 'Work dispatched',
        description: `${node.title} → ${result.provider}`,
        color: 'success',
      })

      return result
    }
    catch (err: any) {
      toast.add({
        title: 'Dispatch failed',
        description: err.data?.statusText || err.message || 'Unknown error',
        color: 'error',
      })
      return null
    }
    finally {
      dispatching.value = false
    }
  }

  return {
    dispatch,
    dispatching: readonly(dispatching),
  }
}
