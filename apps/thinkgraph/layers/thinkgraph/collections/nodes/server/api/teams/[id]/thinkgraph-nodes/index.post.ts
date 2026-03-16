// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createThinkgraphNode, getThinkgraphNodesByIds } from '../../../../database/queries'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  canvasId: z.string().min(1, 'canvasId is required'),
  parentId: z.string().optional(),
  nodeType: z.string().min(1, 'nodeType is required'),
  status: z.string().min(1, 'status is required'),
  title: z.string().min(1, 'title is required'),
  brief: z.string().optional(),
  output: z.string().optional(),
  handoffType: z.string().optional(),
  handoffMeta: z.record(z.string(), z.any()).optional(),
  contextScope: z.string().optional(),
  contextNodeIds: z.record(z.string(), z.any()).optional(),
  notionTaskId: z.string().optional(),
  worktree: z.string().optional(),
  sendTarget: z.string().optional(),
  sendMode: z.string().optional(),
  injectMode: z.string().optional(),
  origin: z.string().optional(),
  stepIndex: z.number().optional(),
  skillVersion: z.string().optional(),
  tokenCount: z.number().optional(),
  userId: z.string().optional(),
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
    const [parent] = await getThinkgraphNodesByIds(team.id, [dataWithoutId.parentId])
    if (parent) {
      path = `${parent.path}${recordId}/`
      depth = (parent.depth || 0) + 1
    }
  }

  const dbTimer = timing.start('db')
  const result = await createThinkgraphNode({
    ...dataWithoutId,
    id: recordId,
    path,
    depth,
    teamId: team.id,
    userId: user.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()
  return result
})