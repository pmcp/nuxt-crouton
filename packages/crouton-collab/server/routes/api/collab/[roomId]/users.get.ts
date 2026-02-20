/**
 * HTTP endpoint to get current users in a collaboration room
 *
 * Used by CollabEditingBadge for presence polling.
 * URL: /api/collab/[roomId]/users?type=[roomType]&teamId=[teamId]
 *
 * Auth: Requires a valid session. Team membership is verified when teamId is provided.
 *
 * Example response:
 * {
 *   "users": [{ "user": { "id": "...", "name": "...", "color": "..." }, "cursor": null }],
 *   "count": 1
 * }
 */
import { getRoomUsers } from '../../../../utils/collabRoomStore'
import { getServerSession } from '@fyit/crouton-auth/server/utils/useServerAuth'
import { getMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  // --- Auth check: require a valid session ---
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({
      status: 401,
      message: 'Unauthorized'
    })
  }

  const roomId = getRouterParam(event, 'roomId')
  const query = getQuery(event)
  const roomType = (query.type as string) || 'page'
  const teamId = (query.teamId as string) || null

  if (!roomId) {
    throw createError({
      status: 400,
      message: 'Missing roomId parameter'
    })
  }

  // --- Team membership check ---
  if (teamId) {
    const membership = await getMembership(event, teamId, session.user.id)
    if (!membership) {
      throw createError({
        status: 403,
        message: 'Forbidden'
      })
    }
  }

  const users = getRoomUsers(roomType, roomId)

  return {
    users,
    count: users.length
  }
})
