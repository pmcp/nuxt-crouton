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
  const { serviceId, prompt, options, count = 1 } = body as {
    serviceId: string
    prompt?: string
    options?: Record<string, unknown>
    count?: number
  }
  const variations = Math.min(Math.max(count, 1), 6) // clamp 1-6

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

  // First find the target to get its graphId, then re-fetch scoped to graph
  const allDecisionsUnfiltered = await getAllThinkgraphDecisions(team.id)
  const targetDecision = allDecisionsUnfiltered.find((d: any) => d.id === decisionId)

  if (!targetDecision) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  const derivedGraphId = (targetDecision as any).graphId || ''
  const allDecisions = derivedGraphId
    ? await getAllThinkgraphDecisions(team.id, derivedGraphId)
    : allDecisionsUnfiltered

  const thinkingPath = buildDispatchContext(targetDecision, allDecisions)

  const createdNodes: any[] = []

  for (let i = 0; i < variations; i++) {
    // Add variation instruction when generating multiple versions
    const variationPrompt = variations > 1
      ? `${prompt || ''}\n\n[Variation ${i + 1} of ${variations}: Take a distinctly different approach from previous variations. Be creative and explore a different angle, style, or strategy.]`.trim()
      : prompt

    const result = await service.execute(
      {
        nodeContent: targetDecision.content,
        thinkingPath,
        prompt: variationPrompt,
        options,
        _meta: {
          teamSlug: team.slug,
          teamId: team.id,
          graphId: (targetDecision as any).graphId || '',
          decisionId: decisionId!,
          allDecisions,
        },
      },
      event
    )

    // Async services (e.g. Claude Code) create nodes via MCP — no placeholder needed
    if ((result as any)._async) {
      return { async: true, serviceId }
    }

    // Check if the result contains a tree structure (from agent services)
    const tree = (result as any)._tree as Array<{ content: string; nodeType: string; children?: any[] }> | undefined

    if (tree && tree.length > 0) {
      const summaryNode = await createThinkgraphDecision({
        content: variations > 1 ? `[v${i + 1}] ${result.childContent}` : result.childContent,
        nodeType: result.childNodeType,
        pathType: 'explored',
        graphId: (targetDecision as any)?.graphId || '',
        parentId: decisionId,
        source: 'dispatch',
        model: serviceId,
        starred: false,
        branchName: '',
        versionTag: variations > 1 ? `v${i + 1}` : '',
        artifacts: result.artifacts,
        teamId: team.id,
        owner: user.id,
      } as any)

      async function createTreeNodes(nodes: any[], parentId: string) {
        for (const node of nodes) {
          const created = await createThinkgraphDecision({
            content: node.content,
            nodeType: node.nodeType || 'insight',
            pathType: 'explored',
            graphId: (targetDecision as any)?.graphId || '',
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
      createdNodes.push(summaryNode)
    } else {
      const childNode = await createThinkgraphDecision({
        content: variations > 1 ? `[v${i + 1}] ${result.childContent}` : result.childContent,
        nodeType: result.childNodeType,
        pathType: 'explored',
        graphId: (targetDecision as any)?.graphId || '',
        parentId: decisionId,
        source: 'dispatch',
        model: serviceId,
        starred: false,
        branchName: '',
        versionTag: variations > 1 ? `v${i + 1}` : '',
        artifacts: result.artifacts,
        teamId: team.id,
        owner: user.id,
      } as any)

      createdNodes.push(childNode)
    }
  }

  return variations > 1 ? createdNodes : createdNodes[0]
})
