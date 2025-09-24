import { eq } from 'drizzle-orm'
import { teamSettings } from '@@/server/database/schema/teams'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { id: teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team ID is required',
    })
  }
  const { user } = await requireUserSession(event)
  const body = await readBody(event)

  // Check if user is team admin or owner
  const hasAccess = await isTeamAdmin(teamId, user.id)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized - only team admins can modify translations'
    })
  }

  // Validate the translations structure
  if (body.translations && typeof body.translations !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid translations format'
    })
  }

  const db = useDB()

  // Check if settings exist
  const existingSettings = await db
    .select()
    .from(teamSettings)
    .where(eq(teamSettings.teamId, teamId))
    .get()

  if (existingSettings) {
    // Update existing settings
    await db
      .update(teamSettings)
      .set({
        translations: body.translations,
        updatedAt: new Date()
      })
      .where(eq(teamSettings.teamId, teamId))
      .run()
  } else {
    // Create new settings
    await db
      .insert(teamSettings)
      .values({
        id: nanoid(),
        teamId,
        translations: body.translations,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .run()
  }

  return {
    success: true,
    message: 'Translations updated successfully'
  }
})
