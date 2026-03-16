// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createThinkgraphInjectRequest } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  nodeId: z.string().min(1, 'nodeId is required'),
  fromUserId: z.string().optional(),
  content: z.string().min(1, 'content is required'),
  status: z.string().optional()
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body

  const dbTimer = timing.start('db')
  const result = await createThinkgraphInjectRequest({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()
  return result
})