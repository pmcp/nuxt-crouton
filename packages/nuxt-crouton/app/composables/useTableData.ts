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
  const searchedRows = computed(() => {
    if (search.value === '') return rows.value

    try {
      return rows.value.filter((row) => {
        return Object.values(row).some((value) => {
          return String(value).toLowerCase().includes(search.value.toLowerCase())
        })
      })
    } catch (error) {
      console.error('Error filtering rows:', error)
      return rows.value
    }
  })

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
      if (search.value !== '') {
        try {
          return rows.value.filter((row) => {
            return Object.values(row).some((value) => {
              return String(value).toLowerCase().includes(search.value.toLowerCase())
            })
          })
        } catch (error) {
          console.error('Error filtering server rows:', error)
          return rows.value
        }
      }
      return rows.value
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