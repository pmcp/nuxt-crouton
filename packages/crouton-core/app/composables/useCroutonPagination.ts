/**
 * useCroutonPagination - Per-collection pagination state
 *
 * Pulled out of useCrouton() so the modal/form composable doesn't carry
 * unrelated table pagination concerns. Backed by `useState('pagination', ...)`
 * so paging survives navigation between routes that share a collection.
 */

export interface PaginationState {
  currentPage: number
  pageSize: number
  sortBy: string
  sortDirection: 'asc' | 'desc'
  totalItems?: number
  totalPages?: number
}

export interface PaginationMap {
  [collection: string]: PaginationState
}

/** Default pagination settings applied when a collection has no explicit config */
export const DEFAULT_PAGINATION: PaginationState = {
  currentPage: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
}

export function useCroutonPagination() {
  const pagination = useState<PaginationMap>('pagination', () => ({}))

  /** Update pagination state for a collection (merges with existing values) */
  function setPagination(collection: string, paginationData: Partial<PaginationState>) {
    pagination.value[collection] = {
      ...DEFAULT_PAGINATION,
      ...pagination.value[collection],
      ...paginationData
    }
  }

  /** Read pagination state for a collection — falls back to safe defaults */
  function getPagination(collection: string): PaginationState {
    return pagination.value[collection] || {
      currentPage: 1,
      pageSize: 10,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      totalItems: 0,
      totalPages: 0
    }
  }

  /** Resolve the default pagination for a collection (collection config overrides global default) */
  function getDefaultPagination(collection: string): PaginationState {
    const collections = useCollections()
    const config = collections.getConfig?.(collection)
    return config?.defaultPagination || DEFAULT_PAGINATION
  }

  return {
    pagination,
    setPagination,
    getPagination,
    getDefaultPagination
  }
}
