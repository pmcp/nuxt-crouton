// Table component types
export interface TableColumn {
  id?: string
  accessorKey?: string
  header: string | ((props: any) => any)
  cell?: (props: any) => any
  sortable?: boolean
}

// Layout types
export type LayoutType = 'table' | 'list' | 'grid' | 'cards'

export interface ResponsiveLayout {
  base: LayoutType
  sm?: LayoutType
  md?: LayoutType
  lg?: LayoutType
  xl?: LayoutType
  '2xl'?: LayoutType
}

// Layout presets for common patterns
export const layoutPresets: Record<string, ResponsiveLayout> = {
  'responsive': { base: 'list', md: 'grid', lg: 'table' },
  'mobile-friendly': { base: 'list', lg: 'table' },
  'compact': { base: 'list', xl: 'table' }
}

export interface ListProps {
  layout?: LayoutType | ResponsiveLayout | keyof typeof layoutPresets
  columns: TableColumn[]
  rows: any[]
  collection: string
  serverPagination?: boolean
  paginationData?: PaginationData | null
  refreshFn?: () => Promise<void> | null
  hideDefaultColumns?: {
    created_at?: boolean
    updated_at?: boolean
    updatedBy?: boolean
    actions?: boolean
  }
}

// Keep TableProps as alias for backward compatibility during migration
export type TableProps = ListProps

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