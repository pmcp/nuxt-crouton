/**
 * Shared in-memory storage for collaboration rooms
 *
 * This module provides a shared room store that can be accessed
 * by both the WebSocket handler and HTTP endpoints.
 *
 * In production with Cloudflare, this is replaced by Durable Objects.
 */
import * as Y from 'yjs'

export interface CollabRoomData {
  doc: Y.Doc
  peers: Set<{ send: (data: unknown) => void }>
  awareness: Map<string, unknown>
}

// Shared room storage
const rooms = new Map<string, CollabRoomData>()

/**
 * Get or create a room by type and ID
 */
export function getOrCreateRoom(roomType: string, roomId: string): CollabRoomData {
  const roomKey = `${roomType}:${roomId}`
  if (!rooms.has(roomKey)) {
    const doc = new Y.Doc()
    rooms.set(roomKey, {
      doc,
      peers: new Set(),
      awareness: new Map()
    })
  }
  return rooms.get(roomKey)!
}

/**
 * Get a room if it exists (doesn't create)
 */
export function getRoom(roomType: string, roomId: string): CollabRoomData | undefined {
  const roomKey = `${roomType}:${roomId}`
  return rooms.get(roomKey)
}

/**
 * Get users from a specific room
 */
export function getRoomUsers(roomType: string, roomId: string): unknown[] {
  const room = getRoom(roomType, roomId)
  if (!room) return []
  return Array.from(room.awareness.values())
}

/**
 * Get all rooms (for debugging)
 */
export function getAllRooms(): Map<string, CollabRoomData> {
  return rooms
}

/**
 * Clear a room (for cleanup/testing)
 */
export function clearRoom(roomType: string, roomId: string): void {
  const roomKey = `${roomType}:${roomId}`
  const room = rooms.get(roomKey)
  if (room) {
    room.doc.destroy()
    rooms.delete(roomKey)
  }
}
