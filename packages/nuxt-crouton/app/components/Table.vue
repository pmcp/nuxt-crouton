<template>
  <UDashboardPanel :id="collection || 'crouton-table'">
    <template #header>
      <slot name="header" />
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

      <div class="relative overflow-x-auto">
        <!-- Loading overlay -->
        <div
          v-if="loadingPage"
          class="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin"
            />
            <span class="text-sm">{{ t('common.loading') }}</span>
          </div>
        </div>

        <UTable
          ref="tableRef"
          v-model:row-selection="rowSelection"
          v-model:sort="sort"
          v-model:column-visibility="columnVisibility"
          :data="slicedRows"
          :columns="allColumns as any"
          class="shrink-0"
          :class="{ 'opacity-50': loadingPage }"
          :ui="tableStyles"
        >
          <!-- Pass all slots from parent -->
          <template
            v-for="(_, slot) of $slots"
            #[slot]="scope"
          >
            <slot
              :name="slot"
              v-bind="scope"
            />
          </template>

          <!-- Default column templates -->
          <template #createdBy-cell="{ row }: { row: { original: CroutonBaseRow } }">
            <CroutonUsersCardMini
              v-if="row.original.createdByUser"
              :item="row.original.createdByUser"
              :name="true"
            />
          </template>

          <template #createdAt-cell="{ row }: { row: { original: CroutonBaseRow } }">
            <CroutonDate :date="row.original.createdAt" />
          </template>

          <template #updatedBy-cell="{ row }: { row: { original: CroutonBaseRow } }">
            <CroutonUsersCardMini
              v-if="row.original.updatedByUser"
              :item="row.original.updatedByUser"
              :name="true"
            />
          </template>

          <template #updatedAt-cell="{ row }: { row: { original: CroutonBaseRow } }">
            <CroutonDate :date="row.original.updatedAt" />
          </template>

          <template #actions-cell="{ row }: { row: { original: CroutonBaseRow } }">
            <CroutonItemButtonsMini
              delete
              update
              :disabled="stateless"
              :disabled-tooltip="stateless ? 'Preview only' : ''"
              @delete="openCrouton?.('delete', collection, [row.original.id])"
              @update="openCrouton?.('update', collection, [row.original.id])"
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

// Base row type for table data
interface CroutonBaseRow {
  id: string
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  createdByUser?: { id: string, name?: string, image?: string }
  updatedByUser?: { id: string, name?: string, image?: string }
  [key: string]: unknown
}

// Props
const props = withDefaults(defineProps<TableProps>(), {
  columns: () => [],
  rows: () => [],
  collection: '',
  serverPagination: false,
  paginationData: null,
  refreshFn: undefined,
  sortable: false,
  stateless: false,
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

// Only use useCrouton when not in stateless mode
const croutonComposable = props.stateless ? null : useCrouton()
const openCrouton = croutonComposable?.open
const setPagination = croutonComposable?.setPagination ?? (() => {})
const getPagination = croutonComposable?.getPagination ?? (() => ({
  currentPage: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc' as const,
  totalItems: 0,
  totalPages: 0
}))

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

// Stable class name for tbody targeting (used by useSortable)
const sortableClass = `crouton-sortable-${props.collection || 'table'}`

const tableStyles = computed(() => ({
  base: 'table-fixed border-separate border-spacing-0',
  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
  tbody: `[&>tr]:last:[&>td]:border-b-0 ${sortableEnabled.value ? sortableClass : ''}`,
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

    if (props.refreshFn) {
      await props.refreshFn()
    } else {
      // Fallback: refresh all cache keys for this collection
      const prefix = `collection:${props.collection}:`
      const nuxtApp = useNuxtApp()
      const matchingKeys = Object.keys(nuxtApp.payload.data).filter(key => key.startsWith(prefix))
      await Promise.all(matchingKeys.map(key => refreshNuxtData(key)))
    }
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
  if (props.serverPagination
    && (newSort.column !== oldSort.column || newSort.direction !== oldSort.direction)) {
    page.value = 1
    fetchPage(1)
  }
}, { deep: true })

// Sortable drag-and-drop functionality
const reordering = ref(false)

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

// Initialize sortable - useSortable handles DOM timing internally
if (sortableEnabled.value && import.meta.client) {
  const showHandle = sortableConfig.value.handle !== false

  useSortable(`.${sortableClass}`, slicedRows, {
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
}
</script>
