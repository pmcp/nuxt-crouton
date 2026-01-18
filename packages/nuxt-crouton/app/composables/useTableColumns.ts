import { h, resolveComponent } from 'vue'
import type { TableColumn, SortableOptions } from '../types/table'

interface UseTableColumnsOptions {
  columns: TableColumn[]
  hideDefaultColumns?: {
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    presence?: boolean
    actions?: boolean
  }
  /** Enable drag handle column for sortable tables */
  sortable?: boolean | SortableOptions
  /** Show collab presence column (requires nuxt-crouton-collab) */
  showCollabPresence?: boolean
}

// Grip vertical icon SVG for drag handle (lucide-grip-vertical)
const GripIcon = () =>
  h('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'width': '16',
    'height': '16',
    'viewBox': '0 0 24 24',
    'fill': 'none',
    'stroke': 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'class': 'size-4'
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

  // Resolve component once in setup scope (not inside computed)
  const CheckboxComponent = resolveComponent('CroutonTableCheckbox')

  // Check if drag handle should be shown
  const showDragHandle = computed(() => {
    if (!options.sortable) return false
    if (typeof options.sortable === 'object' && options.sortable.handle === false) return false
    return true
  })

  const allColumns = computed(() => {

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

    // Add presence column first (leftmost after select) if collab presence is enabled
    if (options.showCollabPresence && !options.hideDefaultColumns?.presence) {
      columns.push({
        id: 'presence',
        header: '',
        enableSorting: false,
        enableHiding: false
      })
    }

    // Add actions column next to presence
    if (!options.hideDefaultColumns?.actions) {
      columns.push({
        accessorKey: 'actions',
        id: 'actions',
        header: ''
      })
    }

    // Add timestamp/audit columns after actions
    if (!options.hideDefaultColumns?.createdAt) {
      columns.push({
        accessorKey: 'createdAt',
        id: 'createdAt',
        header: tString('table.createdAt'),
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

    if (!options.hideDefaultColumns?.updatedAt) {
      columns.push({
        accessorKey: 'updatedAt',
        id: 'updatedAt',
        header: tString('table.updatedAt'),
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

    // Add user-defined columns at the end
    columns.push(...options.columns.map(col => ({
      ...col,
      id: col.id ?? col.accessorKey
    })))

    return columns
  })

  return {
    allColumns
  }
}
