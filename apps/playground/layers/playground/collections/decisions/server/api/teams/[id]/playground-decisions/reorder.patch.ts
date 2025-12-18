// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { reorderSiblingsPlaygroundDecisions } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Validate input - expect array of { id, order }
  if (!Array.isArray(body.updates)) {
    throw createError({ statusCode: 400, statusMessage: 'updates must be an array' })
  }

  for (const update of body.updates) {
    if (!update.id || typeof update.order !== 'number') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Each update must have id and order (number)'
      })
    }
  }

  return await reorderSiblingsPlaygroundDecisions(team.id, body.updates)
})