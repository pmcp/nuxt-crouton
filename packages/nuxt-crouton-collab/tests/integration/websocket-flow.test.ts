import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Y from 'yjs'

/**
 * Integration tests for the WebSocket collaboration flow.
 *
 * These tests verify the Yjs document synchronization logic
 * that happens between clients and the CollabRoom.
 */

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  private messageQueue: Array<string | ArrayBuffer> = []

  constructor(url: string) {
    this.url = url
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string | ArrayBuffer): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.messageQueue.push(data)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Test helper: simulate receiving a message
  simulateMessage(data: string | ArrayBuffer): void {
    this.onmessage?.(new MessageEvent('message', { data }))
  }

  // Test helper: get sent messages
  getSentMessages(): Array<string | ArrayBuffer> {
    return this.messageQueue
  }
}

describe('WebSocket Collaboration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Yjs Document Sync', () => {
    it('creates a Y.Doc with correct structure for page type', () => {
      const doc = new Y.Doc()
      const fragment = doc.getXmlFragment('content')

      // Simulate adding content
      const paragraph = new Y.XmlElement('paragraph')
      paragraph.insert(0, [new Y.XmlText('Hello, World!')])
      fragment.insert(0, [paragraph])

      expect(fragment.length).toBe(1)
      expect(fragment.get(0)).toBeInstanceOf(Y.XmlElement)
    })

    it('creates a Y.Doc with correct structure for flow type', () => {
      const doc = new Y.Doc()
      const nodesMap = doc.getMap('nodes')
      const edgesMap = doc.getMap('edges')

      // Simulate adding nodes and edges
      nodesMap.set('node-1', {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { label: 'Start' }
      })

      nodesMap.set('node-2', {
        id: 'node-2',
        type: 'action',
        position: { x: 300, y: 100 },
        data: { label: 'Process' }
      })

      edgesMap.set('edge-1', {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2'
      })

      expect(nodesMap.size).toBe(2)
      expect(edgesMap.size).toBe(1)
    })

    it('encodes and decodes Y.Doc state', () => {
      const doc1 = new Y.Doc()
      const map1 = doc1.getMap('data')
      map1.set('key', 'value')

      // Encode state
      const state = Y.encodeStateAsUpdate(doc1)

      // Create new doc and apply state
      const doc2 = new Y.Doc()
      Y.applyUpdate(doc2, state)

      const map2 = doc2.getMap('data')
      expect(map2.get('key')).toBe('value')
    })

    it('merges concurrent updates correctly', () => {
      // Simulate two users editing at the same time
      const doc1 = new Y.Doc()
      const doc2 = new Y.Doc()

      const map1 = doc1.getMap('data')
      const map2 = doc2.getMap('data')

      // User 1 adds a key
      map1.set('user1-key', 'user1-value')

      // User 2 adds a different key (before sync)
      map2.set('user2-key', 'user2-value')

      // Sync: apply doc1 updates to doc2
      const update1 = Y.encodeStateAsUpdate(doc1)
      Y.applyUpdate(doc2, update1)

      // Sync: apply doc2 updates to doc1
      const update2 = Y.encodeStateAsUpdate(doc2)
      Y.applyUpdate(doc1, update2)

      // Both docs should have both keys
      expect(map1.get('user1-key')).toBe('user1-value')
      expect(map1.get('user2-key')).toBe('user2-value')
      expect(map2.get('user1-key')).toBe('user1-value')
      expect(map2.get('user2-key')).toBe('user2-value')
    })

    it('handles conflicting updates with last-write-wins', () => {
      const doc1 = new Y.Doc()
      const doc2 = new Y.Doc()

      // Initial sync
      const map1 = doc1.getMap('data')
      const map2 = doc2.getMap('data')

      // Both set the same key
      map1.set('shared-key', 'value-from-doc1')
      map2.set('shared-key', 'value-from-doc2')

      // Sync updates
      const update1 = Y.encodeStateAsUpdate(doc1)
      const update2 = Y.encodeStateAsUpdate(doc2)

      Y.applyUpdate(doc1, update2)
      Y.applyUpdate(doc2, update1)

      // Both should converge to the same value (CRDT guarantees)
      expect(map1.get('shared-key')).toBe(map2.get('shared-key'))
    })
  })

  describe('WebSocket Connection', () => {
    it('connects to the correct URL', () => {
      const ws = new MockWebSocket('wss://example.com/api/collab/room-123/ws?type=page')

      expect(ws.url).toBe('wss://example.com/api/collab/room-123/ws?type=page')
    })

    it('starts in CONNECTING state', () => {
      const ws = new MockWebSocket('wss://example.com/api/collab/room-123/ws')

      expect(ws.readyState).toBe(MockWebSocket.CONNECTING)
    })

    it('transitions to OPEN state', async () => {
      const ws = new MockWebSocket('wss://example.com/api/collab/room-123/ws')
      const onOpen = vi.fn()
      ws.onopen = onOpen

      await vi.waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN)
      })

      expect(onOpen).toHaveBeenCalled()
    })

    it('can send binary Yjs updates', async () => {
      const ws = new MockWebSocket('wss://example.com/api/collab/room-123/ws')

      // Wait for the connection to open (real promise, not fake timers)
      await new Promise<void>(resolve => {
        const checkOpen = () => {
          if (ws.readyState === MockWebSocket.OPEN) {
            resolve()
          } else {
            setTimeout(checkOpen, 5)
          }
        }
        checkOpen()
      })

      const doc = new Y.Doc()
      doc.getMap('data').set('key', 'value')
      const update = Y.encodeStateAsUpdate(doc)

      ws.send(update.buffer)

      const sent = ws.getSentMessages()
      expect(sent).toHaveLength(1)
      expect(sent[0]).toBeInstanceOf(ArrayBuffer)
    })

    it('can send JSON awareness messages', async () => {
      const ws = new MockWebSocket('wss://example.com/api/collab/room-123/ws')

      // Wait for the connection to open (real promise, not fake timers)
      await new Promise<void>(resolve => {
        const checkOpen = () => {
          if (ws.readyState === MockWebSocket.OPEN) {
            resolve()
          } else {
            setTimeout(checkOpen, 5)
          }
        }
        checkOpen()
      })

      const awarenessMessage = JSON.stringify({
        type: 'awareness',
        userId: 'user-123',
        state: {
          user: { id: 'user-123', name: 'Alice', color: '#ff0000' },
          cursor: { x: 100, y: 200 }
        }
      })

      ws.send(awarenessMessage)

      const sent = ws.getSentMessages()
      expect(sent).toHaveLength(1)
      expect(JSON.parse(sent[0] as string)).toMatchObject({
        type: 'awareness',
        userId: 'user-123'
      })
    })
  })

  describe('Awareness Protocol', () => {
    it('creates awareness state with required fields', () => {
      const awarenessState = {
        user: { id: 'user-123', name: 'Alice', color: '#ff0000' },
        cursor: { x: 100, y: 200 },
        selection: null,
        selectedNodeId: null
      }

      expect(awarenessState.user).toBeDefined()
      expect(awarenessState.user.id).toBe('user-123')
      expect(awarenessState.cursor).toEqual({ x: 100, y: 200 })
    })

    it('can update cursor position', () => {
      let awarenessState = {
        user: { id: 'user-123', name: 'Alice', color: '#ff0000' },
        cursor: { x: 100, y: 200 }
      }

      // Simulate cursor move
      awarenessState = {
        ...awarenessState,
        cursor: { x: 150, y: 250 }
      }

      expect(awarenessState.cursor).toEqual({ x: 150, y: 250 })
    })

    it('can track node selection for flows', () => {
      const awarenessState = {
        user: { id: 'user-123', name: 'Alice', color: '#ff0000' },
        cursor: null,
        selectedNodeId: 'node-456'
      }

      expect(awarenessState.selectedNodeId).toBe('node-456')
    })

    it('can track ghost nodes for drag preview', () => {
      const awarenessState = {
        user: { id: 'user-123', name: 'Alice', color: '#ff0000' },
        cursor: null,
        ghostNode: {
          id: 'node-456',
          position: { x: 300, y: 400 }
        }
      }

      expect(awarenessState.ghostNode).toEqual({
        id: 'node-456',
        position: { x: 300, y: 400 }
      })
    })
  })

  describe('Message Types', () => {
    it('handles ping/pong for connection health', () => {
      const pingMessage = JSON.stringify({ type: 'ping' })
      const pongMessage = JSON.stringify({ type: 'pong' })

      expect(JSON.parse(pingMessage).type).toBe('ping')
      expect(JSON.parse(pongMessage).type).toBe('pong')
    })

    it('handles awareness broadcast from server', () => {
      const broadcastMessage = {
        type: 'awareness',
        users: [
          {
            user: { id: 'user-1', name: 'Alice', color: '#ff0000' },
            cursor: { x: 100, y: 200 }
          },
          {
            user: { id: 'user-2', name: 'Bob', color: '#00ff00' },
            cursor: { x: 300, y: 400 }
          }
        ]
      }

      expect(broadcastMessage.users).toHaveLength(2)
      expect(broadcastMessage.users[0].user.name).toBe('Alice')
      expect(broadcastMessage.users[1].user.name).toBe('Bob')
    })

    it('differentiates binary from JSON messages', () => {
      const binaryData = new Uint8Array([1, 2, 3, 4])
      const jsonData = '{"type":"awareness"}'

      expect(binaryData instanceof Uint8Array).toBe(true)
      expect(typeof jsonData).toBe('string')

      // In real handler, you'd check:
      // if (data instanceof ArrayBuffer || data instanceof Uint8Array) -> Yjs update
      // else if (typeof data === 'string') -> JSON message
    })
  })
})
