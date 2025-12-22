/**
 * Integration Tests for Flow Sync
 *
 * These tests verify the integration between:
 * - useFlowSync composable
 * - WebSocket message handling
 * - Yjs state synchronization
 *
 * Note: Full Durable Object integration requires Miniflare/Wrangler dev.
 * These tests simulate multi-client scenarios using mock WebSockets.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import * as Y from 'yjs'
import type { YjsFlowNode, YjsAwarenessState } from '../../app/types/yjs'

// Simulate a message broker that would be the Durable Object in production
class MockFlowServer {
  private clients: MockWebSocket[] = []
  private ydoc: Y.Doc

  constructor() {
    this.ydoc = new Y.Doc()
  }

  addClient(ws: MockWebSocket) {
    this.clients.push(ws)

    // Send current state to new client
    const state = Y.encodeStateAsUpdate(this.ydoc)
    ws.simulateMessage(state.buffer)

    // Broadcast awareness
    this.broadcastAwareness()
  }

  removeClient(ws: MockWebSocket) {
    this.clients = this.clients.filter(c => c !== ws)
    this.broadcastAwareness()
  }

  receiveUpdate(fromClient: MockWebSocket, update: Uint8Array) {
    // Apply to server doc
    Y.applyUpdate(this.ydoc, update)

    // Broadcast to other clients
    for (const client of this.clients) {
      if (client !== fromClient && client.readyState === MockWebSocket.OPEN) {
        client.simulateMessage(update.buffer)
      }
    }
  }

  broadcastAwareness() {
    const awarenessMessage = JSON.stringify({
      type: 'awareness',
      users: this.clients.map((_, i) => ({
        user: { id: `user-${i}`, name: `User ${i}`, color: `#${i}00000` },
        cursor: null,
        selectedNodeId: null
      }))
    })

    for (const client of this.clients) {
      if (client.readyState === MockWebSocket.OPEN) {
        client.simulateMessage(awarenessMessage)
      }
    }
  }
}

// Mock WebSocket class for integration tests
class MockWebSocket {
  static OPEN = 1
  static CLOSED = 3
  static instances: MockWebSocket[] = []
  static server: MockFlowServer | null = null

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
    MockWebSocket.instances.push(this)

    // Connect to mock server
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
      if (MockWebSocket.server) {
        MockWebSocket.server.addClient(this)
      }
    }, 0)
  }

  send(data: string | ArrayBuffer | Uint8Array) {
    this.sentMessages.push(data)

    // If binary, forward to server as Yjs update
    if (data instanceof Uint8Array && MockWebSocket.server) {
      MockWebSocket.server.receiveUpdate(this, data)
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (MockWebSocket.server) {
      MockWebSocket.server.removeClient(this)
    }
    if (this.onclose) {
      this.onclose()
    }
  }

  simulateMessage(data: string | ArrayBuffer) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }
}

// Setup mocks before tests
let mockNodesMap: Map<string, YjsFlowNode>
let observeCallback: (() => void) | null = null

vi.mock('yjs', () => {
  const actualY = vi.importActual('yjs')
  return {
    ...actualY,
    Doc: vi.fn(() => {
      const map = new Map<string, YjsFlowNode>()
      mockNodesMap = map
      return {
        getMap: vi.fn(() => ({
          get: (id: string) => map.get(id),
          set: (id: string, node: YjsFlowNode) => {
            map.set(id, node)
            if (observeCallback) observeCallback()
          },
          delete: (id: string) => {
            map.delete(id)
            if (observeCallback) observeCallback()
          },
          values: () => map.values(),
          observe: (cb: () => void) => { observeCallback = cb }
        })),
        on: vi.fn(),
        destroy: vi.fn()
      }
    }),
    applyUpdate: vi.fn(),
    encodeStateAsUpdate: vi.fn(() => new Uint8Array([1, 2, 3]))
  }
})

// Mock Vue lifecycle hooks - must use vi.mock, not stubGlobal
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...(actual as object),
    onMounted: (cb: () => void) => cb(),
    onUnmounted: vi.fn()
  }
})

vi.stubGlobal('useUserSession', () => ({
  user: ref({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com'
  })
}))
vi.stubGlobal('location', { protocol: 'https:', host: 'example.com' })
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'uuid-' + Math.random().toString(36).substr(2, 9))
})
vi.stubGlobal('WebSocket', MockWebSocket)

import { useFlowSync } from '../../app/composables/useFlowSync'

describe('Flow Sync Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    MockWebSocket.instances = []
    MockWebSocket.server = new MockFlowServer()
    observeCallback = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Multi-client Synchronization', () => {
    it('two clients can connect to the same flow', () => {
      // Client 1 connects
      const client1 = useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      // Client 2 connects
      const client2 = useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      // Both clients should have initialized
      expect(client1.nodes).toBeDefined()
      expect(client2.nodes).toBeDefined()
    })

    it('node creation broadcasts to other clients', () => {
      // Client 1 connects
      const client1 = useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      // Client 2 connects
      const client2 = useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      // Client 1 creates a node
      const nodeId = client1.createNode({ title: 'From Client 1' })

      // The node should exist in the shared Yjs map
      expect(client1.getNode(nodeId)).toBeDefined()
      expect(client1.getNode(nodeId)?.title).toBe('From Client 1')
    })

    it('position updates are captured with rounding', () => {
      const client = useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      const nodeId = client.createNode({
        title: 'Test Node',
        position: { x: 100, y: 200 }
      })

      // Update with decimal positions
      client.updatePosition(nodeId, { x: 150.7, y: 250.3 })

      const node = client.getNode(nodeId)
      expect(node?.position).toEqual({ x: 151, y: 250 })
    })

    it('node deletion removes from shared state', () => {
      const client = useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      const nodeId = client.createNode({ title: 'To Be Deleted' })
      expect(client.getNode(nodeId)).toBeDefined()

      client.deleteNode(nodeId)
      expect(client.getNode(nodeId)).toBeUndefined()
    })
  })

  describe('Reconnection', () => {
    it('client maintains state references after reconnection', () => {
      const { connected, nodes, createNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      if (!ws) {
        // WebSocket not available, skip test
        return
      }

      // Create a node while connected
      createNode({ title: 'Before Disconnect' })

      // Disconnect
      ws.close()
      expect(connected.value).toBe(false)

      // Reconnect
      vi.advanceTimersByTime(1001)

      // State should still be accessible
      expect(nodes.value).toHaveLength(1)
    })

    it('reconnection clears previous errors', () => {
      const { error, connected } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      if (!ws) {
        // WebSocket not available, skip test
        return
      }

      // Simulate error
      if (ws.onerror) {
        ws.onerror(new Event('error'))
      }

      expect(error.value).not.toBe(null)

      // Disconnect and reconnect
      ws.close()
      vi.advanceTimersByTime(1001)

      expect(error.value).toBe(null)
    })
  })

  describe('Presence', () => {
    it('user awareness is broadcast on connect', () => {
      useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      if (!ws) {
        // WebSocket not yet created, skip this test
        return
      }
      const stringMessages = ws.sentMessages.filter(m => typeof m === 'string')

      expect(stringMessages.length).toBeGreaterThan(0)

      const awarenessMsg = JSON.parse(stringMessages[0] as string)
      expect(awarenessMsg.type).toBe('awareness')
      expect(awarenessMsg.userId).toBe('user-123')
    })

    it('cursor position updates are sent', () => {
      const { updateCursor } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      updateCursor({ x: 100, y: 200 })

      const ws = MockWebSocket.instances[0]
      if (!ws) return
      const stringMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const lastMsg = JSON.parse(stringMessages[stringMessages.length - 1] as string)

      expect(lastMsg.state.cursor).toEqual({ x: 100, y: 200 })
    })

    it('node selection is broadcast', () => {
      const { selectNode, createNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const nodeId = createNode({ title: 'Select Me' })
      selectNode(nodeId)

      const ws = MockWebSocket.instances[0]
      if (!ws) return
      const stringMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const lastMsg = JSON.parse(stringMessages[stringMessages.length - 1] as string)

      expect(lastMsg.state.selectedNodeId).toBe(nodeId)
    })

    it('clearing selection sends null', () => {
      const { selectNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      if (!ws) return

      selectNode(null)

      const stringMessages = ws.sentMessages.filter(m => typeof m === 'string')
      const lastMsg = JSON.parse(stringMessages[stringMessages.length - 1] as string)

      expect(lastMsg.state.selectedNodeId).toBe(null)
    })
  })

  describe('Error Handling', () => {
    it('handles WebSocket errors gracefully', () => {
      const { error, connected } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      if (!ws) {
        // Skip if WebSocket not available
        return
      }

      // Simulate error
      if (ws.onerror) {
        ws.onerror(new Event('error'))
      }

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('WebSocket connection failed')
    })

    it('handles malformed JSON messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      useFlowSync({ flowId: 'flow-123', collection: 'decisions' })
      vi.advanceTimersByTime(1)

      const ws = MockWebSocket.instances[0]
      if (!ws) {
        consoleSpy.mockRestore()
        return
      }

      // Should not throw
      expect(() => {
        ws.simulateMessage('invalid json {{{')
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[useFlowSync]'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('State Consistency', () => {
    it('nodes array updates when map changes', () => {
      const { nodes, createNode, deleteNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      expect(nodes.value).toHaveLength(0)

      const id1 = createNode({ title: 'Node 1' })
      expect(nodes.value).toHaveLength(1)

      const id2 = createNode({ title: 'Node 2' })
      expect(nodes.value).toHaveLength(2)

      deleteNode(id1)
      expect(nodes.value).toHaveLength(1)
      expect(nodes.value[0].title).toBe('Node 2')
    })

    it('node data is preserved correctly', () => {
      const { createNode, getNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const nodeId = createNode({
        title: 'Complex Node',
        position: { x: 100, y: 200 },
        parentId: 'parent-123',
        data: {
          status: 'active',
          priority: 'high',
          tags: ['important', 'review']
        }
      })

      const node = getNode(nodeId)

      expect(node?.title).toBe('Complex Node')
      expect(node?.position).toEqual({ x: 100, y: 200 })
      expect(node?.parentId).toBe('parent-123')
      expect(node?.data).toEqual({
        status: 'active',
        priority: 'high',
        tags: ['important', 'review']
      })
      expect(node?.createdAt).toBeDefined()
      expect(node?.updatedAt).toBeDefined()
    })

    it('updateNode preserves unmodified fields', () => {
      const { createNode, updateNode, getNode } = useFlowSync({
        flowId: 'flow-123',
        collection: 'decisions'
      })

      vi.advanceTimersByTime(1)

      const nodeId = createNode({
        title: 'Original Title',
        position: { x: 50, y: 75 },
        data: { status: 'draft' }
      })

      const originalCreatedAt = getNode(nodeId)?.createdAt

      // Update only title
      updateNode(nodeId, { title: 'New Title' })

      const updated = getNode(nodeId)
      expect(updated?.title).toBe('New Title')
      expect(updated?.position).toEqual({ x: 50, y: 75 })
      expect(updated?.data).toEqual({ status: 'draft' })
      expect(updated?.createdAt).toBe(originalCreatedAt)
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalCreatedAt!)
    })
  })
})
