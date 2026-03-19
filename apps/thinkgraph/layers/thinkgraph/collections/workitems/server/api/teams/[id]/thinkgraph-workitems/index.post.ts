// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createThinkgraphWorkItem, getThinkgraphWorkItemsByIds } from '../../../../database/queries'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  parentId: z.string().optional(),
  title: z.string().min(1, 'title is required'),
  type: z.string().min(1, 'type is required'),
  status: z.string().min(1, 'status is required'),
  brief: z.string().optional(),
  output: z.string().optional(),
  assignee: z.string().optional(),
  provider: z.string().optional(),
  sessionId: z.string().optional(),
  worktree: z.string().optional(),
  deployUrl: z.string().optional(),
  skill: z.string().optional(),
  artifacts: z.record(z.string(), z.any()).optional(),
  parentId: z.string().nullable().optional()
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // Exclude id field (we generate it for path calculation)
  const { id, ...dataWithoutId } = body

  // Generate ID upfront for correct path calculation
  const recordId = nanoid()

  // Calculate path based on parentId
  let path = `/${recordId}/`
  let depth = 0

  if (dataWithoutId.parentId) {
    const [parent] = await getThinkgraphWorkItemsByIds(team.id, [dataWithoutId.parentId])
    if (parent) {
      path = `${parent.path}${recordId}/`
      depth = (parent.depth || 0) + 1
    }
  }

  const dbTimer = timing.start('db')
  const result = await createThinkgraphWorkItem({
    ...dataWithoutId,
    id: recordId,
    path,
    depth,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()
  return result
})