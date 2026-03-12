// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphGraph } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ThinkgraphGraph } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { graphId } = getRouterParams(event)
  if (!graphId) {
    throw createError({ status: 400, statusText: 'Missing graph ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ThinkgraphGraph>>(event)

  const updates = Object.fromEntries(
    Object.entries({
      name: body.name,
      description: body.description
    }).filter(([, v]) => v !== undefined)
  )

  if (Object.keys(updates).length === 0) {
    throw createError({ status: 400, statusText: 'No valid fields to update' })
  }

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphGraph(graphId, team.id, user.id, updates, { role: membership.role })
  dbTimer.end()
  return result
})