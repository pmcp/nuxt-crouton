import type { Ref } from 'vue'
import type { TableSort, PaginationData } from '../types/table'

interface UseTableDataOptions {
  rows: Ref<any[]>
  search: Ref<string>
  sort: Ref<TableSort>
  page: Ref<number>
  pageCount: Ref<number>
  serverPagination: boolean
  paginationData?: PaginationData | null
}

function filterRowsBySearch(rows: any[], term: string): any[] {
  if (!term) return rows
  const needle = term.toLowerCase()
  try {
    return rows.filter((row) => {
      return Object.values(row).some((value) => {
        return String(value).toLowerCase().includes(needle)
      })
    })
  } catch (error) {
    console.error('Error filtering rows:', error)
    return rows
  }
}

export function useTableData(options: UseTableDataOptions) {
  const {
    rows,
    search,
    sort,
    page,
    pageCount,
    serverPagination,
    paginationData
  } = options

  // Filtered rows based on search
  const searchedRows = computed(() => filterRowsBySearch(rows.value, search.value))

  // Calculate pagination totals
  const itemCountFromServer = computed(() => {
    if (serverPagination && paginationData) {
      return paginationData.totalItems || 0
    }
    return rows.value.length
  })

  const pageTotalFiltered = computed(() => searchedRows.value.length)

  const pageTotalToShow = computed(() => {
    // For server pagination, always use server count
    if (serverPagination) {
      return itemCountFromServer.value
    }
    // For client-side pagination with search
    if (search.value === '') return itemCountFromServer.value
    return pageTotalFiltered.value
  })

  const pageFrom = computed(() => {
    if (pageTotalToShow.value === 0) return 0
    return (page.value - 1) * pageCount.value + 1
  })

  const pageTo = computed(() => {
    if (serverPagination) {
      // For server pagination, calculate based on actual rows returned
      return Math.min(page.value * pageCount.value, itemCountFromServer.value)
    }
    return Math.min(page.value * Number(pageCount.value), pageTotalToShow.value)
  })

  // Sliced rows for pagination
  const slicedRows = computed(() => {
    // For server pagination, use rows directly (already paginated from server)
    if (serverPagination) {
      // When searching locally on server-paginated data
      return filterRowsBySearch(rows.value, search.value)
    }

    // For client-side pagination
    if (!searchedRows.value || !Array.isArray(searchedRows.value) || searchedRows.value.length === 0) {
      return []
    }

    try {
      return searchedRows.value.slice(
        (page.value - 1) * pageCount.value,
        page.value * pageCount.value
      )
    } catch (error) {
      console.error('Error slicing rows:', error)
      return []
    }
  })

  return {
    searchedRows,
    slicedRows,
    pageTotalToShow,
    pageFrom,
    pageTo,
    itemCountFromServer
  }
}
