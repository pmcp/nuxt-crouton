/**
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
      awareness: new Map(),
    })
  }
  return rooms.get(roomKey)!
}

function broadcastToPeers(
  room: ReturnType<typeof getOrCreateRoom>,
  sender: unknown,
  message: Uint8Array | string,
) {
  for (const peer of room.peers) {
    if (peer !== sender) {
      try {
        peer.send(message)
      }
      catch {
        // Peer disconnected, will be cleaned up on close
      }
    }
  }
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

    console.log(`[Flow WS] Peer connected to ${collection}:${flowId}, ${room.peers.size} peers total`)
  },

  message(peer, message) {
    const peerData = peer as unknown as { _flowRoom?: ReturnType<typeof getOrCreateRoom> }
    const room = peerData._flowRoom
    if (!room) return

    try {
      let data: Uint8Array

      if (message instanceof ArrayBuffer) {
        data = new Uint8Array(message)
      }
      else if (message instanceof Uint8Array) {
        data = message
      }
      else if (typeof message === 'string') {
        // Handle JSON messages (awareness, etc.)
        try {
          const parsed = JSON.parse(message)
          if (parsed.type === 'awareness') {
            room.awareness.set(parsed.clientId, parsed.state)
            // Broadcast awareness to others
            broadcastToPeers(room, peer, message)
          }
          else if (parsed.type === 'sync-request') {
            // Send full state
            const stateUpdate = encodeStateAsUpdate(room.doc)
            peer.send(stateUpdate)
          }
        }
        catch {
          // Not JSON, ignore
        }
        return
      }
      else {
        // Try to convert Blob or other types
        data = new Uint8Array(message as unknown as ArrayBuffer)
      }

      // Apply Yjs update
      applyUpdate(room.doc, data)

      // Broadcast to other peers
      broadcastToPeers(room, peer, data)
    }
    catch (error) {
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
      console.log(`[Flow WS] Peer disconnected, ${room.peers.size} peers remaining`)
    }
  },

  error(peer, error) {
    console.error('[Flow WS] WebSocket error:', error)
  },
})
