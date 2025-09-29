import { eq } from 'drizzle-orm'
import { teamSettings } from '@friendlyinternet/nuxt-crouton/server/database/schema/teamSettings'

export default defineEventHandler(async (event) => {
  const { id: teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team ID is required',
    })
  }
  const { user } = await requireUserSession(event)

  // Check if user has access to this team
  const hasAccess = await isTeamMember(teamId, user.id)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized - you are not a member of this team'
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
