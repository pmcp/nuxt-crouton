/**
 * GET /api/teams/[id]/settings/theme
 *
 * Get team theme settings.
 * Accessible by any team member.
 */
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { useDB, eq } from '@fyit/crouton-auth/server/utils/database'
import { teamSettings } from '../../../../database/schema/teamSettings'

export default defineEventHandler(async (event) => {
  // Verify team membership (any role can view theme)
  const { team } = await resolveTeamAndCheckMembership(event)

  // Get team settings from database
  const db = useDB()
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
