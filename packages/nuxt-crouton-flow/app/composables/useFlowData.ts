import { computed, type ComputedRef, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { UseFlowDataOptions, FlowPosition } from '../types/flow'

/**
 * Convert collection rows to Vue Flow nodes and edges
 *
 * @param rows - Reactive array of collection items
 * @param options - Configuration options
 * @returns Nodes and edges for Vue Flow
 *
 * @example
 * ```ts
 * const { nodes, edges, getNode, getItem } = useFlowData(
 *   computed(() => decisions),
 *   { parentField: 'parentId', positionField: 'position' }
 * )
 * ```
 */
export function useFlowData<T extends Record<string, unknown>>(
  rows: Ref<T[]> | ComputedRef<T[]>,
  options: UseFlowDataOptions = {}
) {
  const {
    parentField = 'parentId',
    positionField = 'position',
    labelField = 'title'
  } = options

  // Build a map for quick lookups
  const itemMap = computed(() => {
    const map = new Map<string, T>()
    for (const row of rows.value) {
      const id = row.id as string
      if (id) {
        map.set(id, row)
      }
    }
    return map
  })

  // Convert rows to Vue Flow nodes
  const nodes = computed<Node<T>[]>(() => {
    return rows.value.map((row) => {
      const id = row.id as string
      const rawPosition = row[positionField] as FlowPosition | undefined
      const label = row[labelField] as string | undefined

      // Validate position has actual x/y values (not empty object)
      const hasValidPosition = rawPosition
        && typeof rawPosition.x === 'number'
        && typeof rawPosition.y === 'number'
        && !isNaN(rawPosition.x)
        && !isNaN(rawPosition.y)

      const position = hasValidPosition ? rawPosition : { x: 0, y: 0 }

      return {
        id,
        type: 'default',
        position,
        data: row,
        label: label ?? id,
        // Mark nodes that need layout (no stored position)
        ...(!hasValidPosition ? { _needsLayout: true } : {})
      }
    })
  })

  // Build edges from parent relationships
  const edges = computed<Edge[]>(() => {
    const result: Edge[] = []

    for (const row of rows.value) {
      const id = row.id as string
      const parentId = row[parentField] as string | undefined | null

      if (parentId && itemMap.value.has(parentId)) {
        result.push({
          id: `e-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: 'default'
        })
      }
    }

    return result
  })

  // Helper to get a node by ID
  const getNode = (id: string): Node<T> | undefined => {
    return nodes.value.find(n => n.id === id)
  }

  // Helper to get an item by ID
  const getItem = (id: string): T | undefined => {
    return itemMap.value.get(id)
  }

  return {
    nodes,
    edges,
    getNode,
    getItem
  }
}
