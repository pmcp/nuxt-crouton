// Table component types
export interface TableColumn {
  id?: string
  accessorKey?: string
  header: string | ((props: any) => any)
  cell?: (props: any) => any
  sortable?: boolean
}

export interface TableProps {
  columns: TableColumn[]
  rows: any[]
  collection: string
  serverPagination?: boolean
  paginationData?: PaginationData | null
  refreshFn?: () => Promise<void> | null
  hideDefaultColumns?: {
    created_at?: boolean
    updated_at?: boolean
    actions?: boolean
  }
}

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
  columns?: any[]
  onDelete?: (ids: string[]) => void
  onColumnVisibilityChange?: (column: string, visible: boolean) => void
}

export interface TableSort {
  column: string
  direction: 'asc' | 'desc'
}