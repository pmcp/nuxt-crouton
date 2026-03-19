// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphWorkItem } from '../../../../database/queries'
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
  retrospective: z.string().optional(),
  artifacts: z.record(z.string(), z.any()).optional(),
  parentId: z.string().nullable().optional()
}).partial().strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { workItemId } = getRouterParams(event)
  if (!workItemId) {
    throw createError({ status: 400, statusText: 'Missing workitem ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphWorkItem(workItemId, team.id, user.id, {
    projectId: body.projectId,
    parentId: body.parentId,
    title: body.title,
    type: body.type,
    status: body.status,
    brief: body.brief,
    output: body.output,
    assignee: body.assignee,
    provider: body.provider,
    sessionId: body.sessionId,
    worktree: body.worktree,
    deployUrl: body.deployUrl,
    skill: body.skill,
    retrospective: body.retrospective,
    artifacts: body.artifacts
  }, { role: membership.role })
  dbTimer.end()
  return result
})