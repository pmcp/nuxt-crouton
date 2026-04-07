// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createThinkgraphWatchedRepo } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  repo: z.string().min(1, 'repo is required'),
  branch: z.string().optional(),
  lastCheckedSha: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional()
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
  const result = await createThinkgraphWatchedRepo({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
  })
  dbTimer.end()
  return result
})