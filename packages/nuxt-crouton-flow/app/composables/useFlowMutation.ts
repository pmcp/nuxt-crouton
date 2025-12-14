import { ref, readonly, onUnmounted } from 'vue'
import type { XYPosition } from '@vue-flow/core'
import type { FlowPosition } from '../types/flow'

/**
 * Provides mutation utilities for flow node positions
 *
 * Wraps the crouton mutation system to persist node positions
 *
 * @param collection - Collection name
 * @param positionField - Field name where position is stored (default: 'position')
 *
 * @example
 * ```ts
 * const { updatePosition, pending } = useFlowMutation('decisions', 'position')
 *
 * // After node drag
 * await updatePosition('node-123', { x: 100, y: 200 })
 * ```
 */
export function useFlowMutation(collection: string, positionField: string = 'position') {
  const pending = ref(false)
  const error = ref<Error | null>(null)

  // Use the existing crouton mutation system
  // This will be resolved at runtime from the parent nuxt-crouton layer
  const mutation = useCollectionMutation(collection)

  /**
   * Update a node's position
   * Debounced to avoid too many API calls during drag
   */
  const updatePosition = async (id: string, position: XYPosition): Promise<void> => {
    pending.value = true
    error.value = null

    try {
      // Build the update payload with just the position field
      const updateData: Record<string, FlowPosition> = {
        [positionField]: {
          x: Math.round(position.x),
          y: Math.round(position.y)
        }
      }

      await mutation.update(id, updateData)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to update position')
      throw error.value
    } finally {
      pending.value = false
    }
  }

  /**
   * Update multiple node positions in batch
   */
  const updatePositions = async (
    updates: Array<{ id: string; position: XYPosition }>
  ): Promise<void> => {
    pending.value = true
    error.value = null

    try {
      // Update all positions in parallel
      await Promise.all(
        updates.map(({ id, position }) =>
          mutation.update(id, {
            [positionField]: {
              x: Math.round(position.x),
              y: Math.round(position.y)
            }
          })
        )
      )
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to update positions')
      throw error.value
    } finally {
      pending.value = false
    }
  }

  return {
    updatePosition,
    updatePositions,
    pending: readonly(pending),
    error: readonly(error)
  }
}

/**
 * Create a debounced position update function
 * Useful for saving positions after drag without too many API calls
 */
export function useDebouncedPositionUpdate(
  collection: string,
  positionField: string = 'position',
  delay: number = 500
) {
  const { updatePosition, pending, error } = useFlowMutation(collection, positionField)

  // Track pending positions
  const pendingPositions = new Map<string, XYPosition>()
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debouncedUpdate = (id: string, position: XYPosition) => {
    pendingPositions.set(id, position)

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      const updates = Array.from(pendingPositions.entries()).map(([nodeId, pos]) => ({
        id: nodeId,
        position: pos
      }))
      pendingPositions.clear()

      if (updates.length > 0) {
        try {
          await Promise.all(updates.map(u => updatePosition(u.id, u.position)))
        } catch (e) {
          console.error('[useFlowMutation] Failed to save positions:', e)
        }
      }
    }, delay)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })

  return {
    debouncedUpdate,
    pending,
    error
  }
}
