// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphNode, getThinkgraphNodesByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { resolveWikiLinksForNode } from '#server/utils/wiki-links'
import { z } from 'zod'

const bodySchema = z.object({
  projectId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  template: z.string().optional(),
  steps: z.array(z.string()).optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  status: z.string().optional(),
  brief: z.string().optional(),
  output: z.string().nullable().optional(),
  retrospective: z.string().nullable().optional(),
  content: z.any().nullable().optional(),
  assignee: z.string().optional(),
  provider: z.string().optional(),
  skill: z.string().optional(),
  sessionId: z.string().optional(),
  stage: z.string().nullable().optional(),
  signal: z.string().nullable().optional(),
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

  const { nodeId } = getRouterParams(event)
  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Missing node ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // Only include defined fields in the update
  const updates: Record<string, any> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, noChanges: true }
  }

  // Resolve [[wiki links]] in brief/output and merge into contextNodeIds
  if (updates.brief !== undefined || updates.output !== undefined) {
    const wikiTimer = timing.start('wiki-links')
    try {
      // Fetch existing node to get projectId and current content/context
      const [existingNode] = await getThinkgraphNodesByIds(team.id, [nodeId])
      if (existingNode) {
        const projectId = updates.projectId || existingNode.projectId
        const brief = updates.brief ?? existingNode.brief
        const output = updates.output ?? existingNode.output
        const existingContextIds = (updates.contextNodeIds ?? existingNode.contextNodeIds) as string[] | undefined

        const { contextNodeIds } = await resolveWikiLinksForNode(
          team.id,
          projectId,
          nodeId,
          brief,
          output,
          existingContextIds,
        )
        if (contextNodeIds.length > 0) {
          updates.contextNodeIds = contextNodeIds
        }
      }
    } catch {
      // Wiki link resolution is best-effort — don't block the save
    }
    wikiTimer.end()
  }

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphNode(nodeId, team.id, user.id, updates, { role: membership.role })
  dbTimer.end()
  return result
})
