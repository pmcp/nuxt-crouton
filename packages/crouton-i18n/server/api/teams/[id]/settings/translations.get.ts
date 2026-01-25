import { eq } from 'drizzle-orm'
import { teamSettings } from '@fyit/crouton-core/server/database/schema/teamSettings'
import { isTeamMemberWithEvent } from '@fyit/crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { id: teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({
      status: 400,
      statusText: 'Team ID is required'
    })
  }
  const { user } = await requireUserSession(event)

  // Check if user has access to this team
  const hasAccess = await isTeamMemberWithEvent(event, teamId, user.id)
  if (!hasAccess) {
    throw createError({
      status: 403,
      statusText: 'Unauthorized - you are not a member of this team'
    })
  }

  // Get team settings
  const settings = await useDB()
    .select()
    .from(teamSettings)
    .where(eq(teamSettings.teamId, teamId))
    .get()

  return {
    data: {
      translations: settings?.translations || {}
    }
  }
})
