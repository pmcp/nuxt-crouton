// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteKnowledgeBaseNote } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { noteId } = getRouterParams(event)
  if (!noteId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing note ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteKnowledgeBaseNote(noteId, team.id, user.id)
})