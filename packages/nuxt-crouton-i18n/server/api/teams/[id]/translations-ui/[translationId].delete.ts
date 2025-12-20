/**
 * DELETE /api/teams/[id]/translations-ui/[translationId]
 * Delete a team-specific translation override (reverts to system translation)
 */
export default defineEventHandler(async (event) => {
  const translationId = getRouterParam(event, 'translationId')

  if (!translationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Translation ID is required'
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

  // Verify the translation belongs to this team
  await verifyTeamTranslation(translationId, team.id)

  return await deleteTranslation(translationId)
})
