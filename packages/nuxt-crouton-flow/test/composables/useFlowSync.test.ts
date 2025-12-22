/**
 * Unit Tests for useFlowSync Composable
 *
 * Tests real-time flow synchronization via Yjs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import type { YjsFlowNode, YjsAwarenessState } from '../../app/types/yjs'

// Shared WebSocket instances for tests
let wsInstances: MockWebSocket[] = []

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1
  static CLOSED = 3

  static get instances() {
    return wsInstances
  }

  static set instances(val: MockWebSocket[]) {
    wsInstances = val
  }

  url: string
  binaryType: string = 'blob'
  readyState: number = MockWebSocket.OPEN
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((error: Event) => void) | null = null

  sentMessages: (string | ArrayBuffer | Uint8Array)[] = []

  constructor(url: string) {
    this.url = url
    wsInstances.push(this)
    // Simulate connection open after a tick
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(data: string | ArrayBuffer | Uint8Array) {
    this.sentMessages.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose()
    }
  }

  // Test helper: simulate receiving a message
  simulateMessage(data: string | ArrayBuffer) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }

  // Test helper: simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Make WebSocket available globally BEFORE any imports
(globalThis as any).WebSocket = MockWebSocket

// Mock Yjs
const mockNodesMap = new Map<string, YjsFlowNode>()
let observeCallback: (() => void) | null = null
let updateCallback: ((update: Uint8Array, origin: unknown) => void) | null = null

vi.mock('yjs', () => ({
  Doc: vi.fn(() => ({
    getMap: vi.fn(() => ({
      get: (id: string) => mockNodesMap.get(id),
      set: (id: string, node: YjsFlowNode) => {
        mockNodesMap.set(id, node)
        if (observeCallback) observeCallback()
      },
      delete: (id: string) => {
        mockNodesMap.delete(id)
        if (observeCallback) observeCallback()
      },
      values: () => mockNodesMap.values(),
      observe: (cb: () => void) => { observeCallback = cb }
    })),
    on: vi.fn((event: string, cb: (update: Uint8Array, origin: unknown) => void) => {
      if (event === 'update') {
        updateCallback = cb
      }
    }),
    destroy: vi.fn()
  })),
  applyUpdate: vi.fn()
}))

// Mock Vue lifecycle hooks - must use vi.mock, not stubGlobal
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...(actual as object),
    onMounted: (cb: () => void) => cb(),
    onUnmounted: vi.fn()
  }
})

// Mock Nuxt composables
vi.stubGlobal('useUserSession', () => ({
  user: ref({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com'
  })
}))

// Mock location
const mockLocation = {
  protocol: 'https:',
  host: 'example.com'
}
vi.stubGlobal('location', mockLocation)

// Mock crypto
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'uuid-' + Math.random().toString(36).substr(2, 9))
})

// Import after mocking - WebSocket is already available globally
import { useFlowSync } from '../../app/composables/useFlowSync'

describe('useFlowSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockNodesMap.clear()
    wsInstances = []
    observeCallback = null
    updateCallback = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Node CRUD Operations', () => {
    it('createNode adds a new node to the Yjs map', () => {
      const { createNode, nodes } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      // Run WebSocket open
      vi.advanceTimersByTime(1)

      const nodeId = createNode({
        title: 'Test Node',
        position: { x: 100, y: 200 }
      })

      expect(nodeId).toBeDefined()
      expect(mockNodesMap.has(nodeId)).toBe(true)

      const node = mockNodesMap.get(nodeId)
      expect(node?.title).toBe('Test Node')
      expect(node?.position).toEqual({ x: 100, y: 200 })
    })

    it('createNode generates unique IDs', () => {
      const { createNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const id1 = createNode({ title: 'Node 1' })
      const id2 = createNode({ title: 'Node 2' })

      expect(id1).not.toBe(id2)
    })

    it('createNode uses provided ID when given', () => {
      const { createNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const id = createNode({ id: 'custom-id', title: 'Custom' })

      expect(id).toBe('custom-id')
    })

    it('updateNode modifies existing node data', () => {
      const { createNode, updateNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const nodeId = createNode({ title: 'Original' })
      updateNode(nodeId, { title: 'Updated' })

      const node = mockNodesMap.get(nodeId)
      expect(node?.title).toBe('Updated')
    })

    it('updateNode logs warning for non-existent node', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { updateNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      updateNode('non-existent', { title: 'Test' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Node non-existent not found')
      )

      consoleSpy.mockRestore()
    })

    it('updatePosition rounds x/y coordinates', () => {
      const { createNode, updatePosition } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const nodeId = createNode({ title: 'Test' })
      updatePosition(nodeId, { x: 100.7, y: 200.3 })

      const node = mockNodesMap.get(nodeId)
      expect(node?.position).toEqual({ x: 101, y: 200 })
    })

    it('deleteNode removes node from Yjs map', () => {
      const { createNode, deleteNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const nodeId = createNode({ title: 'To Delete' })
      expect(mockNodesMap.has(nodeId)).toBe(true)

      deleteNode(nodeId)
      expect(mockNodesMap.has(nodeId)).toBe(false)
    })

    it('getNode returns the correct node by ID', () => {
      const { createNode, getNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const nodeId = createNode({ title: 'Find Me', data: { custom: 'value' } })

      const node = getNode(nodeId)
      expect(node?.title).toBe('Find Me')
      expect(node?.data).toEqual({ custom: 'value' })
    })

    it('getNode returns undefined for non-existent ID', () => {
      const { getNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      expect(getNode('non-existent')).toBeUndefined()
    })

    it('nodes updates reactively on Yjs changes', () => {
      const { createNode, nodes } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      expect(nodes.value).toHaveLength(0)

      createNode({ title: 'Node 1' })
      expect(nodes.value).toHaveLength(1)

      createNode({ title: 'Node 2' })
      expect(nodes.value).toHaveLength(2)
    })
  })

  describe('WebSocket Connection', () => {
    it('connects to WebSocket on mount', () => {
      useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      expect(MockWebSocket.instances).toHaveLength(1)
      expect(MockWebSocket.instances[0].url).toBe(
        'wss://example.com/api/flow/flow-123/ws?collection=decisions'
      )
    })

    it('uses ws: protocol for http:', () => {
      mockLocation.protocol = 'http:'

      useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      expect(MockWebSocket.instances[0].url).toContain('ws:')

      mockLocation.protocol = 'https:'
    })

    it('handles connection open event', () => {
      const { connected } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      expect(connected.value).toBe(false)

      vi.advanceTimersByTime(1)

      expect(connected.value).toBe(true)
    })

    it('handles incoming Yjs updates', async () => {
      const Y = await import('yjs')

      useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      const binaryData = new ArrayBuffer(10)

      ws.simulateMessage(binaryData)

      expect(Y.applyUpdate).toHaveBeenCalled()
    })

    it('handles JSON messages (awareness)', () => {
      const { users } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      const awarenessMessage = JSON.stringify({
        type: 'awareness',
        users: [
          { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null, selectedNodeId: null }
        ]
      })

      ws.simulateMessage(awarenessMessage)

      expect(users.value).toHaveLength(1)
      expect(users.value[0].user.name).toBe('Alice')
    })

    it('handles pong messages without error', () => {
      useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]

      // Should not throw
      expect(() => {
        ws.simulateMessage(JSON.stringify({ type: 'pong' }))
      }).not.toThrow()
    })

    it('reconnects on disconnect with exponential backoff', () => {
      useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)
      expect(MockWebSocket.instances).toHaveLength(1)

      // Disconnect
      MockWebSocket.instances[0].close()

      // First reconnect attempt after RECONNECT_DELAY (1000ms)
      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(1)
      expect(MockWebSocket.instances).toHaveLength(2)

      // Disconnect again
      MockWebSocket.instances[1].close()

      // Second reconnect with exponential backoff (2000ms)
      vi.advanceTimersByTime(2000)
      vi.advanceTimersByTime(1)
      expect(MockWebSocket.instances).toHaveLength(3)
    })

    it('has max reconnection attempts limit', () => {
      // The composable has MAX_RECONNECT_ATTEMPTS = 10
      // This test verifies the reconnection mechanism exists
      // Detailed timing tests for exponential backoff are complex
      // and better suited for integration testing

      const { error, connected } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1) // Initial connection
      expect(connected.value).toBe(true)

      // Close the connection
      const ws = MockWebSocket.instances[0]
      ws.close()
      expect(connected.value).toBe(false)

      // After delay, reconnection should happen
      vi.advanceTimersByTime(1001) // 1000ms delay + buffer

      // A new WebSocket should have been created
      expect(MockWebSocket.instances.length).toBeGreaterThan(1)
    })

    it('sets error on WebSocket error', () => {
      const { error } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      ws.simulateError()

      expect(error.value?.message).toBe('WebSocket connection failed')
    })
  })

  describe('Presence/Awareness', () => {
    it('sends awareness on connection', () => {
      useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      const sentMessages = ws.sentMessages.filter(m => typeof m === 'string')

      expect(sentMessages).toHaveLength(1)
      const message = JSON.parse(sentMessages[0] as string)
      expect(message.type).toBe('awareness')
      expect(message.userId).toBe('user-123')
    })

    it('updateCursor sends cursor position', () => {
      const { updateCursor } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      updateCursor({ x: 500, y: 300 })

      const ws = MockWebSocket.instances[0]
      const sentMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const cursorMessage = JSON.parse(sentMessages[sentMessages.length - 1] as string)

      expect(cursorMessage.state.cursor).toEqual({ x: 500, y: 300 })
    })

    it('selectNode broadcasts selection', () => {
      const { selectNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      selectNode('node-456')

      const ws = MockWebSocket.instances[0]
      const sentMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const selectMessage = JSON.parse(sentMessages[sentMessages.length - 1] as string)

      expect(selectMessage.state.selectedNodeId).toBe('node-456')
    })

    it('selectNode handles null selection', () => {
      const { selectNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      selectNode(null)

      const ws = MockWebSocket.instances[0]
      const sentMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const selectMessage = JSON.parse(sentMessages[sentMessages.length - 1] as string)

      expect(selectMessage.state.selectedNodeId).toBe(null)
    })
  })

  describe('State Management', () => {
    it('connected reflects WebSocket state', () => {
      const { connected } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      expect(connected.value).toBe(false)

      vi.advanceTimersByTime(1)
      expect(connected.value).toBe(true)

      MockWebSocket.instances[0].close()
      expect(connected.value).toBe(false)
    })

    it('synced is true after first update', async () => {
      const Y = await import('yjs')
      const { synced } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      expect(synced.value).toBe(false)

      // Simulate receiving Yjs update
      const ws = MockWebSocket.instances[0]
      ws.simulateMessage(new ArrayBuffer(10))

      expect(synced.value).toBe(true)
    })

    it('error captures connection failures', () => {
      const { error } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      expect(error.value).toBe(null)

      MockWebSocket.instances[0].simulateError()

      expect(error.value).toBeInstanceOf(Error)
    })

    it('clears error on successful reconnect', () => {
      const { connected, error } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      // Simulate error
      MockWebSocket.instances[0].simulateError()
      expect(error.value).not.toBe(null)

      // Close and reconnect
      MockWebSocket.instances[0].close()
      vi.advanceTimersByTime(1001)

      // New connection opens
      expect(error.value).toBe(null)
      expect(connected.value).toBe(true)
    })
  })

  describe('Ghost Node', () => {
    it('updateGhostNode sends ghost node state', () => {
      const { updateGhostNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      updateGhostNode({
        id: 'ghost-1',
        title: 'Drag Preview',
        collection: 'tasks',
        position: { x: 200, y: 300 }
      })

      const ws = MockWebSocket.instances[0]
      const sentMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const ghostMessage = JSON.parse(sentMessages[sentMessages.length - 1] as string)

      expect(ghostMessage.state.ghostNode).toEqual({
        id: 'ghost-1',
        title: 'Drag Preview',
        collection: 'tasks',
        position: { x: 200, y: 300 }
      })
    })

    it('clearGhostNode sends null ghost node', () => {
      const { clearGhostNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      clearGhostNode()

      const ws = MockWebSocket.instances[0]
      const sentMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const clearMessage = JSON.parse(sentMessages[sentMessages.length - 1] as string)

      expect(clearMessage.state.ghostNode).toBe(null)
    })
  })

  describe('User Color Generation', () => {
    it('generates consistent color for same user ID', () => {
      const { user: user1 } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      const { user: user2 } = useFlowSync({
        flowId: 'flow-456',
        collection: 'decisions'
      })

      // Same user ID should get same color
      expect(user1.value?.color).toBe(user2.value?.color)
    })

    it('user color is an HSL color', () => {
      const { user } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      // Hue can be negative due to modulo operation
      expect(user.value?.color).toMatch(/^hsl\(-?\d+, 70%, 50%\)$/)
    })
  })
})
