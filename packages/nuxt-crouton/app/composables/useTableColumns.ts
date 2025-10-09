import { h, resolveComponent } from 'vue'
import type { TableColumn } from '../types/table'

interface UseTableColumnsOptions {
  columns: TableColumn[]
  hideDefaultColumns?: {
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    actions?: boolean
  }
}

export function useTableColumns(options: UseTableColumnsOptions) {
  const { tString } = useT()

  const allColumns = computed(() => {
    // Use CroutonTableCheckbox which wraps UCheckbox
    const CheckboxComponent = resolveComponent('CroutonTableCheckbox')

    const columns: TableColumn[] = [
      {
        id: 'select',
        header: ({ table }: any) =>
          h(CheckboxComponent, {
            'modelValue': table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : table.getIsAllPageRowsSelected(),
            'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
              table.toggleAllPageRowsSelected(!!value),
            'aria-label': tString('table.selectAll')
          }),
        cell: ({ row }: any) =>
          h(CheckboxComponent, {
            'modelValue': row.getIsSelected(),
            'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
            'aria-label': tString('table.selectRow')
          }),
        enableSorting: false,
        enableHiding: false
      },
      ...options.columns
    ]

    // Add default columns conditionally
    if (!options.hideDefaultColumns?.createdAt) {
      columns.push({
        accessorKey: 'createdAt',
        id: 'createdAt',
        header: tString('table.createdAt'),
        sortable: true
      })
    }

    if (!options.hideDefaultColumns?.updatedAt) {
      columns.push({
        accessorKey: 'updatedAt',
        id: 'updatedAt',
        header: tString('table.updatedAt'),
        sortable: true
      })
    }

    if (!options.hideDefaultColumns?.createdBy) {
      columns.push({
        accessorKey: 'createdBy',
        id: 'createdBy',
        header: tString('table.createdBy'),
        sortable: true
      })
    }

    if (!options.hideDefaultColumns?.updatedBy) {
      columns.push({
        accessorKey: 'updatedBy',
        id: 'updatedBy',
        header: tString('table.updatedBy'),
        sortable: true
      })
    }

    if (!options.hideDefaultColumns?.actions) {
      columns.push({
        accessorKey: 'actions',
        id: 'actions',
        header: tString('table.actions')
      })
    }

    return columns
  })

  return {
    allColumns
  }
}