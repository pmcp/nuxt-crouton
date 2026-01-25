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
import { getRoomUsers } from '../../../../utils/collabRoomStore'

export default defineEventHandler((event) => {
  const roomId = getRouterParam(event, 'roomId')
  const query = getQuery(event)
  const roomType = (query.type as string) || 'page'

  if (!roomId) {
    throw createError({
      status: 400,
      message: 'Missing roomId parameter'
    })
  }

  const users = getRoomUsers(roomType, roomId)

  return {
    users,
    count: users.length
  }
})
