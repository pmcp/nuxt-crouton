/**
 * GET /api/teams/[id]/settings/theme
 *
 * Get team theme settings.
 * Public endpoint — theme colors are not sensitive and are needed
 * during SSR before authentication is available.
 */
import { useDB, eq } from '@fyit/crouton-auth/server/utils/database'
import { teamSettings, organization } from '@fyit/crouton-auth/server/database/schema/auth'

export default defineEventHandler(async (event) => {
  const teamParam = getRouterParam(event, 'id')
  if (!teamParam) {
    throw createError({ status: 400, statusText: 'Team ID or slug is required' })
  }

  const db = useDB()

  // Resolve team by ID or slug
  const team = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, teamParam))
    .limit(1)
    .then(rows => rows[0])
    || await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, teamParam))
      .limit(1)
      .then(rows => rows[0])

  if (!team) {
    throw createError({ status: 404, statusText: 'Team not found' })
  }

  // Get team settings from database
  const settings = await db
    .select({
      themeSettings: teamSettings.themeSettings
    })
    .from(teamSettings)
    .where(eq(teamSettings.teamId, team.id))
    .limit(1)

  // Return theme settings or empty object if not set
  return settings[0]?.themeSettings ?? {}
})
