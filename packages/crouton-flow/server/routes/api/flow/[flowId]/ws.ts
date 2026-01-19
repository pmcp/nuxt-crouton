/**
 * @deprecated Use `/api/collab/[roomId]/ws?type=flow` from @fyit/crouton-collab instead.
 *
 * This WebSocket route is kept for backward compatibility with existing deployments.
 * New flows should use useFlowSync which now wraps useCollabSync and connects to
 * the collab endpoint automatically.
 *
 * Migration path:
 * 1. useFlowSync now uses `/api/collab/[roomId]/ws?type=flow`
 * 2. The collab package provides a unified CollabRoom Durable Object
 * 3. Existing flows using this endpoint will continue to work until migration
 *
 * ---
 *
 * WebSocket route for flow sync (Nitro experimental websocket)
 *
 * This handles WebSocket connections for local development.
 * In production with Cloudflare, the API route proxies to Durable Objects instead.
 */
import * as Y from 'yjs'
import { encodeStateAsUpdate, applyUpdate } from 'yjs'

// In-memory storage for local development
const rooms = new Map<string, {
  doc: Y.Doc
  peers: Set<{ send: (data: unknown) => void }>
  awareness: Map<string, unknown>
}>()

function getOrCreateRoom(flowId: string, collection: string) {
  const roomKey = `${collection}:${flowId}`
  if (!rooms.has(roomKey)) {
    const doc = new Y.Doc()
    // Initialize nodes map
    doc.getMap('nodes')
    rooms.set(roomKey, {
      doc,
      peers: new Set(),
      awareness: new Map()
    })
  }
  return rooms.get(roomKey)!
}

function broadcastToPeers(
  room: ReturnType<typeof getOrCreateRoom>,
  sender: unknown,
  message: Uint8Array | string
) {
  for (const peer of room.peers) {
    if (peer !== sender) {
      try {
        peer.send(message)
      } catch {
        // Peer disconnected, will be cleaned up on close
      }
    }
  }
}

/**
 * Check if data looks like JSON (starts with '{' or '[')
 * Used to filter out JSON messages that weren't caught by string check
 */
function looksLikeJson(data: Uint8Array): boolean {
  if (data.length === 0) return false
  // '{' = 123, '[' = 91
  return data[0] === 123 || data[0] === 91
}

/**
 * Convert message to Uint8Array if possible
 * Handles various message types from Nitro's experimental WebSocket (crossws)
 */
function messageToUint8Array(message: unknown): Uint8Array | null {
  // ArrayBuffer - convert to Uint8Array
  if (message instanceof ArrayBuffer) {
    return new Uint8Array(message)
  }

  // Uint8Array (including Node.js Buffer which extends Uint8Array)
  if (message instanceof Uint8Array) {
    return message
  }

  // crossws Message wrapper - use its uint8Array() method
  if (
    message
    && typeof message === 'object'
    && 'uint8Array' in message
    && typeof (message as { uint8Array: unknown }).uint8Array === 'function'
  ) {
    const wsMessage = message as { uint8Array: () => Uint8Array }
    return wsMessage.uint8Array()
  }

  // Check for Buffer-like objects (has buffer, byteOffset, byteLength)
  if (
    message
    && typeof message === 'object'
    && 'buffer' in message
    && 'byteOffset' in message
    && 'byteLength' in message
  ) {
    const bufferLike = message as { buffer: ArrayBuffer, byteOffset: number, byteLength: number }
    return new Uint8Array(bufferLike.buffer, bufferLike.byteOffset, bufferLike.byteLength)
  }

  return null
}

export default defineWebSocketHandler({
  open(peer) {
    // Extract flowId and collection from URL
    const url = new URL(peer.request?.url || '', 'http://localhost')
    const pathParts = url.pathname.split('/')
    // URL pattern: /api/flow/[flowId]/ws
    const flowIdIndex = pathParts.indexOf('flow') + 1
    const flowId = pathParts[flowIdIndex] || 'default'
    const collection = url.searchParams.get('collection') || 'default'

    const room = getOrCreateRoom(flowId, collection)
    const peerWithSend = peer as unknown as { send: (data: unknown) => void }
    room.peers.add(peerWithSend)

    // Store room reference on peer for later
    const peerData = peer as unknown as {
      _flowRoom: typeof room
      _flowId: string
      _collection: string
    }
    peerData._flowRoom = room
    peerData._flowId = flowId
    peerData._collection = collection

    // Send current state to new peer
    const stateUpdate = encodeStateAsUpdate(room.doc)
    peer.send(stateUpdate)
  },

  message(peer, message) {
    const peerData = peer as unknown as { _flowRoom?: ReturnType<typeof getOrCreateRoom> }
    const room = peerData._flowRoom
    if (!room) return

    // Extract text from crossws Message wrapper if present
    let textContent: string | null = null
    if (typeof message === 'string') {
      textContent = message
    } else if (
      message
      && typeof message === 'object'
      && 'text' in message
      && typeof (message as { text: unknown }).text === 'function'
    ) {
      // crossws Message wrapper - check if it's a text message
      const wsMessage = message as { text: () => string, rawData: unknown }
      if (typeof wsMessage.rawData === 'string') {
        textContent = wsMessage.text()
      }
    }

    // Handle string messages (JSON for awareness, sync-request, etc.)
    if (textContent !== null) {
      try {
        const parsed = JSON.parse(textContent)
        if (parsed.type === 'awareness') {
          room.awareness.set(parsed.clientId, parsed.state)
          // Broadcast awareness to others
          broadcastToPeers(room, peer, textContent)
        } else if (parsed.type === 'sync-request') {
          // Send full state
          const stateUpdate = encodeStateAsUpdate(room.doc)
          peer.send(stateUpdate)
        }
      } catch {
        // Not valid JSON, ignore
      }
      return
    }

    // Handle binary messages (Yjs updates)
    try {
      const data = messageToUint8Array(message)

      // Validate we got valid data
      if (!data) {
        console.warn('[Flow WS] Received unrecognized message type:', typeof message, message?.constructor?.name)
        return
      }

      // Validate it's not empty
      if (data.length === 0) {
        console.warn('[Flow WS] Received empty message')
        return
      }

      // Handle JSON that came in as binary (awareness messages, etc.)
      if (looksLikeJson(data)) {
        try {
          const jsonStr = new TextDecoder().decode(data)
          const parsed = JSON.parse(jsonStr)
          if (parsed.type === 'awareness') {
            // Store awareness state
            const clientId = parsed.userId || parsed.clientId
            if (clientId) {
              room.awareness.set(clientId, parsed.state)
            }
            // Broadcast awareness to all peers (including sender gets echo)
            const awarenessMessage = JSON.stringify({
              type: 'awareness',
              users: Array.from(room.awareness.values())
            })
            for (const p of room.peers) {
              try {
                p.send(awarenessMessage)
              } catch {
                // Peer disconnected
              }
            }
          }
        } catch (e) {
          console.warn('[Flow WS] Failed to parse JSON-like binary:', e)
        }
        return
      }

      // Apply Yjs update with inner try-catch for better error context
      try {
        applyUpdate(room.doc, data)
      } catch (yjsError) {
        console.error('[Flow WS] Failed to apply Yjs update:', {
          error: yjsError,
          dataLength: data.length,
          firstBytes: Array.from(data.slice(0, 20))
        })
        return // Don't broadcast invalid updates
      }

      // Broadcast to other peers
      broadcastToPeers(room, peer, data)
    } catch (error) {
      console.error('[Flow WS] Error processing message:', error)
    }
  },

  close(peer) {
    const peerData = peer as unknown as {
      _flowRoom?: ReturnType<typeof getOrCreateRoom>
      _flowId?: string
      _collection?: string
    }
    const room = peerData._flowRoom
    if (room) {
      room.peers.delete(peer as unknown as { send: (data: unknown) => void })
    }
  },

  error(peer, error) {
    console.error('[Flow WS] WebSocket error:', error)
  }
})
