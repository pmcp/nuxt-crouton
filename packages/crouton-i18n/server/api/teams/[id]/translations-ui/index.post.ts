/**
 * POST /api/teams/[id]/translations-ui
 * Create a new team-specific translation override
 *
 * Body:
 * - keyPath: string (required)
 * - category: string (required)
 * - values: Record<string, string> (required)
 * - description: string (optional)
 * - namespace: string (optional, default 'ui')
 */
export default defineEventHandler(async (event) => {
  // Get team and verify membership (admin required for creating)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  // TODO: Add admin check when isTeamAdmin is available
  // const isAdmin = await isTeamAdmin(team.id, user.id)
  // if (!isAdmin) {
  //   throw createError({
  //     status: 403,
  //     statusText: 'Unauthorized - admin access required'
  //   })
  // }

  const body = await readBody(event)

  // Validate required fields
  if (!body.keyPath || !body.category || !body.values) {
    throw createError({
      status: 400,
      statusText: 'Missing required fields: keyPath, category, values'
    })
  }

  // Check if this is overriding a system translation
  const systemTranslation = await getSystemTranslationByKeyPath(
    body.keyPath,
    body.namespace || 'ui'
  )

  // If system translation exists and is not overrideable, reject
  if (systemTranslation && !systemTranslation.isOverrideable) {
    throw createError({
      status: 403,
      statusText: 'This system translation cannot be overridden'
    })
  }

  // Create team-specific translation
  const newTranslation = {
    userId: user.id,
    teamId: team.id,
    namespace: body.namespace || 'ui',
    keyPath: body.keyPath,
    category: body.category,
    values: body.values,
    description: body.description || null,
    isOverrideable: true // Team translations are always overrideable
  }

  try {
    return await createTranslation(newTranslation)
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw createError({
        status: 409,
        statusText: 'A translation with this keyPath already exists for this team'
      })
    }
    throw error
  }
})
