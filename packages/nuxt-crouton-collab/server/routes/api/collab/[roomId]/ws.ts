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
 * Handle JSON messages (awareness, ping/pong, sync-request)
 */
function handleJsonMessage(
  peer: unknown,
  room: ReturnType<typeof getOrCreateRoom>,
  parsed: { type?: string; userId?: string; clientId?: string; state?: unknown }
) {
  if (parsed.type === 'awareness') {
    const clientId = parsed.userId || parsed.clientId
    console.log('[Collab WS] Awareness update received:', { clientId })
    if (clientId) {
      room.awareness.set(clientId, parsed.state)
      const peerWithUserId = peer as unknown as { _userId: string | null }
      peerWithUserId._userId = clientId
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
    const stateUpdate = encodeStateAsUpdate(room.doc)
    ;(peer as { send: (data: unknown) => void }).send(stateUpdate)
  } else if (parsed.type === 'ping') {
    ;(peer as { send: (data: unknown) => void }).send(JSON.stringify({ type: 'pong' }))
  }
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

    // IMPORTANT: Check for binary data FIRST before trying text extraction
    // crossws Message wrapper has both text() and uint8Array() methods
    // Binary Yjs updates should be handled as binary, not converted to text
    if (
      message
      && typeof message === 'object'
      && 'uint8Array' in message
      && typeof (message as { uint8Array: unknown }).uint8Array === 'function'
    ) {
      const wsMessage = message as { uint8Array: () => Uint8Array }
      const data = wsMessage.uint8Array()

      if (data && data.length > 0) {
        // Check if it's JSON (starts with '{' or '[')
        // '{' = 123, '[' = 91
        if (data[0] === 123 || data[0] === 91) {
          // It's JSON, handle as text
          try {
            const jsonStr = new TextDecoder().decode(data)
            const parsed = JSON.parse(jsonStr)
            console.log('[Collab WS] Parsed JSON message type:', parsed.type)
            handleJsonMessage(peer, room, parsed)
          } catch (e) {
            console.warn('[Collab WS] Failed to parse JSON from binary:', e)
          }
          return
        }

        // It's binary Yjs data
        console.log('[Collab WS] Processing Yjs binary update, size:', data.length)
        try {
          applyUpdate(room.doc, data)
          console.log('[Collab WS] Applied Yjs update, broadcasting to', room.peers.size - 1, 'other peers')
          broadcastToPeers(room, peer, data)
        } catch (yjsError) {
          console.error('[Collab WS] Failed to apply Yjs update:', yjsError)
        }
        return
      }
    }

    // Handle plain string messages
    if (typeof message === 'string') {
      console.log('[Collab WS] Message is string:', message.substring(0, 100))
      try {
        const parsed = JSON.parse(message)
        handleJsonMessage(peer, room, parsed)
      } catch {
        console.warn('[Collab WS] Failed to parse string as JSON')
      }
      return
    }

    // Fallback: try to extract text from message wrapper (for awareness messages)
    if (
      message
      && typeof message === 'object'
      && 'text' in message
      && typeof (message as { text: unknown }).text === 'function'
    ) {
      const wsMessage = message as { text: () => string }
      try {
        const textContent = wsMessage.text()
        // Only process if it looks like JSON
        if (textContent && (textContent.startsWith('{') || textContent.startsWith('['))) {
          const parsed = JSON.parse(textContent)
          console.log('[Collab WS] Parsed text message type:', parsed.type)
          handleJsonMessage(peer, room, parsed)
        }
      } catch {
        // Not valid JSON, ignore
      }
      return
    }

    console.warn('[Collab WS] Unhandled message type:', typeof message)
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
