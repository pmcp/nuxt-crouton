import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../../../layers/thinkgraph/collections/decisions/server/database/queries'
import { getDispatchService, isServiceAvailable, ensureServicesLoaded } from '~~/server/utils/dispatch-registry'
import { buildDispatchContext } from '~~/server/utils/context-builder'

export default defineEventHandler(async (event) => {
  await ensureServicesLoaded()
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const decisionId = getRouterParam(event, 'decisionId')

  if (!decisionId) {
    throw createError({ status: 400, statusText: 'Decision ID required' })
  }

  const body = await readBody(event)
  const { serviceId, prompt, options } = body as {
    serviceId: string
    prompt?: string
    options?: Record<string, unknown>
  }

  if (!serviceId) {
    throw createError({ status: 400, statusText: 'serviceId is required' })
  }

  const service = getDispatchService(serviceId)
  if (!service) {
    throw createError({ status: 404, statusText: `Service "${serviceId}" not found` })
  }

  if (!isServiceAvailable(service, event)) {
    throw createError({ status: 403, statusText: `Service "${serviceId}" is not configured (missing API key)` })
  }

  const allDecisions = await getAllThinkgraphDecisions(team.id)
  const targetDecision = allDecisions.find((d: any) => d.id === decisionId)

  if (!targetDecision) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  const thinkingPath = buildDispatchContext(targetDecision, allDecisions)

  const result = await service.execute(
    {
      nodeContent: targetDecision.content,
      thinkingPath,
      prompt,
      options,
    },
    event
  )

  // Check if the result contains a tree structure (from agent services)
  const tree = (result as any)._tree as Array<{ content: string; nodeType: string; children?: any[] }> | undefined

  if (tree && tree.length > 0) {
    // Create summary node as direct child
    const summaryNode = await createThinkgraphDecision({
      content: result.childContent,
      nodeType: result.childNodeType,
      pathType: 'explored',
      parentId: decisionId,
      source: 'dispatch',
      model: serviceId,
      starred: false,
      branchName: '',
      versionTag: '',
      artifacts: result.artifacts,
      teamId: team.id,
      owner: user.id,
    } as any)

    // Recursively create tree nodes under the summary
    async function createTreeNodes(nodes: any[], parentId: string) {
      for (const node of nodes) {
        const created = await createThinkgraphDecision({
          content: node.content,
          nodeType: node.nodeType || 'insight',
          pathType: 'explored',
          parentId,
          source: 'dispatch',
          model: serviceId,
          starred: false,
          branchName: '',
          versionTag: '',
          artifacts: [],
          teamId: team.id,
          owner: user.id,
        } as any)

        if (node.children?.length) {
          await createTreeNodes(node.children, created.id)
        }
      }
    }

    await createTreeNodes(tree, summaryNode.id)
    return summaryNode
  }

  // Standard single-node creation
  const childNode = await createThinkgraphDecision({
    content: result.childContent,
    nodeType: result.childNodeType,
    pathType: 'explored',
    parentId: decisionId,
    source: 'dispatch',
    model: serviceId,
    starred: false,
    branchName: '',
    versionTag: '',
    artifacts: result.artifacts,
    teamId: team.id,
    owner: user.id,
  } as any)

  return childNode
})
