// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePositionThinkgraphNode } from '../../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { nodeId } = getRouterParams(event)
  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Missing node ID' })
  }

  const authTimer = timing.start('auth')
  const { team } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody(event)

  // Validate input
  if (body.order === undefined || typeof body.order !== 'number') {
    throw createError({ status: 400, statusText: 'order is required and must be a number' })
  }

  // parentId can be null (move to root) or a valid ID
  const parentId = body.parentId ?? null

  const dbTimer = timing.start('db')
  const result = await updatePositionThinkgraphNode(team.id, nodeId, parentId, body.order)
  dbTimer.end()
  return result
})