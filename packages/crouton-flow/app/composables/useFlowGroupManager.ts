import { ref, computed, type Ref } from 'vue'
import type { Node } from '@vue-flow/core'

export interface FlowGroup {
  id: string
  name: string
  color: string
}

export interface GroupAssignment {
  nodeId: string
  label: string
  groupName: string
}

export interface UseFlowGroupManagerOptions {
  /** Default dimensions for new group nodes */
  defaultGroupWidth?: number
  defaultGroupHeight?: number
  /** Node type string for group nodes */
  groupNodeType?: string
  /** Palette of background colors for groups */
  groupColors?: string[]
}

const DEFAULT_GROUP_COLORS = [
  '#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff',
  '#ccfbf1', '#fee2e2', '#f3e8ff', '#cffafe', '#fef9c3',
]

/**
 * Manage group nodes: CRUD, assignments, and auto-grouping by property.
 *
 * Works with any nodes array — does not mutate directly, returns new arrays.
 *
 * @example
 * ```ts
 * const { groups, createGroup, removeGroup, assignments, autoGroupByProperty } = useFlowGroupManager({
 *   groupNodeType: 'resizableGroup',
 * })
 * ```
 */
export function useFlowGroupManager(options: UseFlowGroupManagerOptions = {}) {
  const {
    defaultGroupWidth = 500,
    defaultGroupHeight = 400,
    groupNodeType = 'resizableGroup',
    groupColors = DEFAULT_GROUP_COLORS,
  } = options

  const groups: Ref<FlowGroup[]> = ref([])
  let groupCounter = 0

  function nextColor(): string {
    return groupColors[groups.value.length % groupColors.length]!
  }

  function nextId(): string {
    return `group-${++groupCounter}`
  }

  /**
   * Create a new group and return the group node to add to the canvas.
   */
  function createGroup(name: string, position?: { x: number, y: number }): Node {
    const id = nextId()
    const color = nextColor()
    groups.value.push({ id, name, color })

    const pos = position ?? {
      x: groups.value.length * (defaultGroupWidth + 50) - defaultGroupWidth,
      y: -350,
    }

    return {
      id,
      type: groupNodeType,
      position: pos,
      data: { label: name },
      style: {
        width: `${defaultGroupWidth}px`,
        height: `${defaultGroupHeight}px`,
        backgroundColor: color,
        borderRadius: '12px',
        border: '2px dashed #9ca3af',
        opacity: '0.6',
      },
    }
  }

  /**
   * Remove a group and release its children to absolute positions.
   * Returns the updated nodes array.
   */
  function removeGroup(nodes: Node[], groupId: string): Node[] {
    const groupNode = nodes.find(n => n.id === groupId)

    const updated = nodes
      .filter(n => n.id !== groupId)
      .map((n) => {
        if (n.parentNode === groupId) {
          return {
            ...n,
            parentNode: undefined,
            extent: undefined,
            position: {
              x: n.position.x + (groupNode?.position.x || 0),
              y: n.position.y + (groupNode?.position.y || 0),
            },
            data: { ...n.data, grouped: false },
          }
        }
        return n
      })

    groups.value = groups.value.filter(g => g.id !== groupId)
    return updated
  }

  /**
   * Rename a group and update the corresponding node's label.
   * Returns the updated nodes array.
   */
  function renameGroup(nodes: Node[], groupId: string, newName: string): Node[] {
    const group = groups.value.find(g => g.id === groupId)
    if (group) group.name = newName

    return nodes.map(n =>
      n.id === groupId
        ? { ...n, data: { ...n.data, label: newName } }
        : n,
    )
  }

  /**
   * Compute assignments: which card nodes are inside which groups.
   */
  function getAssignments(nodes: Node[], labelField = 'title'): GroupAssignment[] {
    return nodes
      .filter(n => n.type !== groupNodeType && n.parentNode)
      .map((n) => {
        const group = groups.value.find(g => g.id === n.parentNode)
        return {
          nodeId: n.id,
          label: (n.data?.[labelField] as string) || n.label || n.id,
          groupName: group?.name || '',
        }
      })
      .filter(a => a.groupName)
  }

  /**
   * Auto-group items by a property value.
   * Returns a complete nodes array with groups and positioned cards.
   *
   * @param items - Array of items (must have `id` and `properties` or direct property access)
   * @param propertyName - Property to group by
   * @param getPropertyValue - Extract the grouping value from an item
   * @param buildCardNode - Build a card node from an item (without position/parentNode)
   */
  function autoGroupByProperty<T extends Record<string, unknown>>(
    items: T[],
    propertyName: string,
    getPropertyValue: (item: T) => string | null,
    buildCardNode: (item: T) => Omit<Node, 'position'>,
  ): Node[] {
    const CARD_W = 220
    const CARD_H = 120
    const GROUP_PAD_X = 30
    const GROUP_PAD_TOP = 45
    const GROUP_PAD_BOTTOM = 20
    const GROUP_GAP = 50
    const CARD_GAP_X = 10
    const CARD_GAP_Y = 10
    const GAP = 30

    // Reset groups
    groups.value = []
    groupCounter = 0

    // Bucket items by property value
    const buckets = new Map<string, T[]>()
    const ungrouped: T[] = []

    for (const item of items) {
      const val = getPropertyValue(item)
      if (val) {
        if (!buckets.has(val)) buckets.set(val, [])
        buckets.get(val)!.push(item)
      }
      else {
        ungrouped.push(item)
      }
    }

    const allNodes: Node[] = []
    let groupXOffset = 0
    let maxGroupH = 0
    let groupIndex = 0

    // Create groups with cards inside
    for (const [groupName, groupItems] of buckets) {
      const id = nextId()
      const color = groupColors[groupIndex % groupColors.length]!
      groups.value.push({ id, name: groupName, color })

      const cols = Math.max(1, Math.min(3, groupItems.length))
      const rows = Math.ceil(groupItems.length / cols)
      const groupW = GROUP_PAD_X + cols * (CARD_W + CARD_GAP_X)
      const groupH = GROUP_PAD_TOP + rows * (CARD_H + CARD_GAP_Y) + GROUP_PAD_BOTTOM

      allNodes.push({
        id,
        type: groupNodeType,
        position: { x: groupXOffset, y: 0 },
        data: { label: groupName },
        style: {
          width: `${groupW}px`,
          height: `${groupH}px`,
          backgroundColor: color,
          borderRadius: '12px',
          border: '2px dashed #9ca3af',
          opacity: '0.6',
        },
      })

      maxGroupH = Math.max(maxGroupH, groupH)

      for (let i = 0; i < groupItems.length; i++) {
        const cardBase = buildCardNode(groupItems[i]!)
        allNodes.push({
          ...cardBase,
          parentNode: id,
          position: {
            x: 15 + (i % cols) * (CARD_W + CARD_GAP_X),
            y: GROUP_PAD_TOP + Math.floor(i / cols) * (CARD_H + CARD_GAP_Y),
          },
        } as Node)
      }

      groupXOffset += groupW + GROUP_GAP
      groupIndex++
    }

    // Place ungrouped in grid below
    const ungroupedY = buckets.size > 0 ? maxGroupH + 80 : 50
    const ungroupedCols = Math.max(1, Math.ceil(Math.sqrt(ungrouped.length)))

    for (let i = 0; i < ungrouped.length; i++) {
      const cardBase = buildCardNode(ungrouped[i]!)
      allNodes.push({
        ...cardBase,
        position: {
          x: (i % ungroupedCols) * (CARD_W + GAP) + 50,
          y: Math.floor(i / ungroupedCols) * (CARD_H + GAP) + ungroupedY,
        },
      } as Node)
    }

    return allNodes
  }

  /**
   * Restore groups from a saved layout snapshot.
   */
  function restoreGroups(savedGroups: Array<{ id: string, name: string, color: string }>) {
    groups.value = []
    groupCounter = 0

    for (const g of savedGroups) {
      const numericPart = parseInt(g.id.replace('group-', ''))
      if (numericPart > groupCounter) groupCounter = numericPart
      groups.value.push({ id: g.id, name: g.name, color: g.color })
    }
  }

  return {
    groups: computed(() => groups.value),
    groupColors,
    createGroup,
    removeGroup,
    renameGroup,
    getAssignments,
    autoGroupByProperty,
    restoreGroups,
  }
}
