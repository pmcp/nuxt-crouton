// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphProject } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1, 'name is required'),
  appId: z.string().optional(),
  repoUrl: z.string().optional(),
  deployUrl: z.string().optional(),
  status: z.string().min(1, 'status is required'),
  clientName: z.string().optional(),
  description: z.string().optional(),
  shareToken: z.string().optional()
}).partial().strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { projectId } = getRouterParams(event)
  if (!projectId) {
    throw createError({ status: 400, statusText: 'Missing project ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // Only include fields that were actually sent in the request
  const updates: Record<string, any> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphProject(projectId, team.id, user.id, updates, { role: membership.role })
  dbTimer.end()
  return result
})