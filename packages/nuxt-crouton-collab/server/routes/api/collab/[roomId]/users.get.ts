/**
 * HTTP endpoint to get current users in a collaboration room
 *
 * Used by Phase 6 global presence feature to show "X people editing"
 * badges on collection list items.
 *
 * URL pattern: GET /api/collab/[roomId]/users?type=[roomType]
 * Example: GET /api/collab/page-123/users?type=page
 *
 * Response:
 * {
 *   users: CollabAwarenessState[],
 *   count: number
 * }
 */
import { getRoomUsers } from '../../../../utils/collabRoomStore'

export default defineEventHandler((event) => {
  const roomId = getRouterParam(event, 'roomId')
  const query = getQuery(event)
  const roomType = (query.type as string) || 'generic'

  if (!roomId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing roomId parameter'
    })
  }

  const users = getRoomUsers(roomType, roomId)

  return {
    users,
    count: users.length
  }
})
