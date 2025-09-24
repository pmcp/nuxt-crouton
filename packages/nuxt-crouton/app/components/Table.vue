<template>
  <UDashboardPanel :id="collection || 'crud-table'">
    <template #header>
      <slot name="header"></slot>
    </template>

    <template #body>
      <!-- Filters -->
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <CrudTableSearch
          v-model="search"
          :placeholder="tString('table.search')"
          :debounce-ms="300"
        />

        <CrudTableActions
          :selected-rows="selectedRows"
          :collection="collection"
          :columns="tableColumns"
        />
      </div>

      <div class="relative">
        <!-- Loading overlay -->
        <div
          v-if="loadingPage"
          class="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
            <span class="text-sm">{{ t('common.loading') }}</span>
          </div>
        </div>

        <UTable
          ref="tableRef"
          v-model:row-selection="rowSelection"
          v-model:sort="sort"
          v-model:column-visibility="columnVisibility"
          :data="slicedRows"
          :columns="allColumns"
          class="shrink-0"
          :class="{ 'opacity-50': loadingPage }"
          :ui="tableStyles"
        >
          <!-- Pass all slots from parent -->
          <template v-for="(_, slot) of $slots" #[slot]="scope">
            <slot :name="slot" v-bind="scope" />
          </template>

          <!-- Default column templates -->
          <template #created_at-cell="{ row }">
            {{ formatDate(row.original.createdAt) }}
          </template>

          <template #updated_at-cell="{ row }">
            {{ formatDate(row.original.updatedAt) }}
          </template>

          <template #actions-cell="{ row }">
            <CrudMiniButtons
              delete
              @delete="openCrud('delete', collection, [row.original.id])"
              :delete-loading="row.optimisticAction === 'delete'"
              update
              @update="openCrud('update', collection, [row.original.id])"
              :update-loading="isRowLoading(row)"
            />
          </template>
        </UTable>
      </div>

      <!-- Pagination -->
      <CrudTablePagination
        :page="page"
        :page-count="pageCount"
        :total-items="pageTotalToShow"
        :loading="loadingPage"
        @update:page="page = $event"
        @update:page-count="handlePageCountChange"
      />
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import { useDateFormat } from '@vueuse/core'
import type { TableProps, TableSort, PaginationData } from '../types/table'
import { useTableData } from '../composables/useTableData'
import { useTableColumns } from '../composables/useTableColumns'

// Props
const props = withDefaults(defineProps<TableProps>(), {
  columns: () => [],
  rows: () => [],
  collection: '',
  serverPagination: false,
  paginationData: null,
  refreshFn: undefined,
  hideDefaultColumns: () => ({
    created_at: false,
    updated_at: false,
    actions: false
  })
})

// Composables
const { t, tString } = useT()
const { open: openCrud, getCollection, setPagination, getPagination } = useCrud()

// Refs
const tableRef = useTemplateRef<any>('table')

// State
const loadingPage = ref(false)
const search = ref('')
const sort = ref<TableSort>({ column: 'created_at', direction: 'desc' })
const page = ref(1)
const pageCount = ref(10)
const rowSelection = ref({})
const columnVisibility = ref<Record<string, boolean>>({ id: false })

// Server pagination data - cast to PaginationData type
const serverPaginationData = computed<PaginationData | null>(() => {
  if (!props.serverPagination) return null
  const data = props.paginationData || getPagination(props.collection)
  // Ensure totalItems has a default value
  return {
    currentPage: data.currentPage,
    pageSize: data.pageSize,
    totalItems: data.totalItems || 0,
    totalPages: data.totalPages,
    sortBy: data.sortBy,
    sortDirection: data.sortDirection
  }
})

// Initialize from server
if (serverPaginationData.value) {
  page.value = serverPaginationData.value.currentPage || 1
  pageCount.value = serverPaginationData.value.pageSize || 10
}

// Composable data
const { allColumns } = useTableColumns({
  columns: props.columns,
  hideDefaultColumns: props.hideDefaultColumns
})

const { slicedRows, pageTotalToShow } = useTableData({
  rows: toRef(props, 'rows'),
  search,
  sort,
  page,
  pageCount,
  serverPagination: props.serverPagination,
  paginationData: serverPaginationData.value
})

// Computed
const tableColumns = computed(() =>
  tableRef.value?.tableApi?.getAllColumns() || []
)

const selectedRows = computed(() =>
  tableRef.value?.tableApi?.getFilteredSelectedRowModel().rows.map((row: any) => row.original) || []
)

const tableStyles = {
  base: 'table-fixed border-separate border-spacing-0',
  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
  tbody: '[&>tr]:last:[&>td]:border-b-0',
  th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
  td: 'border-b border-default'
}

// Methods
async function fetchPage(newPage: number) {
  if (!props.serverPagination || !props.collection) return

  loadingPage.value = true
  try {
    setPagination(props.collection, {
      currentPage: newPage,
      pageSize: pageCount.value,
      sortBy: sort.value.column,
      sortDirection: sort.value.direction
    })

    await (props.refreshFn?.() || getCollection(props.collection, {}, true))
  } catch (error) {
    console.error('Error fetching page:', error)
  } finally {
    loadingPage.value = false
  }
}

function handlePageCountChange(newCount: number) {
  pageCount.value = newCount
  page.value = 1
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  try {
    return useDateFormat(date, 'DD-MM-YYYY').value
  } catch {
    return ''
  }
}

function isRowLoading(row: any): boolean {
  return row.optimisticAction === 'update' || row.optimisticAction === 'create'
}

// Watchers
watch(page, (newPage, oldPage) => {
  if (props.serverPagination && newPage !== oldPage) fetchPage(newPage)
})

watch(pageCount, (newCount, oldCount) => {
  if (props.serverPagination && newCount !== oldCount) fetchPage(1)
})

watch(sort, (newSort, oldSort) => {
  if (props.serverPagination &&
      (newSort.column !== oldSort.column || newSort.direction !== oldSort.direction)) {
    page.value = 1
    fetchPage(1)
  }
}, { deep: true })
</script>