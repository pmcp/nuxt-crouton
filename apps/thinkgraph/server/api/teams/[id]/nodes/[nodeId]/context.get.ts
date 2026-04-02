import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { buildNodeContext } from '~~/server/utils/context-builder'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const nodeId = getRouterParam(event, 'nodeId')

  if (!nodeId) {
    throw createError({ status: 400, statusText: 'nodeId is required' })
  }

  // Load all nodes for context walking (scoped to team)
  const allNodes = await getAllThinkgraphNodes(team.id)

  const payload = buildNodeContext(
    allNodes.map((n: any) => ({
      id: n.id,
      parentId: n.parentId,
      title: n.title,
      nodeType: n.nodeType || n.template,
      status: n.status,
      summary: n.summary,
      brief: n.brief,
      output: n.output,
      pinned: n.pinned,
      contextScope: n.contextScope,
      contextNodeIds: n.contextNodeIds,
    })),
    nodeId,
  )

  return payload
})
