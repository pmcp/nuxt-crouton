import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { validateGraph } from '~~/server/utils/validate-graph'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)
  const projectId = query.projectId ? String(query.projectId) : ''

  if (!projectId) {
    throw createError({
      status: 400,
      statusText: 'projectId query parameter is required',
    })
  }

  const errors = await validateGraph(team.id, projectId)
  return errors
})
