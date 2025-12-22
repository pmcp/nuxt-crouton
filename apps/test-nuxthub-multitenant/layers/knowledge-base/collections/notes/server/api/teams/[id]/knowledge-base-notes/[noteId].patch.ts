// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateKnowledgeBaseNote } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { KnowledgeBaseNote } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { noteId } = getRouterParams(event)
  if (!noteId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing note ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<KnowledgeBaseNote>>(event)

  return await updateKnowledgeBaseNote(noteId, team.id, user.id, {
    id: body.id,
    title: body.title,
    content: body.content,
    category: body.category,
    tags: body.tags,
    isPinned: body.isPinned
  })
})