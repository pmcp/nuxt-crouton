/**
 * PATCH /api/teams/[id]/translations-ui/[translationId]
 * Update a team-specific translation override
 *
 * Body:
 * - values: Record<string, string> (optional)
 * - description: string (optional)
 */
export default defineEventHandler(async (event) => {
  const translationId = getRouterParam(event, 'translationId')

  if (!translationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Translation ID is required',
    })
  }

  // Get team and verify membership
  const { team, user } = await resolveTeamAndCheckMembership(event)

  // TODO: Add admin check when isTeamAdmin is available
  // const isAdmin = await isTeamAdmin(team.id, user.id)
  // if (!isAdmin) {
  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: 'Unauthorized - admin access required'
  //   })
  // }

  const body = await readBody(event)

  // Verify the translation belongs to this team
  await verifyTeamTranslation(translationId, team.id)

  // Update translation - for teams, only allow updating values and description
  const updateData = {
    ...(body.values && { values: body.values }),
    ...(body.description !== undefined && { description: body.description }),
    // Don't allow teams to update category, keyPath, or isOverrideable
  }

  return await updateTranslation(translationId, updateData)
})
