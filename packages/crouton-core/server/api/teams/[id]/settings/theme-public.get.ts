/**
 * GET /api/teams/[id]/settings/theme-public
 *
 * Public (no-auth) endpoint for reading team theme settings.
 * Used by useTeamTheme to fetch theme during SSR without requiring authentication,
 * so public pages can display correct team colors.
 */
import { useDB, eq, or } from '@fyit/crouton-auth/server/utils/database'
import { teamSettings, organization } from '@fyit/crouton-auth/server/database/schema/auth'

export default defineEventHandler(async (event) => {
  const teamIdOrSlug = getRouterParam(event, 'id')
  if (!teamIdOrSlug) {
    throw createError({ status: 400, statusText: 'Team ID required' })
  }

  // Resolve by ID or slug (route param could be either)
  const db = useDB()
  const settings = await db
    .select({
      themeSettings: teamSettings.themeSettings
    })
    .from(teamSettings)
    .innerJoin(organization, eq(teamSettings.teamId, organization.id))
    .where(or(eq(organization.id, teamIdOrSlug), eq(organization.slug, teamIdOrSlug)))
    .limit(1)

  return settings[0]?.themeSettings ?? {}
})
