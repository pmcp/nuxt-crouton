import type { ThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/types'

interface DispatchResult {
  success: boolean
  workItemId: string
  provider: string
  skill: string
  contextTokens: number
}

/**
 * Composable for dispatching work items to Pi.dev or other providers.
 *
 * Handles the dispatch API call, optimistic status update, and toast notifications.
 */
export function useWorkDispatch() {
  const { teamId } = useTeamContext()
  const toast = useToast()
  const dispatching = ref(false)

  async function dispatch(
    workItem: ThinkgraphWorkItem,
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
            workItemId: workItem.id,
            prompt: options?.prompt,
          },
        },
      )

      toast.add({
        title: 'Work dispatched',
        description: `${workItem.title} → ${result.provider} (/${result.skill})`,
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
