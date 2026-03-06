// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentAgenda } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentAgenda } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { agendaId } = getRouterParams(event)
  if (!agendaId) {
    throw createError({ status: 400, statusText: 'Missing agenda ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentAgenda>>(event)

  const dbTimer = timing.start('db')
  const result = await updateContentAgenda(agendaId, team.id, user.id, {
    title: body.title,
    date: body.date ? new Date(body.date) : body.date,
    content: body.content,
    thumbnail: body.thumbnail,
    draft: body.draft
  }, { role: membership.role })
  dbTimer.end()
  return result
})