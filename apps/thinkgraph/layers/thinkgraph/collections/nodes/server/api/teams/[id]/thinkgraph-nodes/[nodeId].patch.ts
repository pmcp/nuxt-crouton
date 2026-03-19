// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphNode } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  canvasId: z.string().min(1, 'canvasId is required'),
  parentId: z.string().nullable().optional(),
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
}).partial().strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { nodeId } = getRouterParams(event)
  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Missing node ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphNode(nodeId, team.id, user.id, {
    canvasId: body.canvasId,
    parentId: body.parentId,
    nodeType: body.nodeType,
    status: body.status,
    title: body.title,
    brief: body.brief,
    output: body.output,
    handoffType: body.handoffType,
    handoffMeta: body.handoffMeta,
    contextScope: body.contextScope,
    contextNodeIds: body.contextNodeIds,
    notionTaskId: body.notionTaskId,
    worktree: body.worktree,
    sendTarget: body.sendTarget,
    sendMode: body.sendMode,
    injectMode: body.injectMode,
    origin: body.origin,
    stepIndex: body.stepIndex,
    skillVersion: body.skillVersion,
    tokenCount: body.tokenCount,
    userId: body.userId
  }, { role: membership.role })
  dbTimer.end()
  return result
})