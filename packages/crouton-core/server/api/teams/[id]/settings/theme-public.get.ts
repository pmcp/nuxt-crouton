/**
 * GET /api/teams/[id]/settings/theme-public
 *
 * Public (no-auth) endpoint for reading team theme settings.
 * Used by useTeamTheme to fetch theme during SSR without requiring authentication,
 * so public pages can display correct team colors.
 */
import { useDB, eq } from '@fyit/crouton-auth/server/utils/database'
import { teamSettings } from '@fyit/crouton-auth/server/database/schema/auth'

export default defineEventHandler(async (event) => {
  const teamId = getRouterParam(event, 'id')
  if (!teamId) {
    throw createError({ status: 400, statusText: 'Team ID required' })
  }

  const db = useDB()
  const settings = await db
    .select({
      themeSettings: teamSettings.themeSettings
    })
    .from(teamSettings)
    .where(eq(teamSettings.teamId, teamId))
    .limit(1)

  return settings[0]?.themeSettings ?? {}
})
