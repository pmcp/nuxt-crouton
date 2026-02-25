/**
 * PATCH /api/teams/[id]/settings/site
 *
 * Update team site settings.
 * Requires team admin or owner role.
 */
import { z } from 'zod'
import { requireTeamAdmin } from '@fyit/crouton-auth/server/utils/team'
import { useDB, eq } from '@fyit/crouton-auth/server/utils/database'
import { teamSettings, type TeamSiteSettings } from '@fyit/crouton-auth/server/database/schema/auth'

// Validation schema for site settings
const siteSettingsSchema = z.object({
  publicSiteEnabled: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  // Require admin or owner role
  const { team } = await requireTeamAdmin(event)

  // Validate request body
  const body = await readBody(event)
  const result = siteSettingsSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      status: 400,
      statusText: 'Invalid site settings',
      message: result.error.issues.map(i => i.message).join(', ')
    })
  }

  const siteData: TeamSiteSettings = result.data

  // Get existing settings or create new
  const db = useDB()
  const existing = await db
    .select()
    .from(teamSettings)
    .where(eq(teamSettings.teamId, team.id))
    .limit(1)

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(teamSettings)
      .set({
        siteSettings: siteData,
        updatedAt: new Date()
      })
      .where(eq(teamSettings.teamId, team.id))
  } else {
    // Insert new record
    await db.insert(teamSettings).values({
      teamId: team.id,
      siteSettings: siteData
    })
  }

  return siteData
})
