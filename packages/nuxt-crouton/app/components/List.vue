<template>
  <CroutonTable
    :collection="collection"
    :columns="columns"
    :rows="rows"
    :server-pagination="serverPagination"
    :pagination-data="paginationData"
    :refresh-fn="refreshFn"
    :hide-default-columns="hideDefaultColumns"
  >
    <template #header>
      <slot name="header" />
    </template>

    <!-- Pass through all data slots -->
    <template v-for="(_, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </CroutonTable>
</template>

<script lang="ts" setup>
import type { TableProps } from '../types/table'

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
</script>