/**
 * PATCH /api/teams/[id]/settings/notion
 *
 * Update team Notion integration settings.
 * Merges with existing settings (does not overwrite unset fields).
 * Requires team admin or owner role.
 */
import { z } from 'zod'
import { requireTeamAdmin } from '@fyit/crouton-auth/server/utils/team'
import { useDB, eq } from '@fyit/crouton-auth/server/utils/database'
import { teamSettings, type TeamNotionSettings } from '@fyit/crouton-auth/server/database/schema/auth'

const statusMappingSchema = z.object({
  idle: z.string().max(100).optional(),
  working: z.string().max(100).optional(),
  done: z.string().max(100).optional()
}).strict()

const notionSettingsSchema = z.object({
  integrationToken: z.string().max(500).optional(),
  taskDatabaseId: z.string().max(200).optional(),
  statusMapping: statusMappingSchema.optional()
}).strict()

export default defineEventHandler(async (event) => {
  const { team } = await requireTeamAdmin(event)

  const body = await readBody(event)
  const result = notionSettingsSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      status: 400,
      statusText: 'Invalid Notion settings',
      message: result.error.issues.map(i => i.message).join(', ')
    })
  }

  const patch = result.data
  const db = useDB()

  // Read existing settings
  const existing = await db
    .select()
    .from(teamSettings)
    .where(eq(teamSettings.teamId, team.id))
    .limit(1)

  const currentNotion: TeamNotionSettings = existing[0]?.notionSettings ?? {}

  // Merge patch into existing settings
  const merged: TeamNotionSettings = { ...currentNotion }

  if (patch.integrationToken !== undefined) {
    merged.integrationToken = patch.integrationToken
    // Create a hint for display (show first 10 and last 4 chars)
    if (patch.integrationToken) {
      const token = patch.integrationToken
      merged.integrationTokenHint = token.length > 14
        ? `${token.slice(0, 10)}...${token.slice(-4)}`
        : '***'
    } else {
      merged.integrationTokenHint = undefined
    }
  }

  if (patch.taskDatabaseId !== undefined) {
    merged.taskDatabaseId = patch.taskDatabaseId
  }

  if (patch.statusMapping !== undefined) {
    merged.statusMapping = {
      ...currentNotion.statusMapping,
      ...patch.statusMapping
    }
  }

  // Upsert
  if (existing.length > 0) {
    await db
      .update(teamSettings)
      .set({
        notionSettings: merged,
        updatedAt: new Date()
      })
      .where(eq(teamSettings.teamId, team.id))
  } else {
    await db.insert(teamSettings).values({
      teamId: team.id,
      notionSettings: merged
    })
  }

  // Return safe response (no raw token)
  return {
    taskDatabaseId: merged.taskDatabaseId ?? null,
    integrationTokenHint: merged.integrationTokenHint ?? null,
    statusMapping: merged.statusMapping ?? null
  }
})
