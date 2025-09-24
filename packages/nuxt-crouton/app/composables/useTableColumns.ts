import type { TableColumn } from '../types/table'

interface UseTableColumnsOptions {
  columns: TableColumn[]
  hideDefaultColumns?: {
    created_at?: boolean
    updated_at?: boolean
    actions?: boolean
  }
}

export function useTableColumns(options: UseTableColumnsOptions) {
  const { tString } = useT()

  const allColumns = computed(() => {
    const columns: TableColumn[] = [
      {
        id: 'select',
        header: ({ table }: any) =>
          h('UCheckbox', {
            'modelValue': table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : table.getIsAllPageRowsSelected(),
            'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
              table.toggleAllPageRowsSelected(!!value),
            'ariaLabel': tString('table.selectAll')
          }),
        cell: ({ row }: any) =>
          h('UCheckbox', {
            'modelValue': row.getIsSelected(),
            'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
            'ariaLabel': tString('table.selectRow')
          })
      },
      ...options.columns
    ]

    // Add default columns conditionally
    if (!options.hideDefaultColumns?.created_at) {
      columns.push({
        accessorKey: 'created_at',
        id: 'created_at',
        header: tString('table.createdAt'),
        sortable: true
      })
    }

    if (!options.hideDefaultColumns?.updated_at) {
      columns.push({
        accessorKey: 'updated_at',
        id: 'updated_at',
        header: tString('table.updatedAt'),
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