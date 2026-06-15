// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createThinkgraphNode, getThinkgraphNodesByIds } from '../../../../database/queries'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'
import { detectTemplate } from '~~/server/utils/template-detector'

const bodySchema = z.object({
  projectId: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  template: z.string().optional(),
  steps: z.array(z.string()).optional(),
  title: z.string().min(1, 'title is required'),
  summary: z.string().optional(),
  status: z.string().optional().default('idle'),
  brief: z.string().optional(),
  output: z.string().optional(),
  retrospective: z.string().optional(),
  assignee: z.string().optional(),
  provider: z.string().optional(),
  skill: z.string().optional(),
  sessionId: z.string().optional(),
  stage: z.string().optional(),
  signal: z.string().optional(),
  starred: z.boolean().optional(),
  pinned: z.boolean().optional(),
  origin: z.string().optional(),
  contextScope: z.string().optional(),
  contextNodeIds: z.array(z.string()).nullable().optional(),
  worktree: z.string().optional(),
  deployUrl: z.string().optional(),
  artifacts: z.any().optional(),
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // Auto-detect template from title + brief if not explicitly provided
  if (!body.template) {
    const detected = detectTemplate(body.title, body.brief || undefined)
    body.template = detected.template
    if (!body.steps) {
      body.steps = detected.steps
    }
  }

  // Exclude id field (we generate it for path calculation)
  const { id, ...dataWithoutId } = body as any

  // Generate ID upfront for correct path calculation
  const recordId = nanoid()

  // Calculate path based on parentId + inherit projectId if missing
  let path = `/${recordId}/`
  let depth = 0

  if (dataWithoutId.parentId) {
    const [parent] = await getThinkgraphNodesByIds(team.id, [dataWithoutId.parentId])
    if (parent) {
      path = `${parent.path}${recordId}/`
      depth = (parent.depth || 0) + 1
      // Inherit projectId from parent if not provided
      if (!dataWithoutId.projectId && parent.projectId) {
        dataWithoutId.projectId = parent.projectId
      }
    }
  }

  if (!dataWithoutId.projectId) {
    throw createError({ status: 400, statusText: 'projectId is required (provide it directly or via parentId)' })
  }

  const dbTimer = timing.start('db')
  const result = await createThinkgraphNode({
    ...dataWithoutId,
    id: recordId,
    path,
    depth,
    teamId: team.id,
    owner: user.id,
  } as any)
  dbTimer.end()
  return result
})
