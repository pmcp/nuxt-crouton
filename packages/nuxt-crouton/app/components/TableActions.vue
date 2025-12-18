<template>
  <div class="flex items-center gap-1.5">
    <UButton
      icon="i-lucide-trash"
      :color="selectedRows.length > 0 ? 'error' : 'neutral'"
      variant="subtle"
      size="sm"
      :disabled="selectedRows.length === 0"
      @click="handleDelete"
    >
      Delete
      <span v-if="selectedRows.length > 0">
        {{ selectedRows.length }}
        <span>item<span v-if="selectedRows.length > 1">s</span></span>
      </span>
    </UButton>

    <UDropdownMenu
      :items="columnVisibilityItems"
      :content="{ align: 'end' }"
    >
      <UButton
        :label="tString('table.display')"
        color="neutral"
        variant="outline"
        trailing-icon="i-lucide-settings-2"
      />
    </UDropdownMenu>
  </div>
</template>

<script lang="ts" setup>
import { upperFirst } from 'scule'
import type { TableActionsProps } from '../types/table'
import { useT } from '../composables/useT'

const { tString } = useT()
const { open } = useCrouton()

const props = defineProps<TableActionsProps>()

const emit = defineEmits<{
  delete: [ids: string[]]
  'update:columnVisibility': [column: string, visible: boolean]
}>()

const handleDelete = () => {
  if (props.selectedRows.length > 0) {
    const ids = props.selectedRows.map(row => row.id)
    if (props.onDelete) {
      props.onDelete(ids)
    } else {
      open('delete', props.collection, ids, 'dialog')
    }
    emit('delete', ids)
  }
}

// Type for table column from TanStack Table
interface TableColumn {
  id: string
  getCanHide: () => boolean
  getIsVisible: () => boolean
}

const columnVisibilityItems = computed(() => {
  return props.table?.tableApi?.getAllColumns().filter((column: TableColumn) => column.getCanHide()).map((column: TableColumn) => ({
    label: upperFirst(column.id),
    type: 'checkbox' as const,
    checked: column.getIsVisible(),
    onUpdateChecked(checked: boolean) {
      props.table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
      emit('update:columnVisibility', column.id, !!checked)
    },
    onSelect(e?: Event) {
      e?.preventDefault()
    }
  })) || []
})
</script>