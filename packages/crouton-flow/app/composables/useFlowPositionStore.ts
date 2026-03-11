import { ref, readonly } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { XYPosition } from '@vue-flow/core'

/**
 * Stores node positions on the flow_configs table (nodePositions JSON column).
 *
 * This allows the flow package to persist positions without requiring
 * a position field on the collection schema. Positions are tied to the
 * flow config, not the collection data.
 *
 * @param flowId - The flow config ID
 * @param delay - Debounce delay in ms (default: 500)
 */
export function useFlowPositionStore(flowId: string, delay: number = 500) {
  const pending = ref(false)
  const error = ref<Error | null>(null)
  const { getTeamId } = useTeamContext()

  // Track pending positions to batch updates within the debounce window
  const pendingPositions = new Map<string, XYPosition>()

  const flushPositions = useDebounceFn(async () => {
    const positions: Record<string, { x: number; y: number }> = {}
    for (const [nodeId, pos] of pendingPositions.entries()) {
      positions[nodeId] = { x: Math.round(pos.x), y: Math.round(pos.y) }
    }
    pendingPositions.clear()

    if (Object.keys(positions).length === 0) return

    pending.value = true
    error.value = null

    try {
      const teamId = getTeamId()
      await $fetch(`/api/crouton-flow/teams/${teamId}/flows/${flowId}/positions`, {
        method: 'PATCH',
        body: { positions },
        credentials: 'include',
      })
    }
    catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to save positions')
      console.error('[useFlowPositionStore] Failed to save positions:', e)
    }
    finally {
      pending.value = false
    }
  }, delay)

  return {
    debouncedUpdate: (id: string, position: XYPosition) => {
      pendingPositions.set(id, position)
      flushPositions()
    },
    pending: readonly(pending),
    error: readonly(error),
  }
}
