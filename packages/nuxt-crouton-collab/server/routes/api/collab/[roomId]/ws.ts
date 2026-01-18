/**
 * WebSocket route for collaboration sync (Nitro experimental websocket)
 *
 * This handles WebSocket connections for local development.
 * In production with Cloudflare, this route proxies to Durable Objects.
 *
 * URL pattern: /api/collab/[roomId]/ws?type=[roomType]
 * Example: /api/collab/page-123/ws?type=page
 */
import { encodeStateAsUpdate, applyUpdate } from 'yjs'
import { getOrCreateRoom } from '../../../../utils/collabRoomStore'

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
 */
function looksLikeJson(data: Uint8Array): boolean {
  if (data.length === 0) return false
  // '{' = 123, '[' = 91
  return data[0] === 123 || data[0] === 91
}

/**
 * Convert message to Uint8Array if possible
 */
function messageToUint8Array(message: unknown): Uint8Array | null {
  // ArrayBuffer - convert to Uint8Array
  if (message instanceof ArrayBuffer) {
    return new Uint8Array(message)
  }

  // Uint8Array (including Node.js Buffer)
  if (message instanceof Uint8Array) {
    return message
  }

  // crossws Message wrapper
  if (
    message
    && typeof message === 'object'
    && 'uint8Array' in message
    && typeof (message as { uint8Array: unknown }).uint8Array === 'function'
  ) {
    const wsMessage = message as { uint8Array: () => Uint8Array }
    return wsMessage.uint8Array()
  }

  // Buffer-like objects
  if (
    message
    && typeof message === 'object'
    && 'buffer' in message
    && 'byteOffset' in message
    && 'byteLength' in message
  ) {
    const bufferLike = message as { buffer: ArrayBuffer; byteOffset: number; byteLength: number }
    return new Uint8Array(bufferLike.buffer, bufferLike.byteOffset, bufferLike.byteLength)
  }

  return null
}

export default defineWebSocketHandler({
  open(peer) {
    // Extract roomId and type from URL
    const url = new URL(peer.request?.url || '', 'http://localhost')
    const pathParts = url.pathname.split('/')
    // URL pattern: /api/collab/[roomId]/ws
    const collabIndex = pathParts.indexOf('collab')
    const roomId = pathParts[collabIndex + 1] || 'default'
    const roomType = url.searchParams.get('type') || 'generic'

    console.log('[Collab WS] Connection opened:', { roomType, roomId, roomKey: `${roomType}:${roomId}` })
    const room = getOrCreateRoom(roomType, roomId)
    const peerWithSend = peer as unknown as { send: (data: unknown) => void }
    room.peers.add(peerWithSend)

    // Store room reference on peer (including userId for cleanup on close)
    const peerData = peer as unknown as {
      _collabRoom: typeof room
      _roomId: string
      _roomType: string
      _userId: string | null
    }
    peerData._collabRoom = room
    peerData._roomId = roomId
    peerData._roomType = roomType
    peerData._userId = null

    // Send current state to new peer
    const stateUpdate = encodeStateAsUpdate(room.doc)
    peer.send(stateUpdate)

    // Send current awareness state
    const awarenessMessage = JSON.stringify({
      type: 'awareness',
      users: Array.from(room.awareness.values())
    })
    peer.send(awarenessMessage)
  },

  message(peer, message) {
    console.log('[Collab WS] Message received, type:', typeof message, 'constructor:', message?.constructor?.name)

    const peerData = peer as unknown as { _collabRoom?: ReturnType<typeof getOrCreateRoom> }
    const room = peerData._collabRoom
    if (!room) {
      console.log('[Collab WS] No room found for peer')
      return
    }

    // Extract text from crossws Message wrapper if present
    let textContent: string | null = null
    if (typeof message === 'string') {
      textContent = message
      console.log('[Collab WS] Message is string:', textContent.substring(0, 100))
    } else if (
      message
      && typeof message === 'object'
      && 'text' in message
      && typeof (message as { text: unknown }).text === 'function'
    ) {
      const wsMessage = message as { text: () => string; rawData: unknown }
      console.log('[Collab WS] Message has text() method, rawData type:', typeof wsMessage.rawData)
      // Try to get text regardless of rawData type
      try {
        textContent = wsMessage.text()
        console.log('[Collab WS] Extracted text:', textContent?.substring(0, 100))
      } catch (e) {
        console.log('[Collab WS] Failed to extract text:', e)
      }
    }

    // Handle string messages (JSON)
    console.log('[Collab WS] textContent after extraction:', textContent ? 'has value' : 'null')
    if (textContent !== null) {
      try {
        const parsed = JSON.parse(textContent)
        console.log('[Collab WS] Parsed message type:', parsed.type)
        if (parsed.type === 'awareness') {
          const clientId = parsed.userId || parsed.clientId
          console.log('[Collab WS] Awareness update received:', { clientId, state: parsed.state?.user })
          if (clientId) {
            room.awareness.set(clientId, parsed.state)
            // Track userId on peer for cleanup on close
            const peerData = peer as unknown as { _userId: string | null }
            peerData._userId = clientId
            console.log('[Collab WS] Awareness stored. Total users:', room.awareness.size)
          }
          // Broadcast awareness to all peers
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
        } else if (parsed.type === 'sync-request') {
          // Send full state
          const stateUpdate = encodeStateAsUpdate(room.doc)
          peer.send(stateUpdate)
        } else if (parsed.type === 'ping') {
          peer.send(JSON.stringify({ type: 'pong' }))
        }
      } catch {
        // Not valid JSON, ignore
      }
      return
    }

    // Handle binary messages (Yjs updates)
    try {
      const data = messageToUint8Array(message)

      if (!data) {
        console.warn('[Collab WS] Received unrecognized message type:', typeof message)
        return
      }

      if (data.length === 0) {
        console.warn('[Collab WS] Received empty message')
        return
      }

      // Handle JSON that came in as binary
      if (looksLikeJson(data)) {
        try {
          const jsonStr = new TextDecoder().decode(data)
          const parsed = JSON.parse(jsonStr)
          if (parsed.type === 'awareness') {
            const clientId = parsed.userId || parsed.clientId
            if (clientId) {
              room.awareness.set(clientId, parsed.state)
            }
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
          console.warn('[Collab WS] Failed to parse JSON-like binary:', e)
        }
        return
      }

      // Apply Yjs update
      try {
        applyUpdate(room.doc, data)
      } catch (yjsError) {
        console.error('[Collab WS] Failed to apply Yjs update:', {
          error: yjsError,
          dataLength: data.length,
          firstBytes: Array.from(data.slice(0, 20))
        })
        return
      }

      // Broadcast to other peers
      broadcastToPeers(room, peer, data)
    } catch (error) {
      console.error('[Collab WS] Error processing message:', error)
    }
  },

  close(peer) {
    const peerData = peer as unknown as {
      _collabRoom?: ReturnType<typeof getOrCreateRoom>
      _roomId?: string
      _roomType?: string
      _userId?: string | null
    }
    const room = peerData._collabRoom
    if (room) {
      room.peers.delete(peer as unknown as { send: (data: unknown) => void })

      // Remove user from awareness when they disconnect
      if (peerData._userId) {
        room.awareness.delete(peerData._userId)
        console.log('[Collab WS] User disconnected, removed from awareness:', peerData._userId, 'Remaining users:', room.awareness.size)
      }

      // Broadcast updated awareness (user left)
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
  },

  error(peer, error) {
    console.error('[Collab WS] WebSocket error:', error)
  }
})
