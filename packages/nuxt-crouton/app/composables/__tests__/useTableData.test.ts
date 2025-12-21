import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from 'vue'
import { sampleRows, createPaginationRefs } from './test-utils'

// Mock Vue's computed to use the actual implementation
vi.stubGlobal('computed', computed)

// Import after mocking
import { useTableData } from '../useTableData'

describe('useTableData', () => {
  describe('searchedRows', () => {
    it('returns all rows when search is empty', () => {
      const { page, pageCount, search } = createPaginationRefs()
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(5)
      expect(searchedRows.value).toEqual(sampleRows)
    })

    it('filters rows case-insensitively', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('apple')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(1)
      expect(searchedRows.value[0].name).toBe('Apple')
    })

    it('filters with uppercase search term', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('BANANA')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(1)
      expect(searchedRows.value[0].name).toBe('Banana')
    })

    it('searches across all object values', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('fruit')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(2)
      expect(searchedRows.value.map(r => r.name)).toEqual(['Apple', 'Banana'])
    })

    it('handles search for numeric values', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('0.75')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(1)
      expect(searchedRows.value[0].name).toBe('Banana')
    })

    it('returns empty array for no matches', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('xyz123')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(0)
    })

    it('handles empty rows array', () => {
      const { page, pageCount, search } = createPaginationRefs()
      const rows = ref<any[]>([])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(0)
    })
  })

  describe('pagination calculations', () => {
    it('calculates pageFrom correctly for first page', () => {
      const { page, pageCount, search } = createPaginationRefs({ page: 1, pageCount: 2 })
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageFrom } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(pageFrom.value).toBe(1)
    })

    it('calculates pageFrom correctly for second page', () => {
      const { pageCount, search } = createPaginationRefs({ pageCount: 2 })
      const page = ref(2)
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageFrom } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(pageFrom.value).toBe(3)
    })

    it('calculates pageTo correctly', () => {
      const { page, search } = createPaginationRefs({ page: 1 })
      const pageCount = ref(2)
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageTo } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(pageTo.value).toBe(2)
    })

    it('pageTo does not exceed total items', () => {
      const { search } = createPaginationRefs()
      const page = ref(3)
      const pageCount = ref(2)
      const rows = ref([...sampleRows]) // 5 items
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageTo } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(pageTo.value).toBe(5)
    })

    it('handles edge case of zero items', () => {
      const { page, pageCount, search } = createPaginationRefs()
      const rows = ref<any[]>([])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageFrom, pageTo, pageTotalToShow } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(pageFrom.value).toBe(0)
      expect(pageTo.value).toBe(0)
      expect(pageTotalToShow.value).toBe(0)
    })

    it('uses server count for server pagination', () => {
      const { page, pageCount, search } = createPaginationRefs()
      const rows = ref([...sampleRows.slice(0, 2)]) // Only 2 rows from server
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageTotalToShow, itemCountFromServer } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: true,
        paginationData: { totalItems: 100, currentPage: 1, pageSize: 10 }
      })

      expect(itemCountFromServer.value).toBe(100)
      expect(pageTotalToShow.value).toBe(100)
    })

    it('uses filtered count for client pagination with search', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('fruit')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageTotalToShow } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(pageTotalToShow.value).toBe(2) // Apple and Banana
    })
  })

  describe('slicedRows', () => {
    it('returns correct page slice for client pagination', () => {
      const { page, search } = createPaginationRefs({ page: 1 })
      const pageCount = ref(2)
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { slicedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(slicedRows.value).toHaveLength(2)
      expect(slicedRows.value.map(r => r.name)).toEqual(['Apple', 'Banana'])
    })

    it('returns second page correctly', () => {
      const { search } = createPaginationRefs()
      const page = ref(2)
      const pageCount = ref(2)
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { slicedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(slicedRows.value).toHaveLength(2)
      expect(slicedRows.value.map(r => r.name)).toEqual(['Carrot', 'Donut'])
    })

    it('returns all rows for server pagination (no slicing)', () => {
      const { page, pageCount, search } = createPaginationRefs({ page: 1 })
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { slicedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: true
      })

      // For server pagination, all rows are returned (server already sliced)
      expect(slicedRows.value).toHaveLength(5)
    })

    it('filters server rows when search is active', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('fruit')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { slicedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: true
      })

      expect(slicedRows.value).toHaveLength(2)
      expect(slicedRows.value.map(r => r.name)).toEqual(['Apple', 'Banana'])
    })

    it('handles empty row arrays', () => {
      const { page, pageCount, search } = createPaginationRefs()
      const rows = ref<any[]>([])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { slicedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(slicedRows.value).toHaveLength(0)
    })

    it('returns partial last page correctly', () => {
      const { search } = createPaginationRefs()
      const page = ref(3)
      const pageCount = ref(2)
      const rows = ref([...sampleRows]) // 5 items
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { slicedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(slicedRows.value).toHaveLength(1)
      expect(slicedRows.value[0].name).toBe('Eggplant')
    })
  })

  describe('reactivity', () => {
    it('updates searchedRows when search changes', () => {
      const { page, pageCount } = createPaginationRefs()
      const search = ref('')
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { searchedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(searchedRows.value).toHaveLength(5)

      search.value = 'apple'
      expect(searchedRows.value).toHaveLength(1)
    })

    it('updates slicedRows when page changes', () => {
      const { pageCount, search } = createPaginationRefs({ pageCount: 2 })
      const page = ref(1)
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { slicedRows } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(slicedRows.value.map(r => r.name)).toEqual(['Apple', 'Banana'])

      page.value = 2
      expect(slicedRows.value.map(r => r.name)).toEqual(['Carrot', 'Donut'])
    })

    it('updates when rows are modified', () => {
      const { page, pageCount, search } = createPaginationRefs()
      const rows = ref([...sampleRows])
      const sort = ref({ column: 'name', direction: 'asc' as const })

      const { pageTotalToShow } = useTableData({
        rows,
        search,
        sort,
        page,
        pageCount,
        serverPagination: false
      })

      expect(pageTotalToShow.value).toBe(5)

      rows.value = [...sampleRows, { id: '6', name: 'Fig', category: 'Fruit', price: 3.0, createdAt: '2024-01-06' }]
      expect(pageTotalToShow.value).toBe(6)
    })
  })
})