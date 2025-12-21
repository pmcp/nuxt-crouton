import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { createUseTMock } from './test-utils'

// Mock Vue's computed and h
vi.stubGlobal('computed', computed)

// Stub useT globally (it's auto-imported in Nuxt)
vi.stubGlobal('useT', () => createUseTMock())

// Mock Vue's h function to return a simple representation
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    resolveComponent: vi.fn((name: string) => name),
    h: vi.fn((type: any, props?: any, children?: any) => ({
      type: typeof type === 'string' ? type : type?.name || 'Component',
      props,
      children
    }))
  }
})

// Import after mocking
import { useTableColumns } from '../useTableColumns'
import type { TableColumn } from '../../types/table'

describe('useTableColumns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('allColumns basic structure', () => {
    it('always includes select checkbox column', () => {
      const userColumns: TableColumn[] = [
        { accessorKey: 'name', id: 'name', header: 'Name' }
      ]

      const { allColumns } = useTableColumns({ columns: userColumns })

      const selectColumn = allColumns.value.find((c: TableColumn) => c.id === 'select')
      expect(selectColumn).toBeDefined()
      expect(selectColumn?.enableSorting).toBe(false)
      expect(selectColumn?.enableHiding).toBe(false)
    })

    it('includes user-defined columns in order', () => {
      const userColumns: TableColumn[] = [
        { accessorKey: 'name', id: 'name', header: 'Name' },
        { accessorKey: 'price', id: 'price', header: 'Price' }
      ]

      const { allColumns } = useTableColumns({ columns: userColumns })

      // After select column, user columns should appear
      const columnIds = allColumns.value.map((c: TableColumn) => c.id)
      const nameIndex = columnIds.indexOf('name')
      const priceIndex = columnIds.indexOf('price')

      expect(nameIndex).toBeGreaterThan(0) // After select
      expect(priceIndex).toBe(nameIndex + 1) // Price follows name
    })

    it('adds createdAt column by default', () => {
      const { allColumns } = useTableColumns({ columns: [] })

      const createdAtColumn = allColumns.value.find((c: TableColumn) => c.id === 'createdAt')
      expect(createdAtColumn).toBeDefined()
      expect(createdAtColumn?.header).toBe('table.createdAt')
      expect(createdAtColumn?.sortable).toBe(true)
    })

    it('adds updatedAt column by default', () => {
      const { allColumns } = useTableColumns({ columns: [] })

      const updatedAtColumn = allColumns.value.find((c: TableColumn) => c.id === 'updatedAt')
      expect(updatedAtColumn).toBeDefined()
      expect(updatedAtColumn?.header).toBe('table.updatedAt')
      expect(updatedAtColumn?.sortable).toBe(true)
    })

    it('adds createdBy column by default', () => {
      const { allColumns } = useTableColumns({ columns: [] })

      const createdByColumn = allColumns.value.find((c: TableColumn) => c.id === 'createdBy')
      expect(createdByColumn).toBeDefined()
      expect(createdByColumn?.header).toBe('table.createdBy')
    })

    it('adds updatedBy column by default', () => {
      const { allColumns } = useTableColumns({ columns: [] })

      const updatedByColumn = allColumns.value.find((c: TableColumn) => c.id === 'updatedBy')
      expect(updatedByColumn).toBeDefined()
      expect(updatedByColumn?.header).toBe('table.updatedBy')
    })

    it('adds actions column by default', () => {
      const { allColumns } = useTableColumns({ columns: [] })

      const actionsColumn = allColumns.value.find((c: TableColumn) => c.id === 'actions')
      expect(actionsColumn).toBeDefined()
      expect(actionsColumn?.header).toBe('table.actions')
    })
  })

  describe('hideDefaultColumns', () => {
    it('hides createdAt when hideDefaultColumns.createdAt is true', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        hideDefaultColumns: { createdAt: true }
      })

      const createdAtColumn = allColumns.value.find((c: TableColumn) => c.id === 'createdAt')
      expect(createdAtColumn).toBeUndefined()
    })

    it('hides updatedAt when hideDefaultColumns.updatedAt is true', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        hideDefaultColumns: { updatedAt: true }
      })

      const updatedAtColumn = allColumns.value.find((c: TableColumn) => c.id === 'updatedAt')
      expect(updatedAtColumn).toBeUndefined()
    })

    it('hides createdBy when hideDefaultColumns.createdBy is true', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        hideDefaultColumns: { createdBy: true }
      })

      const createdByColumn = allColumns.value.find((c: TableColumn) => c.id === 'createdBy')
      expect(createdByColumn).toBeUndefined()
    })

    it('hides updatedBy when hideDefaultColumns.updatedBy is true', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        hideDefaultColumns: { updatedBy: true }
      })

      const updatedByColumn = allColumns.value.find((c: TableColumn) => c.id === 'updatedBy')
      expect(updatedByColumn).toBeUndefined()
    })

    it('hides actions when hideDefaultColumns.actions is true', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        hideDefaultColumns: { actions: true }
      })

      const actionsColumn = allColumns.value.find((c: TableColumn) => c.id === 'actions')
      expect(actionsColumn).toBeUndefined()
    })

    it('hides all default columns when all are configured', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        hideDefaultColumns: {
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          updatedBy: true,
          actions: true
        }
      })

      const columnIds = allColumns.value.map((c: TableColumn) => c.id)
      expect(columnIds).not.toContain('createdAt')
      expect(columnIds).not.toContain('updatedAt')
      expect(columnIds).not.toContain('createdBy')
      expect(columnIds).not.toContain('updatedBy')
      expect(columnIds).not.toContain('actions')
      // Only select should remain
      expect(columnIds).toContain('select')
    })
  })

  describe('sortable drag handle', () => {
    it('adds drag column when sortable is true', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        sortable: true
      })

      const dragColumn = allColumns.value.find((c: TableColumn) => c.id === 'drag')
      expect(dragColumn).toBeDefined()
      expect(dragColumn?.enableSorting).toBe(false)
      expect(dragColumn?.enableHiding).toBe(false)
    })

    it('adds drag column when sortable is object with enabled true', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        sortable: { enabled: true }
      })

      const dragColumn = allColumns.value.find((c: TableColumn) => c.id === 'drag')
      expect(dragColumn).toBeDefined()
    })

    it('hides drag column when sortable.handle is false', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        sortable: { handle: false }
      })

      const dragColumn = allColumns.value.find((c: TableColumn) => c.id === 'drag')
      expect(dragColumn).toBeUndefined()
    })

    it('does not add drag column when sortable is false', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        sortable: false
      })

      const dragColumn = allColumns.value.find((c: TableColumn) => c.id === 'drag')
      expect(dragColumn).toBeUndefined()
    })

    it('does not add drag column when sortable is undefined', () => {
      const { allColumns } = useTableColumns({
        columns: []
      })

      const dragColumn = allColumns.value.find((c: TableColumn) => c.id === 'drag')
      expect(dragColumn).toBeUndefined()
    })

    it('drag column appears before select column', () => {
      const { allColumns } = useTableColumns({
        columns: [],
        sortable: true
      })

      const columnIds = allColumns.value.map((c: TableColumn) => c.id)
      const dragIndex = columnIds.indexOf('drag')
      const selectIndex = columnIds.indexOf('select')

      expect(dragIndex).toBe(0)
      expect(selectIndex).toBe(1)
    })
  })

  describe('column order', () => {
    it('maintains correct column order with all elements', () => {
      const userColumns: TableColumn[] = [
        { accessorKey: 'name', id: 'name', header: 'Name' }
      ]

      const { allColumns } = useTableColumns({
        columns: userColumns,
        sortable: true
      })

      const columnIds = allColumns.value.map((c: TableColumn) => c.id)

      // Expected order: drag, select, user columns, defaults (createdAt, updatedAt, createdBy, updatedBy, actions)
      expect(columnIds).toEqual([
        'drag',
        'select',
        'name',
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
        'actions'
      ])
    })

    it('maintains correct column order without sortable', () => {
      const userColumns: TableColumn[] = [
        { accessorKey: 'name', id: 'name', header: 'Name' },
        { accessorKey: 'price', id: 'price', header: 'Price' }
      ]

      const { allColumns } = useTableColumns({
        columns: userColumns
      })

      const columnIds = allColumns.value.map((c: TableColumn) => c.id)

      // Expected order: select, user columns, defaults
      expect(columnIds).toEqual([
        'select',
        'name',
        'price',
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
        'actions'
      ])
    })
  })

  describe('checkbox column functionality', () => {
    it('select column has header function for select all', () => {
      const { allColumns } = useTableColumns({ columns: [] })

      const selectColumn = allColumns.value.find((c: TableColumn) => c.id === 'select')
      expect(selectColumn).toBeDefined()
      expect(typeof selectColumn?.header).toBe('function')
    })

    it('select column has cell function for row selection', () => {
      const { allColumns } = useTableColumns({ columns: [] })

      const selectColumn = allColumns.value.find((c: TableColumn) => c.id === 'select')
      expect(selectColumn).toBeDefined()
      expect(typeof selectColumn?.cell).toBe('function')
    })
  })
})