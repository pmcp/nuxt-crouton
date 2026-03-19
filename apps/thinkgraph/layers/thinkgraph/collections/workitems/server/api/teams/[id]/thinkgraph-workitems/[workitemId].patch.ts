// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphWorkItem } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { workitemId } = getRouterParams(event)
  if (!workitemId) {
    throw createError({ status: 400, statusText: 'Missing workitem ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody(event)

  // Pick only valid columns to avoid SQLite binding errors
  const ALLOWED_FIELDS = ['projectId', 'parentId', 'title', 'type', 'status', 'brief', 'output', 'assignee', 'provider', 'sessionId', 'worktree', 'deployUrl', 'skill', 'artifacts'] as const
  const updates: Record<string, any> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphWorkItem(workitemId, team.id, user.id, updates, { role: membership.role })
  dbTimer.end()
  return result
})