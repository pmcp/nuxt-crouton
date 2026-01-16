import { readonly, computed, ref, type Ref, type ComputedRef } from 'vue'
import type { KanbanConfig, KanbanColumnConfig } from '../types/table'

/**
 * Kanban state and grouping composable
 *
 * Handles:
 * - Group items by a field value (status, priority, etc.)
 * - Track drag state across columns
 * - Provide column configuration
 *
 * @example
 * const { groupedItems, columns, draggingId } = useKanban({
 *   items: bookings,
 *   groupField: 'status',
 *   columns: [
 *     { value: 'pending', label: 'Pending', color: 'amber' },
 *     { value: 'confirmed', label: 'Confirmed', color: 'green' },
 *     { value: 'cancelled', label: 'Cancelled', color: 'red' }
 *   ]
 * })
 */

export interface UseKanbanOptions<T extends Record<string, any>> {
  /** Items to display in the kanban */
  items: Ref<T[]> | ComputedRef<T[]> | T[]
  /** Field to group items by (can be reactive) */
  groupField: string | Ref<string> | ComputedRef<string>
  /** Field for ordering within columns (default: 'order') */
  orderField?: string
  /** Column configuration - if not provided, auto-detects from unique values */
  columns?: KanbanColumnConfig[]
  /** Include a column for items with null/undefined group values */
  showUncategorized?: boolean
  /** Label for uncategorized column */
  uncategorizedLabel?: string
}

export interface KanbanColumn<T> {
  /** Unique value for this column */
  value: string | null
  /** Display label */
  label: string
  /** Optional color */
  color?: string
  /** Optional icon */
  icon?: string
  /** Items in this column */
  items: T[]
}

export interface UseKanbanReturn<T extends Record<string, any>> {
  /** Items grouped by columns */
  groupedItems: ComputedRef<KanbanColumn<T>[]>
  /** All available columns */
  columns: ComputedRef<KanbanColumnConfig[]>
  /** Currently dragging item ID */
  draggingId: Ref<string | null>
  /** Currently hovered column value */
  dropTargetColumn: Ref<string | null>
  /** Start dragging an item */
  startDrag: (id: string) => void
  /** End drag operation */
  endDrag: () => void
  /** Check if an item is being dragged */
  isDragging: (id?: string) => boolean
  /** Set the current drop target column */
  setDropTarget: (columnValue: string | null) => void
  /** Check if a column is the drop target */
  isDropTarget: (columnValue: string | null) => boolean
  /** The group field being used */
  groupField: string
  /** The order field being used */
  orderField: string
}

// Module-level drag state (shared across all useKanban calls)
const globalDraggingId = ref<string | null>(null)
const globalDropTargetColumn = ref<string | null>(null)

export function useKanban<T extends Record<string, any>>(
  options: UseKanbanOptions<T>
): UseKanbanReturn<T> {
  const {
    items: rawItems,
    groupField: rawGroupField,
    orderField = 'order',
    columns: columnConfig,
    showUncategorized = true,
    uncategorizedLabel = 'Uncategorized'
  } = options

  // Normalize items to a computed ref
  const items = computed<T[]>(() => {
    if (Array.isArray(rawItems)) return rawItems
    return rawItems.value
  })

  // Normalize groupField to be reactive
  const groupField = computed<string>(() => {
    if (typeof rawGroupField === 'string') return rawGroupField
    return rawGroupField.value
  })

  // Auto-detect columns from unique values if not provided
  const columns = computed<KanbanColumnConfig[]>(() => {
    if (columnConfig && columnConfig.length > 0) {
      return columnConfig
    }

    // Extract unique values from items
    const uniqueValues = new Set<string | null>()
    const currentGroupField = groupField.value
    for (const item of items.value) {
      const value = item[currentGroupField]
      if (value !== undefined && value !== null && value !== '') {
        uniqueValues.add(String(value))
      } else if (showUncategorized) {
        uniqueValues.add(null)
      }
    }

    // Convert to column configs
    const autoColumns: KanbanColumnConfig[] = []
    uniqueValues.forEach((value) => {
      if (value === null) {
        autoColumns.push({
          value: null,
          label: uncategorizedLabel
        })
      } else {
        autoColumns.push({
          value,
          label: formatLabel(value)
        })
      }
    })

    // Sort alphabetically, but put uncategorized last
    return autoColumns.sort((a, b) => {
      if (a.value === null) return 1
      if (b.value === null) return -1
      return a.label.localeCompare(b.label)
    })
  })

  // Group items by column
  const groupedItems = computed<KanbanColumn<T>[]>(() => {
    const result: KanbanColumn<T>[] = []
    const currentGroupField = groupField.value

    for (const col of columns.value) {
      const columnItems = items.value.filter((item) => {
        const value = item[currentGroupField]
        if (col.value === null) {
          return value === undefined || value === null || value === ''
        }
        return String(value) === col.value
      })

      // Sort by order field if it exists
      const sortedItems = [...columnItems].sort((a, b) => {
        const orderA = a[orderField] ?? Infinity
        const orderB = b[orderField] ?? Infinity
        return orderA - orderB
      })

      result.push({
        value: col.value,
        label: col.label,
        color: col.color,
        icon: col.icon,
        items: sortedItems
      })
    }

    return result
  })

  // Drag state management
  function startDrag(id: string) {
    globalDraggingId.value = id
  }

  function endDrag() {
    globalDraggingId.value = null
    globalDropTargetColumn.value = null
  }

  function isDragging(id?: string) {
    if (id !== undefined) return globalDraggingId.value === id
    return globalDraggingId.value !== null
  }

  function setDropTarget(columnValue: string | null) {
    globalDropTargetColumn.value = columnValue
  }

  function isDropTarget(columnValue: string | null) {
    return globalDropTargetColumn.value === columnValue
  }

  return {
    groupedItems,
    columns,
    draggingId: readonly(globalDraggingId) as Ref<string | null>,
    dropTargetColumn: readonly(globalDropTargetColumn) as Ref<string | null>,
    startDrag,
    endDrag,
    isDragging,
    setDropTarget,
    isDropTarget,
    groupField: groupField.value,
    orderField
  }
}

/**
 * Format a field value as a human-readable label
 * e.g., 'in_progress' -> 'In Progress'
 */
function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Detect groupable fields from an array of items
 * Returns fields that are simple strings (not objects, arrays, dates)
 * and have a reasonable number of unique values (2-20)
 */
export function detectGroupableFields<T extends Record<string, any>>(
  items: T[],
  exclude: string[] = ['id', 'teamId', 'owner', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt']
): { field: string; uniqueValues: number }[] {
  if (!items.length) return []

  const fieldStats: Record<string, Set<string>> = {}
  const sample = items[0]

  // Analyze first item to get field names
  for (const [field, value] of Object.entries(sample)) {
    // Skip excluded fields
    if (exclude.includes(field)) continue
    // Skip fields ending with Id (likely references)
    if (field.endsWith('Id') || field.endsWith('_id')) continue
    // Skip non-string primitives and complex types
    if (value === null || value === undefined) continue
    if (typeof value === 'object' && !(value instanceof Date)) continue
    if (Array.isArray(value)) continue

    fieldStats[field] = new Set()
  }

  // Count unique values for each field
  for (const item of items) {
    for (const field of Object.keys(fieldStats)) {
      const value = item[field]
      if (value !== null && value !== undefined) {
        fieldStats[field].add(String(value))
      }
    }
  }

  // Filter to fields with 2-20 unique values (good for kanban columns)
  return Object.entries(fieldStats)
    .filter(([_, values]) => values.size >= 2 && values.size <= 20)
    .map(([field, values]) => ({
      field,
      uniqueValues: values.size
    }))
    .sort((a, b) => a.uniqueValues - b.uniqueValues)
}
