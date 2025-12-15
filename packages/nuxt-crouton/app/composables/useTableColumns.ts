import { h, resolveComponent } from 'vue'
import type { TableColumn, SortableOptions } from '../types/table'

interface UseTableColumnsOptions {
  columns: TableColumn[]
  hideDefaultColumns?: {
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    actions?: boolean
  }
  /** Enable drag handle column for sortable tables */
  sortable?: boolean | SortableOptions
}

// Grip vertical icon SVG for drag handle (lucide-grip-vertical)
const GripIcon = () =>
  h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: '16',
    height: '16',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: 'size-4'
  }, [
    h('circle', { cx: '9', cy: '12', r: '1' }),
    h('circle', { cx: '9', cy: '5', r: '1' }),
    h('circle', { cx: '9', cy: '19', r: '1' }),
    h('circle', { cx: '15', cy: '12', r: '1' }),
    h('circle', { cx: '15', cy: '5', r: '1' }),
    h('circle', { cx: '15', cy: '19', r: '1' })
  ])

export function useTableColumns(options: UseTableColumnsOptions) {
  const { tString } = useT()

  // Check if drag handle should be shown
  const showDragHandle = computed(() => {
    if (!options.sortable) return false
    if (typeof options.sortable === 'object' && options.sortable.handle === false) return false
    return true
  })

  const allColumns = computed(() => {
    // Use CroutonTableCheckbox which wraps UCheckbox
    const CheckboxComponent = resolveComponent('CroutonTableCheckbox')

    const columns: TableColumn[] = []

    // Add drag handle column if sortable is enabled
    if (showDragHandle.value) {
      columns.push({
        id: 'drag',
        header: '',
        cell: () =>
          h('div', {
            class: 'drag-handle cursor-grab opacity-40 hover:opacity-100 flex items-center justify-center'
          }, [
            h(GripIcon)
          ]),
        enableSorting: false,
        enableHiding: false
      })
    }

    // Add select checkbox column
    columns.push({
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
    })

    // Add user-defined columns
    columns.push(...options.columns)

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