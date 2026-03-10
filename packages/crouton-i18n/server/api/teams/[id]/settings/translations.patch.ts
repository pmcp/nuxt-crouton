import { eq } from 'drizzle-orm'
import { teamSettings } from '@fyit/crouton-core/server/database/schema/teamSettings'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { id: teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({
      status: 400,
      statusText: 'Team ID is required'
    })
  }
  // @ts-expect-error Nitro auto-import from crouton-auth
  const { user } = await requireUserSession(event)
  const body = await readBody(event)

  // Check if user is team admin or owner
  // @ts-expect-error Nitro auto-import from crouton-auth
  const hasAccess = await isTeamAdmin(teamId, user.id)
  if (!hasAccess) {
    throw createError({
      status: 403,
      statusText: 'Unauthorized - only team admins can modify translations'
    })
  }

  // Validate the translations structure
  if (body.translations && typeof body.translations !== 'object') {
    throw createError({
      status: 400,
      statusText: 'Invalid translations format'
    })
  }

  const db = useDB()

  // Check if settings exist
  const existingSettings = await db
    .select()
    .from(teamSettings)
    .where(eq(teamSettings.teamId as any, teamId))
    .get()

  if (existingSettings) {
    // Update existing settings
    await db
      .update(teamSettings)
      .set({
        translations: body.translations,
        updatedAt: new Date()
      } as any)
      .where(eq(teamSettings.teamId as any, teamId))
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
      } as any)
      .run()
  }

  return {
    success: true,
    message: 'Translations updated successfully'
  }
})
