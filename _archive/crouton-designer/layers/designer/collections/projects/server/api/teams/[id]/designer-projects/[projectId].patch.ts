// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateDesignerProject } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { DesignerProject } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  if (!projectId) {
    throw createError({ status: 400, statusText: 'Missing project ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DesignerProject>>(event)

  return await updateDesignerProject(projectId, team.id, user.id, {
    id: body.id,
    name: body.name,
    currentPhase: body.currentPhase,
    config: body.config,
    messages: body.messages
  })
})