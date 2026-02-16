// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePositionPagesPage } from '../../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { pageId } = getRouterParams(event)
  if (!pageId) {
    throw createError({ status: 400, statusText: 'Missing page ID' })
  }
  const { team } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Validate input
  if (body.order === undefined || typeof body.order !== 'number') {
    throw createError({ status: 400, statusText: 'order is required and must be a number' })
  }

  // parentId can be null (move to root) or a valid ID
  const parentId = body.parentId ?? null

  return await updatePositionPagesPage(team.id, pageId, parentId, body.order)
})