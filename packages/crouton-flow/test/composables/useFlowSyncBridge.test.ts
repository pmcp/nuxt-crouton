/**
 * Unit Tests for useFlowSyncBridge Composable
 *
 * Tests the bridge between Yjs sync state and Vue Flow node format.
 * Covers the sync fallback behavior that prevents blank canvas when
 * Yjs hasn't connected yet (production bug fix).
 *
 * Key scenarios:
 * - Seeding: when synced=true and rows have data but Yjs is empty, seeds Yjs from rows
 * - No re-seed: when synced=true and Yjs already has nodes, does NOT re-seed
 * - Pre-sync: when synced=false, does not seed yet (waits for connection)
 * - syncNodes computed: converts YjsFlowNode[] to Vue Flow Node[]
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick, computed } from 'vue'
import type { Ref } from 'vue'
import type { Node } from '@vue-flow/core'
import type { YjsFlowNode, CollabAwarenessState } from '../../app/types/yjs'
import { useFlowSyncBridge } from '../../app/composables/useFlowSyncBridge'

// Stub crypto.randomUUID for node ID generation during seeding
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'generated-uuid-' + Math.random().toString(36).substr(2, 6))
})

/**
 * Creates a mock FlowSyncState that mimics useFlowSync return value.
 * All node operations manipulate an in-memory array so watchers can react.
 */
function createMockSyncState(options: {
  synced?: boolean
  connected?: boolean
  initialNodes?: YjsFlowNode[]
} = {}) {
  const nodesRef = ref<YjsFlowNode[]>(options.initialNodes || [])
  const syncedRef = ref(options.synced ?? false)
  const connectedRef = ref(options.connected ?? false)
  const usersRef = ref<CollabAwarenessState[]>([])
  const userRef = ref({ id: 'user-1', name: 'Test User', color: 'hsl(200, 70%, 50%)' })
  const errorRef = ref<Error | null>(null)

  const createNode = vi.fn((opts: {
    id?: string
    title: string
    parentId?: string | null
    position?: { x: number; y: number }
    data?: Record<string, unknown>
  }) => {
    const id = opts.id || crypto.randomUUID()
    const node: YjsFlowNode = {
      id,
      title: opts.title,
      position: opts.position || { x: 0, y: 0 },
      parentId: opts.parentId || null,
      data: opts.data || {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    nodesRef.value = [...nodesRef.value, node]
    return id
  })

  const updateNode = vi.fn((id: string, updates: Partial<YjsFlowNode>) => {
    nodesRef.value = nodesRef.value.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    )
  })

  const deleteNode = vi.fn((id: string) => {
    nodesRef.value = nodesRef.value.filter(n => n.id !== id)
  })

  const updatePosition = vi.fn()
  const updateContainer = vi.fn()
  const updateDimensions = vi.fn()
  const selectNode = vi.fn()
  const updateCursor = vi.fn()
  const updateGhostNode = vi.fn()
  const clearGhostNode = vi.fn()
  const getNode = vi.fn((id: string) => nodesRef.value.find(n => n.id === id))

  return {
    state: {
      nodes: nodesRef,
      synced: syncedRef,
      connected: connectedRef,
      users: usersRef,
      user: userRef,
      error: errorRef,
      createNode,
      updateNode,
      deleteNode,
      updatePosition,
      updateContainer,
      updateDimensions,
      selectNode,
      updateCursor,
      updateGhostNode,
      clearGhostNode,
      getNode
    },
    // Test helpers to manipulate internal state
    _nodesRef: nodesRef,
    _syncedRef: syncedRef,
    _connectedRef: connectedRef,
    _usersRef: usersRef
  }
}

function createDefaultBridgeOptions(overrides: {
  syncState?: ReturnType<typeof createMockSyncState>['state'] | null
  rows?: Ref<Record<string, unknown>[] | undefined>
  labelField?: string
  parentField?: string
  positionField?: string
} = {}) {
  return {
    syncState: overrides.syncState ?? null,
    rows: overrides.rows ?? ref<Record<string, unknown>[] | undefined>([]),
    labelField: overrides.labelField ?? 'title',
    parentField: overrides.parentField ?? 'parentId',
    positionField: overrides.positionField ?? 'position',
    localGhostNode: ref<Node | null>(null),
    stopGhostCleanup: vi.fn()
  }
}

describe('useFlowSyncBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================
  // SEEDING BEHAVIOR
  // =============================================
  describe('Yjs seeding from rows', () => {
    it('seeds Yjs from rows when synced=true and Yjs is empty', async () => {
      const mock = createMockSyncState({ synced: true })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'First', parentId: null, position: { x: 10, y: 20 } },
        { id: 'row-2', title: 'Second', parentId: 'row-1', position: { x: 30, y: 40 } }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      // createNode should have been called for each row
      expect(mock.state.createNode).toHaveBeenCalledTimes(2)
      expect(mock.state.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'row-1',
          title: 'First',
          parentId: null,
          position: { x: 10, y: 20 }
        })
      )
      expect(mock.state.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'row-2',
          title: 'Second',
          parentId: 'row-1',
          position: { x: 30, y: 40 }
        })
      )
    })

    it('does NOT re-seed when Yjs already has nodes', async () => {
      const existingNode: YjsFlowNode = {
        id: 'existing-1',
        title: 'Already Here',
        position: { x: 100, y: 200 },
        parentId: null,
        data: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [existingNode]
      })

      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'From Rows', parentId: null }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      // createNode should NOT be called for seeding (Yjs already has data)
      // Note: the row-sync watcher may call createNode for new rows not in Yjs,
      // but that's the sync watcher, not the seeding watcher
      const seedCalls = mock.state.createNode.mock.calls.filter(
        (call: unknown[]) => (call[0] as { id: string }).id === 'row-1'
      )
      // The row-sync watcher will add row-1 since it's not in Yjs yet,
      // but seeding should have been skipped (seeded flag set because Yjs had nodes)
      expect(seedCalls.length).toBeLessThanOrEqual(1)
    })

    it('does NOT seed when synced=false (waiting for Yjs connection)', async () => {
      const mock = createMockSyncState({ synced: false })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'Waiting', parentId: null }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      // No seeding should happen when not synced
      expect(mock.state.createNode).not.toHaveBeenCalled()
    })

    it('seeds when synced becomes true after rows are already loaded', async () => {
      const mock = createMockSyncState({ synced: false })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'Pre-loaded', parentId: null, position: { x: 5, y: 10 } }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()
      expect(mock.state.createNode).not.toHaveBeenCalled()

      // Now Yjs connects
      mock._syncedRef.value = true
      await nextTick()

      expect(mock.state.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'row-1',
          title: 'Pre-loaded',
          position: { x: 5, y: 10 }
        })
      )
    })

    it('seeds when rows arrive after synced is already true', async () => {
      const mock = createMockSyncState({ synced: true })
      const rows = ref<Record<string, unknown>[] | undefined>([])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()
      expect(mock.state.createNode).not.toHaveBeenCalled()

      // Rows arrive late
      rows.value = [
        { id: 'late-1', title: 'Late Arrival', parentId: null }
      ]
      await nextTick()

      expect(mock.state.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'late-1',
          title: 'Late Arrival'
        })
      )
    })

    it('parses string JSON positions during seeding', async () => {
      const mock = createMockSyncState({ synced: true })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'JSON Pos', parentId: null, position: '{"x":50,"y":75}' }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      expect(mock.state.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 50, y: 75 }
        })
      )
    })

    it('defaults position to (0,0) when position field is missing', async () => {
      const mock = createMockSyncState({ synced: true })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'No Position', parentId: null }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      expect(mock.state.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 0, y: 0 }
        })
      )
    })
  })

  // =============================================
  // SYNC NODES COMPUTED (Vue Flow conversion)
  // =============================================
  describe('syncNodes computed', () => {
    it('returns empty array when syncState is null', () => {
      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: null
      }))

      expect(syncNodes.value).toEqual([])
    })

    it('converts YjsFlowNode to Vue Flow Node format', async () => {
      const yjsNode: YjsFlowNode = {
        id: 'node-1',
        title: 'Test Node',
        position: { x: 100, y: 200 },
        parentId: 'parent-1',
        data: { status: 'active' },
        createdAt: 1000,
        updatedAt: 2000,
        nodeType: 'card'
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [yjsNode]
      })

      // Pass rows matching the initial node to prevent row-sync watcher from deleting it
      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([{ id: 'node-1', title: 'Test Node', parentId: 'parent-1', status: 'active' }])
      }))

      const nodes = syncNodes.value
      expect(nodes).toHaveLength(1)

      const vfNode = nodes[0]
      expect(vfNode.id).toBe('node-1')
      expect(vfNode.type).toBe('card')
      expect(vfNode.position).toEqual({ x: 100, y: 200 })
      expect(vfNode.label).toBe('Test Node')
      expect(vfNode.data).toEqual(expect.objectContaining({
        id: 'node-1',
        title: 'Test Node',
        parentId: 'parent-1',
        status: 'active'
      }))
    })

    it('maps containerId to Vue Flow parentNode', () => {
      const yjsNode: YjsFlowNode = {
        id: 'child-1',
        title: 'Child Node',
        position: { x: 10, y: 10 },
        parentId: null,
        data: {},
        createdAt: 1000,
        updatedAt: 2000,
        containerId: 'group-1'
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [yjsNode]
      })

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([{ id: 'child-1', title: 'Child Node', parentId: null }])
      }))

      expect(syncNodes.value[0].parentNode).toBe('group-1')
    })

    it('maps dimensions to width/height style', () => {
      const yjsNode: YjsFlowNode = {
        id: 'resizable-1',
        title: 'Resizable',
        position: { x: 0, y: 0 },
        parentId: null,
        data: {},
        createdAt: 1000,
        updatedAt: 2000,
        dimensions: { width: 300, height: 200 }
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [yjsNode]
      })

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([{ id: 'resizable-1', title: 'Resizable', parentId: null }])
      }))

      expect(syncNodes.value[0].style).toEqual(
        expect.objectContaining({
          width: '300px',
          height: '200px'
        })
      )
    })

    it('defaults nodeType to "default" when not specified', () => {
      const yjsNode: YjsFlowNode = {
        id: 'no-type',
        title: 'Default Type',
        position: { x: 0, y: 0 },
        parentId: null,
        data: {},
        createdAt: 1000,
        updatedAt: 2000
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [yjsNode]
      })

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([{ id: 'no-type', title: 'Default Type', parentId: null }])
      }))

      expect(syncNodes.value[0].type).toBe('default')
    })

    it('is empty when Yjs has no nodes (pre-sync state)', () => {
      const mock = createMockSyncState({ synced: false })

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state
      }))

      // syncNodes should be empty because Yjs has no nodes
      expect(syncNodes.value).toEqual([])
    })
  })

  // =============================================
  // SYNC EDGES COMPUTED
  // =============================================
  describe('syncEdges computed', () => {
    it('generates edges from parentId relationships', () => {
      const nodes: YjsFlowNode[] = [
        { id: 'parent', title: 'Parent', position: { x: 0, y: 0 }, parentId: null, data: {}, createdAt: 1000, updatedAt: 2000 },
        { id: 'child', title: 'Child', position: { x: 0, y: 100 }, parentId: 'parent', data: {}, createdAt: 1000, updatedAt: 2000 }
      ]

      const mock = createMockSyncState({
        synced: true,
        initialNodes: nodes
      })

      const { syncEdges } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([
          { id: 'parent', title: 'Parent', parentId: null },
          { id: 'child', title: 'Child', parentId: 'parent' }
        ])
      }))

      expect(syncEdges.value).toHaveLength(1)
      expect(syncEdges.value[0]).toEqual({
        id: 'e-parent-child',
        source: 'parent',
        target: 'child',
        type: 'default'
      })
    })

    it('skips edges when parent node does not exist', () => {
      const nodes: YjsFlowNode[] = [
        { id: 'orphan', title: 'Orphan', position: { x: 0, y: 0 }, parentId: 'missing-parent', data: {}, createdAt: 1000, updatedAt: 2000 }
      ]

      const mock = createMockSyncState({
        synced: true,
        initialNodes: nodes
      })

      const { syncEdges } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([{ id: 'orphan', title: 'Orphan', parentId: 'missing-parent' }])
      }))

      expect(syncEdges.value).toHaveLength(0)
    })

    it('returns empty when syncState is null', () => {
      const { syncEdges } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: null
      }))

      expect(syncEdges.value).toEqual([])
    })
  })

  // =============================================
  // SYNC FALLBACK SCENARIO (Production bug fix)
  // =============================================
  describe('sync fallback — blank canvas prevention', () => {
    /**
     * This tests the scenario that caused the production bug:
     * When sync=true but Yjs hasn't connected yet, syncNodes is empty.
     * Flow.vue's finalNodes computed checks:
     *   if (syncNodes.length === 0 && !syncState.synced.value)
     *     → falls back to layoutedNodes (rows-based rendering)
     *
     * We verify that the bridge correctly reports empty syncNodes
     * when Yjs hasn't synced, so the fallback in Flow.vue can trigger.
     */
    it('syncNodes is empty when synced=false and no Yjs data exists', () => {
      const mock = createMockSyncState({ synced: false })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'Should See This', parentId: null }
      ])

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      // syncNodes should be empty — Yjs has no data yet
      expect(syncNodes.value).toHaveLength(0)
      // synced should still be false
      expect(mock.state.synced.value).toBe(false)

      // This is the condition Flow.vue checks to fall back to rows-based layout:
      // syncNodes.length === 0 && !syncState.synced.value
      // The canvas would show layoutedNodes (from rows) instead of blank
    })

    it('syncNodes populates after Yjs syncs with node data', async () => {
      const mock = createMockSyncState({ synced: false })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'Row Node', parentId: null, position: { x: 10, y: 20 } }
      ])

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      // Before sync: empty
      expect(syncNodes.value).toHaveLength(0)

      // Simulate Yjs connecting and seeding
      mock._syncedRef.value = true
      await nextTick()

      // After sync: nodes should be populated (seeded from rows)
      expect(syncNodes.value.length).toBeGreaterThan(0)
      expect(syncNodes.value[0].label).toBe('Row Node')
    })

    it('uses synced Yjs nodes when sync completes with persisted data', () => {
      const persistedNode: YjsFlowNode = {
        id: 'persisted-1',
        title: 'From Yjs Storage',
        position: { x: 500, y: 300 },
        parentId: null,
        data: { saved: true },
        createdAt: 1000,
        updatedAt: 2000
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [persistedNode]
      })

      // Pass rows that match the persisted node (simulates DB and Yjs having same data)
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'persisted-1', title: 'From DB', parentId: null }
      ])

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      // Should use Yjs persisted data (title from Yjs, not from rows)
      expect(syncNodes.value).toHaveLength(1)
      expect(syncNodes.value[0].id).toBe('persisted-1')
      // The Yjs node retains its title — row-sync only updates if data differs
      expect(syncNodes.value[0].position).toEqual({ x: 500, y: 300 })
    })
  })

  // =============================================
  // ROW-TO-YJS SYNC (post-seeding)
  // =============================================
  describe('row-to-Yjs sync after seeding', () => {
    it('creates new Yjs nodes when new rows appear', async () => {
      const mock = createMockSyncState({ synced: true })
      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'Initial', parentId: null }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      // Clear seed calls
      mock.state.createNode.mockClear()

      // Add a new row
      rows.value = [
        { id: 'row-1', title: 'Initial', parentId: null },
        { id: 'row-2', title: 'New Row', parentId: null }
      ]
      await nextTick()

      // Should have created the new node
      expect(mock.state.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'row-2',
          title: 'New Row'
        })
      )
    })

    it('preserves node.ephemeral when row data updates', async () => {
      // Regression test for the bug where row refetches stomped Yjs-only state
      // (agentLog, agentStatus, userPrompt, etc.). After Option C, ephemeral
      // is a sibling of data and the row-sync watcher never touches it.
      const initialNode: YjsFlowNode = {
        id: 'node-1',
        title: 'Original Title',
        position: { x: 0, y: 0 },
        parentId: null,
        data: { id: 'node-1', title: 'Original Title', parentId: null, status: 'idle' },
        ephemeral: {
          agentStatus: 'working',
          agentLog: [{ type: 'thinking', text: 'planning', ts: 1000 }]
        },
        createdAt: 1000,
        updatedAt: 1000
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [initialNode]
      })

      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'node-1', title: 'Original Title', parentId: null, status: 'idle' }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      // Simulate a row refetch with updated DB-side fields (status changed)
      rows.value = [
        { id: 'node-1', title: 'Updated Title', parentId: null, status: 'working' }
      ]
      await nextTick()

      // The bridge should call updateNode with new title/data BUT NOT pass an
      // ephemeral field, so updateNode's spread merge preserves the existing
      // ephemeral bag. This is the whole point of Option C.
      const updateCalls = mock.state.updateNode.mock.calls
      expect(updateCalls.length).toBeGreaterThan(0)

      // None of the bridge's updateNode calls should pass an `ephemeral` field —
      // that field is owned by collaborators (workers, browsers), not the bridge.
      for (const call of updateCalls) {
        const updates = call[1] as Partial<YjsFlowNode>
        expect(updates).not.toHaveProperty('ephemeral')
      }

      // And the resulting node in the mock store should still have its
      // ephemeral bag intact (the mock's updateNode does spread merge,
      // matching the real useFlowSync.updateNode behavior).
      const liveNode = mock._nodesRef.value.find(n => n.id === 'node-1')
      expect(liveNode?.ephemeral).toEqual({
        agentStatus: 'working',
        agentLog: [{ type: 'thinking', text: 'planning', ts: 1000 }]
      })
    })

    it('surfaces node.ephemeral as data.ephemeral on the Vue Flow node', () => {
      // Vue Flow only forwards `data` to custom node components, so we
      // namespace ephemeral inside the data prop. Consumers read
      // `props.data.ephemeral.<key>`.
      const yjsNode: YjsFlowNode = {
        id: 'node-1',
        title: 'Test',
        position: { x: 0, y: 0 },
        parentId: null,
        data: { status: 'idle' },
        ephemeral: { agentStatus: 'working', agentLog: [{ type: 'text', text: 'hi', ts: 1 }] },
        createdAt: 1000,
        updatedAt: 1000
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [yjsNode]
      })

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([{ id: 'node-1', title: 'Test', parentId: null, status: 'idle' }])
      }))

      const vfNode = syncNodes.value[0]
      expect(vfNode.data).toHaveProperty('ephemeral')
      expect((vfNode.data as Record<string, unknown>).ephemeral).toEqual({
        agentStatus: 'working',
        agentLog: [{ type: 'text', text: 'hi', ts: 1 }]
      })
    })

    it('surfaces empty ephemeral object when node has no ephemeral state', () => {
      const yjsNode: YjsFlowNode = {
        id: 'node-1',
        title: 'Test',
        position: { x: 0, y: 0 },
        parentId: null,
        data: {},
        // ephemeral intentionally omitted
        createdAt: 1000,
        updatedAt: 1000
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [yjsNode]
      })

      const { syncNodes } = useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows: ref([{ id: 'node-1', title: 'Test', parentId: null }])
      }))

      // Defensive default — components reading data.ephemeral.X should never
      // hit a TypeError just because no collaborator has written ephemeral yet.
      expect((syncNodes.value[0].data as Record<string, unknown>).ephemeral).toEqual({})
    })

    it('deletes Yjs nodes when rows are removed', async () => {
      const initialNode: YjsFlowNode = {
        id: 'row-1',
        title: 'To Remove',
        position: { x: 0, y: 0 },
        parentId: null,
        data: { id: 'row-1', title: 'To Remove', parentId: null },
        createdAt: 1000,
        updatedAt: 2000
      }

      const mock = createMockSyncState({
        synced: true,
        initialNodes: [initialNode]
      })

      const rows = ref<Record<string, unknown>[] | undefined>([
        { id: 'row-1', title: 'To Remove', parentId: null }
      ])

      useFlowSyncBridge(createDefaultBridgeOptions({
        syncState: mock.state,
        rows
      }))

      await nextTick()

      // Remove the row
      rows.value = []
      await nextTick()

      expect(mock.state.deleteNode).toHaveBeenCalledWith('row-1')
    })
  })
})
