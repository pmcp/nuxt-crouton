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
export type LayoutType = 'table' | 'list' | 'grid' | 'cards' | 'tree'

// Hierarchy configuration for tree layouts
export interface HierarchyConfig {
  enabled: boolean
  parentField?: string // default: 'parentId'
  orderField?: string // default: 'order'
  pathField?: string // default: 'path' (materialized path)
  depthField?: string // default: 'depth'
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

export interface CollectionProps {
  layout?: LayoutType | ResponsiveLayout | keyof typeof layoutPresets
  columns: TableColumn[]
  rows: any[]
  collection: string
  serverPagination?: boolean
  paginationData?: PaginationData | null
  refreshFn?: () => Promise<void> | null
  create?: boolean
  hierarchy?: HierarchyConfig
  card?: 'Card' | 'CardMini' | 'CardSmall' | 'CardTree' | string
  /** Enable drag-and-drop row reordering (table layout only) */
  sortable?: boolean | SortableOptions
  hideDefaultColumns?: {
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    actions?: boolean
  }
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
