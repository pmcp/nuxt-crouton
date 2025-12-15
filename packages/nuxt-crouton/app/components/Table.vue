<template>
  <UDashboardPanel :id="collection || 'crouton-table'">
    <template #header>
      <slot name="header"></slot>
    </template>

    <template #body>
      <!-- Filters -->
      <div class="flex items-center justify-between gap-3">
        <CroutonTableSearch
          v-model="search"
          :placeholder="tString('table.search')"
          :debounce-ms="300"
        />

        <CroutonTableActions
          :selected-rows="selectedRows"
          :collection="collection"
          :table="tableRef"
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
          <template #createdBy-cell="{ row }">
            <CroutonUsersCardMini
                v-if="row.original.createdByUser"
                :item="row.original.createdByUser"
                :name="true"
            />
          </template>

          <template #createdAt-cell="{ row }">
            <CroutonDate :date="row.original.createdAt"></CroutonDate>
          </template>

          <template #updatedBy-cell="{ row }">
            <CroutonUsersCardMini
                v-if="row.original.updatedByUser"
                :item="row.original.updatedByUser"
                :name="true"
            />
          </template>

          <template #updatedAt-cell="{ row }">
            <CroutonDate :date="row.original.updatedAt"></CroutonDate>
          </template>

          <template #actions-cell="{ row }">
            <CroutonItemButtonsMini
              delete
              @delete="openCrouton('delete', collection, [row.original.id])"
              update
              @update="openCrouton('update', collection, [row.original.id])"
            />
          </template>
        </UTable>
      </div>

      <!-- Pagination -->
      <CroutonTablePagination
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
import type { TableProps, TableSort, PaginationData, SortableOptions } from '../types/table'
import { useTableData } from '../composables/useTableData'
import { useTableColumns } from '../composables/useTableColumns'
import { useT } from '../composables/useT'
import { useSortable } from '@vueuse/integrations/useSortable'
import type { UseSortableReturn } from '@vueuse/integrations/useSortable'

// Props
const props = withDefaults(defineProps<TableProps>(), {
  columns: () => [],
  rows: () => [],
  collection: '',
  serverPagination: false,
  paginationData: null,
  refreshFn: undefined,
  sortable: false,
  hideDefaultColumns: () => ({
    createdAt: false,
    updatedAt: false,
    createdBy: false,
    updatedBy: false,
    actions: false
  })
})

// Composables
const { t, tString } = useT()
const { open: openCrouton, getCollection, setPagination, getPagination } = useCrouton()

// Refs
const tableRef = useTemplateRef<any>('tableRef')

// State
const loadingPage = ref(false)
const search = ref('')
const sort = ref<TableSort>({ column: 'createdAt', direction: 'desc' })
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
  hideDefaultColumns: props.hideDefaultColumns,
  sortable: props.sortable
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

// Sortable configuration
const sortableEnabled = computed(() => !!props.sortable)
const sortableConfig = computed<SortableOptions>(() => {
  if (typeof props.sortable === 'object') return props.sortable
  return {}
})

// Generate stable unique ID for tbody targeting
const tableId = `crouton-sortable-${props.collection || 'table'}-${Math.random().toString(36).slice(2, 9)}`

const tableStyles = computed(() => ({
  base: 'table-fixed border-separate border-spacing-0',
  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
  tbody: `[&>tr]:last:[&>td]:border-b-0 ${sortableEnabled.value ? tableId : ''}`,
  th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
  td: 'border-b border-default'
}))

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

// Sortable drag-and-drop functionality
const reordering = ref(false)
let sortableInstance: UseSortableReturn | null = null

// Initialize useTreeMutation for reordering if collection is provided
const treeMutation = props.collection && sortableEnabled.value
  ? useTreeMutation(props.collection)
  : null

async function handleReorder(oldIndex: number, newIndex: number) {
  if (!treeMutation || reordering.value || oldIndex === newIndex) return

  reordering.value = true

  try {
    // Build updates array with new order values
    const currentRows = [...slicedRows.value]
    const [movedItem] = currentRows.splice(oldIndex, 1)
    currentRows.splice(newIndex, 0, movedItem)

    const updates = currentRows.map((row: any, index: number) => ({
      id: row.id,
      order: index
    }))

    await treeMutation.reorderSiblings(updates)
  } catch (error) {
    console.error('[Table] Reorder failed:', error)
    // Cache will be invalidated by useTreeMutation, triggering refresh
  } finally {
    reordering.value = false
  }
}

// Initialize sortable on mount
onMounted(() => {
  if (!sortableEnabled.value || !import.meta.client) return

  // Wait for DOM to be ready
  nextTick(() => {
    const tbody = document.querySelector(`.${tableId}`)
    if (!tbody) {
      console.warn('[Table] Could not find tbody element for sortable')
      return
    }

    const showHandle = sortableConfig.value.handle !== false

    sortableInstance = useSortable(tbody as HTMLElement, slicedRows, {
      animation: sortableConfig.value.animation ?? 150,
      handle: showHandle ? '.drag-handle' : undefined,
      disabled: sortableConfig.value.disabled ?? false,
      ghostClass: 'opacity-50',
      chosenClass: 'bg-elevated',
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
          handleReorder(evt.oldIndex, evt.newIndex)
        }
      }
    })
  })
})

// Cleanup on unmount
onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.stop()
    sortableInstance = null
  }
})
</script>
