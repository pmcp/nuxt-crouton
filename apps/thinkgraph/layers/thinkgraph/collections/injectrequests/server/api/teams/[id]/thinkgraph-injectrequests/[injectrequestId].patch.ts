// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphInjectRequest } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  nodeId: z.string().min(1, 'nodeId is required'),
  fromUserId: z.string().optional(),
  content: z.string().min(1, 'content is required'),
  status: z.string().optional()
}).partial().strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { injectRequestId } = getRouterParams(event)
  if (!injectRequestId) {
    throw createError({ status: 400, statusText: 'Missing injectrequest ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphInjectRequest(injectRequestId, team.id, user.id, {
    nodeId: body.nodeId,
    fromUserId: body.fromUserId,
    content: body.content,
    status: body.status
  }, { role: membership.role })
  dbTimer.end()
  return result
})