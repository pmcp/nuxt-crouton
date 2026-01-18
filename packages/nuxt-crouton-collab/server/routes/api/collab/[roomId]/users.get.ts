/**
 * HTTP endpoint to get current users in a collaboration room
 *
 * Used by CollabEditingBadge for presence polling.
 * URL: /api/collab/[roomId]/users?type=[roomType]
 *
 * Example response:
 * {
 *   "users": [{ "user": { "id": "...", "name": "...", "color": "..." }, "cursor": null }],
 *   "count": 1
 * }
 */
import { getRoomUsers, getAllRooms } from '../../../../utils/collabRoomStore'

export default defineEventHandler((event) => {
  const roomId = getRouterParam(event, 'roomId')
  const query = getQuery(event)
  const roomType = (query.type as string) || 'page'

  if (!roomId) {
    throw createError({
      statusCode: 400,
      message: 'Missing roomId parameter'
    })
  }

  const users = getRoomUsers(roomType, roomId)

  // Debug: log all rooms to see what's registered
  const allRooms = getAllRooms()
  console.log('[Collab /users] Request for:', { roomType, roomId })
  console.log('[Collab /users] All rooms:', Array.from(allRooms.keys()))
  console.log('[Collab /users] Users found:', users.length)

  return {
    users,
    count: users.length
  }
})
