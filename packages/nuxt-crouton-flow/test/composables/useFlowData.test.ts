/**
 * Unit Tests for useFlowData Composable
 *
 * Tests conversion of collection rows to Vue Flow nodes and edges.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { useFlowData } from '../../app/composables/useFlowData'

describe('useFlowData', () => {
  describe('nodes computed', () => {
    it('converts rows to Vue Flow nodes', () => {
      const rows = ref([
        { id: 'item-1', title: 'First Item', position: { x: 100, y: 50 } },
        { id: 'item-2', title: 'Second Item', position: { x: 200, y: 150 } }
      ])

      const { nodes } = useFlowData(rows)

      expect(nodes.value).toHaveLength(2)
      expect(nodes.value[0].id).toBe('item-1')
      expect(nodes.value[0].label).toBe('First Item')
      expect(nodes.value[0].position).toEqual({ x: 100, y: 50 })
      expect(nodes.value[0].data).toEqual(rows.value[0])
    })

    it('uses id as label when labelField is missing', () => {
      const rows = ref([
        { id: 'item-1', position: { x: 0, y: 0 } }
      ])

      const { nodes } = useFlowData(rows)

      expect(nodes.value[0].label).toBe('item-1')
    })

    it('uses custom labelField', () => {
      const rows = ref([
        { id: 'item-1', name: 'Custom Name', position: { x: 0, y: 0 } }
      ])

      const { nodes } = useFlowData(rows, { labelField: 'name' })

      expect(nodes.value[0].label).toBe('Custom Name')
    })

    it('defaults position to (0,0) when missing', () => {
      const rows = ref([
        { id: 'item-1', title: 'No Position' }
      ])

      const { nodes } = useFlowData(rows)

      expect(nodes.value[0].position).toEqual({ x: 0, y: 0 })
    })

    it('marks nodes without valid position as needing layout', () => {
      const rows = ref([
        { id: 'item-1', title: 'No Position' },
        { id: 'item-2', title: 'Has Position', position: { x: 100, y: 50 } }
      ])

      const { nodes } = useFlowData(rows)

      expect((nodes.value[0] as { _needsLayout?: boolean })._needsLayout).toBe(true)
      expect((nodes.value[1] as { _needsLayout?: boolean })._needsLayout).toBeUndefined()
    })

    it('handles empty position object as needing layout', () => {
      const rows = ref([
        { id: 'item-1', title: 'Empty Position', position: {} }
      ])

      const { nodes } = useFlowData(rows)

      expect(nodes.value[0].position).toEqual({ x: 0, y: 0 })
      expect((nodes.value[0] as { _needsLayout?: boolean })._needsLayout).toBe(true)
    })

    it('handles NaN position values as invalid', () => {
      const rows = ref([
        { id: 'item-1', title: 'NaN Position', position: { x: NaN, y: 100 } }
      ])

      const { nodes } = useFlowData(rows)

      expect(nodes.value[0].position).toEqual({ x: 0, y: 0 })
      expect((nodes.value[0] as { _needsLayout?: boolean })._needsLayout).toBe(true)
    })

    it('uses custom positionField', () => {
      const rows = ref([
        { id: 'item-1', title: 'Custom Field', coords: { x: 50, y: 75 } }
      ])

      const { nodes } = useFlowData(rows, { positionField: 'coords' })

      expect(nodes.value[0].position).toEqual({ x: 50, y: 75 })
    })

    it('is reactive to row changes', async () => {
      const rows = ref([
        { id: 'item-1', title: 'Original', position: { x: 0, y: 0 } }
      ])

      const { nodes } = useFlowData(rows)

      expect(nodes.value).toHaveLength(1)
      expect(nodes.value[0].label).toBe('Original')

      // Add a new item
      rows.value.push({ id: 'item-2', title: 'New Item', position: { x: 100, y: 100 } })
      await nextTick()

      expect(nodes.value).toHaveLength(2)
      expect(nodes.value[1].label).toBe('New Item')
    })
  })

  describe('edges computed', () => {
    it('creates edges from parent relationships', () => {
      const rows = ref([
        { id: 'parent', title: 'Parent', position: { x: 0, y: 0 } },
        { id: 'child-1', title: 'Child 1', parentId: 'parent', position: { x: 0, y: 100 } },
        { id: 'child-2', title: 'Child 2', parentId: 'parent', position: { x: 100, y: 100 } }
      ])

      const { edges } = useFlowData(rows)

      expect(edges.value).toHaveLength(2)
      expect(edges.value[0]).toEqual({
        id: 'e-parent-child-1',
        source: 'parent',
        target: 'child-1',
        type: 'default'
      })
      expect(edges.value[1]).toEqual({
        id: 'e-parent-child-2',
        source: 'parent',
        target: 'child-2',
        type: 'default'
      })
    })

    it('does not create edges for orphan nodes', () => {
      const rows = ref([
        { id: 'orphan', title: 'Orphan', position: { x: 0, y: 0 } }
      ])

      const { edges } = useFlowData(rows)

      expect(edges.value).toHaveLength(0)
    })

    it('ignores null parentId', () => {
      const rows = ref([
        { id: 'root', title: 'Root', parentId: null, position: { x: 0, y: 0 } }
      ])

      const { edges } = useFlowData(rows)

      expect(edges.value).toHaveLength(0)
    })

    it('ignores parentId that references non-existent node', () => {
      const rows = ref([
        { id: 'orphan', title: 'Orphan', parentId: 'non-existent', position: { x: 0, y: 0 } }
      ])

      const { edges } = useFlowData(rows)

      expect(edges.value).toHaveLength(0)
    })

    it('uses custom parentField', () => {
      const rows = ref([
        { id: 'parent', title: 'Parent', position: { x: 0, y: 0 } },
        { id: 'child', title: 'Child', parent: 'parent', position: { x: 0, y: 100 } }
      ])

      const { edges } = useFlowData(rows, { parentField: 'parent' })

      expect(edges.value).toHaveLength(1)
      expect(edges.value[0].source).toBe('parent')
    })

    it('is reactive to row changes', async () => {
      const rows = ref([
        { id: 'parent', title: 'Parent', position: { x: 0, y: 0 } }
      ])

      const { edges } = useFlowData(rows)

      expect(edges.value).toHaveLength(0)

      // Add a child
      rows.value.push({ id: 'child', title: 'Child', parentId: 'parent', position: { x: 0, y: 100 } })
      await nextTick()

      expect(edges.value).toHaveLength(1)
    })
  })

  describe('getNode', () => {
    it('returns node by ID', () => {
      const rows = ref([
        { id: 'item-1', title: 'First', position: { x: 100, y: 50 } },
        { id: 'item-2', title: 'Second', position: { x: 200, y: 150 } }
      ])

      const { getNode } = useFlowData(rows)

      const node = getNode('item-1')
      expect(node).toBeDefined()
      expect(node?.label).toBe('First')
    })

    it('returns undefined for non-existent ID', () => {
      const rows = ref([
        { id: 'item-1', title: 'First', position: { x: 100, y: 50 } }
      ])

      const { getNode } = useFlowData(rows)

      expect(getNode('non-existent')).toBeUndefined()
    })
  })

  describe('getItem', () => {
    it('returns original row by ID', () => {
      const rows = ref([
        { id: 'item-1', title: 'First', position: { x: 100, y: 50 }, customField: 'value' },
        { id: 'item-2', title: 'Second', position: { x: 200, y: 150 } }
      ])

      const { getItem } = useFlowData(rows)

      const item = getItem('item-1')
      expect(item).toBeDefined()
      expect(item?.title).toBe('First')
      expect(item?.customField).toBe('value')
    })

    it('returns undefined for non-existent ID', () => {
      const rows = ref([
        { id: 'item-1', title: 'First', position: { x: 100, y: 50 } }
      ])

      const { getItem } = useFlowData(rows)

      expect(getItem('non-existent')).toBeUndefined()
    })
  })

  describe('with computed ref', () => {
    it('works with computed ref input', () => {
      const baseRows = ref([
        { id: 'item-1', title: 'First', position: { x: 100, y: 50 } }
      ])
      const computedRows = computed(() => baseRows.value.filter(r => r.id))

      const { nodes } = useFlowData(computedRows)

      expect(nodes.value).toHaveLength(1)
    })
  })
})
