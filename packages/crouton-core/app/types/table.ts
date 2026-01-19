// Table component types
export interface TableColumn {
  id?: string
  accessorKey?: string
  header: string | ((props: any) => any)
  cell?: (props: any) => any
  sortable?: boolean
  enableSorting?: boolean
  enableHiding?: boolean
}

// Sortable (drag-and-drop) options for table rows
export interface SortableOptions {
  /** Show drag handle column (default: true) */
  handle?: boolean
  /** SortableJS animation duration in ms (default: 150) */
  animation?: number
  /** Temporarily disable drag-and-drop */
  disabled?: boolean
}

// Layout types
export type LayoutType = 'table' | 'list' | 'grid' | 'tree' | 'kanban'

// Grid size options (replaces separate grid/cards layouts)
export type GridSize = 'compact' | 'comfortable' | 'spacious'

// Hierarchy configuration for tree layouts
export interface HierarchyConfig {
  enabled: boolean
  /** Allow nesting (parent-child). False for sortable-only (flat reorder) */
  allowNesting?: boolean // default: true for hierarchy, false for sortable
  parentField?: string // default: 'parentId'
  orderField?: string // default: 'order'
  pathField?: string // default: 'path' (materialized path)
  depthField?: string // default: 'depth'
}

// Kanban configuration for kanban layouts
export interface KanbanConfig {
  /** Field to group items by (e.g., 'status', 'priority') */
  groupField: string
  /** Field for ordering within columns (default: 'order') */
  orderField?: string
  /** Static columns definition - overrides auto-detection from field options */
  columns?: KanbanColumnConfig[]
  /** Show column item counts (default: true) */
  showCounts?: boolean
  /** Allow creating items directly in columns (default: true) */
  allowColumnCreate?: boolean
}

export interface KanbanColumnConfig {
  /** Unique value for this column (matches groupField values) */
  value: string | null
  /** Display label for the column */
  label: string
  /** Optional color for column header/badge */
  color?: string
  /** Optional icon for column header */
  icon?: string
}

export interface ResponsiveLayout {
  'base': LayoutType
  'sm'?: LayoutType
  'md'?: LayoutType
  'lg'?: LayoutType
  'xl'?: LayoutType
  '2xl'?: LayoutType
}

// Layout presets for common patterns
export const layoutPresets: Record<string, ResponsiveLayout> = {
  'responsive': { base: 'list', md: 'grid', lg: 'table' },
  'mobile-friendly': { base: 'list', lg: 'table' },
  'compact': { base: 'list', xl: 'table' },
  'tree-default': { base: 'tree' }
}

/**
 * Configuration for collaboration presence badges in collection lists
 * Requires @fyit/crouton-collab to be installed
 */
export interface CollabPresenceConfig {
  /**
   * Room type for collab connections
   * @default 'page'
   */
  roomType?: string

  /**
   * Function to derive room ID from row data
   * @default (row) => `${collection}-${row.id}`
   */
  getRoomId?: (row: any, collection: string) => string

  /**
   * Current user ID to exclude from presence count
   */
  currentUserId?: string

  /**
   * Polling interval in milliseconds
   * @default 5000
   */
  pollInterval?: number

  /**
   * Show self in the presence count (for testing)
   * Normally only shows other users
   * @default false
   */
  showSelf?: boolean
}

export interface CollectionProps {
  layout?: LayoutType | ResponsiveLayout | keyof typeof layoutPresets
  columns?: TableColumn[]
  rows?: any[]
  collection: string
  serverPagination?: boolean
  paginationData?: PaginationData | null
  refreshFn?: () => Promise<void> | null
  create?: boolean
  hierarchy?: HierarchyConfig
  card?: 'Card' | 'CardMini' | 'CardSmall' | 'CardTree' | string
  /** Direct card component (skips name resolution, for stateless mode) */
  cardComponent?: any
  /** Enable drag-and-drop row reordering (table layout only) */
  sortable?: boolean | SortableOptions
  /**
   * Grid size for grid layout
   * - compact: 4 columns, tight spacing (old 'grid' layout)
   * - comfortable: 3 columns, medium spacing (default)
   * - spacious: 2 columns, generous spacing (old 'cards' layout)
   * @default 'comfortable'
   */
  gridSize?: GridSize
  hideDefaultColumns?: {
    select?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    presence?: boolean
    actions?: boolean
  }
  /** Stateless mode: no config lookup, no mutations, just renders data */
  stateless?: boolean
  /**
   * Show collaboration presence badges per row
   * Requires @fyit/crouton-collab to be installed
   * Set to true for defaults, or provide CollabPresenceConfig for custom settings
   */
  showCollabPresence?: boolean | CollabPresenceConfig
}

// Keep aliases for backward compatibility
export type ListProps = CollectionProps
export type TableProps = CollectionProps

export interface PaginationData {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface TableSearchProps {
  modelValue: string
  placeholder?: string
  debounceMs?: number
}

export interface TablePaginationProps {
  page: number
  pageCount: number
  totalItems: number
  loading?: boolean
  pageSizes?: number[]
}

export interface TableActionsProps {
  selectedRows: any[]
  collection: string
  table?: any
  onDelete?: (ids: string[]) => void
  onColumnVisibilityChange?: (column: string, visible: boolean) => void
}

export interface TableSort {
  column: string
  direction: 'asc' | 'desc'
}
