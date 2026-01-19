import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getOrCreateRoom,
  getRoom,
  getRoomUsers,
  getAllRooms,
  clearRoom,
  type CollabRoomData
} from '../server/utils/collabRoomStore'

// Mock yjs
vi.mock('yjs', () => {
  return {
    Doc: vi.fn().mockImplementation(() => ({
      destroy: vi.fn()
    }))
  }
})

describe('collabRoomStore', () => {
  beforeEach(() => {
    // Clear all rooms before each test
    const rooms = getAllRooms()
    for (const [key] of rooms) {
      const [type, id] = key.split(':')
      clearRoom(type, id)
    }
  })

  describe('getOrCreateRoom', () => {
    it('creates a new room if it does not exist', () => {
      const room = getOrCreateRoom('page', 'test-123')

      expect(room).toBeDefined()
      expect(room.doc).toBeDefined()
      expect(room.peers).toBeInstanceOf(Set)
      expect(room.awareness).toBeInstanceOf(Map)
      expect(room.peers.size).toBe(0)
      expect(room.awareness.size).toBe(0)
    })

    it('returns the same room for the same type and id', () => {
      const room1 = getOrCreateRoom('page', 'test-123')
      const room2 = getOrCreateRoom('page', 'test-123')

      expect(room1).toBe(room2)
    })

    it('creates different rooms for different room types', () => {
      const pageRoom = getOrCreateRoom('page', 'test-123')
      const flowRoom = getOrCreateRoom('flow', 'test-123')

      expect(pageRoom).not.toBe(flowRoom)
    })

    it('creates different rooms for different room ids', () => {
      const room1 = getOrCreateRoom('page', 'test-123')
      const room2 = getOrCreateRoom('page', 'test-456')

      expect(room1).not.toBe(room2)
    })
  })

  describe('getRoom', () => {
    it('returns undefined if room does not exist', () => {
      const room = getRoom('page', 'nonexistent')

      expect(room).toBeUndefined()
    })

    it('returns the room if it exists', () => {
      const created = getOrCreateRoom('page', 'test-123')
      const found = getRoom('page', 'test-123')

      expect(found).toBe(created)
    })

    it('does not create a room if it does not exist', () => {
      getRoom('page', 'test-123')
      const rooms = getAllRooms()

      expect(rooms.size).toBe(0)
    })
  })

  describe('getRoomUsers', () => {
    it('returns empty array if room does not exist', () => {
      const users = getRoomUsers('page', 'nonexistent')

      expect(users).toEqual([])
    })

    it('returns empty array if room has no users', () => {
      getOrCreateRoom('page', 'test-123')
      const users = getRoomUsers('page', 'test-123')

      expect(users).toEqual([])
    })

    it('returns users from room awareness', () => {
      const room = getOrCreateRoom('page', 'test-123')

      const user1 = { user: { id: 'user-1', name: 'Alice', color: '#ff0000' } }
      const user2 = { user: { id: 'user-2', name: 'Bob', color: '#00ff00' } }

      room.awareness.set('user-1', user1)
      room.awareness.set('user-2', user2)

      const users = getRoomUsers('page', 'test-123')

      expect(users).toHaveLength(2)
      expect(users).toContainEqual(user1)
      expect(users).toContainEqual(user2)
    })
  })

  describe('getAllRooms', () => {
    it('returns empty map initially', () => {
      const rooms = getAllRooms()

      expect(rooms.size).toBe(0)
    })

    it('returns all created rooms', () => {
      getOrCreateRoom('page', 'test-1')
      getOrCreateRoom('page', 'test-2')
      getOrCreateRoom('flow', 'test-3')

      const rooms = getAllRooms()

      expect(rooms.size).toBe(3)
      expect(rooms.has('page:test-1')).toBe(true)
      expect(rooms.has('page:test-2')).toBe(true)
      expect(rooms.has('flow:test-3')).toBe(true)
    })
  })

  describe('clearRoom', () => {
    it('removes the room if it exists', () => {
      getOrCreateRoom('page', 'test-123')

      expect(getAllRooms().size).toBe(1)

      clearRoom('page', 'test-123')

      expect(getAllRooms().size).toBe(0)
    })

    it('calls destroy on the Y.Doc', () => {
      const room = getOrCreateRoom('page', 'test-123')
      const destroySpy = vi.spyOn(room.doc, 'destroy')

      clearRoom('page', 'test-123')

      expect(destroySpy).toHaveBeenCalled()
    })

    it('does nothing if room does not exist', () => {
      // Should not throw
      expect(() => clearRoom('page', 'nonexistent')).not.toThrow()
    })

    it('only clears the specified room', () => {
      getOrCreateRoom('page', 'test-1')
      getOrCreateRoom('page', 'test-2')

      clearRoom('page', 'test-1')

      const rooms = getAllRooms()
      expect(rooms.size).toBe(1)
      expect(rooms.has('page:test-2')).toBe(true)
    })
  })

  describe('room key format', () => {
    it('uses type:id format for room keys', () => {
      getOrCreateRoom('flow', 'my-room')

      const rooms = getAllRooms()
      expect(rooms.has('flow:my-room')).toBe(true)
    })

    it('handles special characters in room id', () => {
      getOrCreateRoom('page', 'room-with-special_chars.123')

      const rooms = getAllRooms()
      expect(rooms.has('page:room-with-special_chars.123')).toBe(true)
    })
  })
})
