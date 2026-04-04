import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphNode, getAllThinkgraphNodes, getThinkgraphNodesByIds } from '../../../../../../layers/thinkgraph/collections/nodes/server/database/queries'
import { getDispatchService, isServiceAvailable, ensureServicesLoaded } from '~~/server/utils/dispatch-registry'
import { buildDispatchContext } from '~~/server/utils/context-builder'

export default defineEventHandler(async (event) => {
  await ensureServicesLoaded()
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const nodeId = getRouterParam(event, 'nodeId')

  if (!nodeId) {
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
  const allDecisionsUnfiltered = await getAllThinkgraphNodes(team.id)
  const targetDecision = allDecisionsUnfiltered.find((d: any) => d.id === nodeId)

  if (!targetDecision) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  // Dependency gate: check all dependsOn nodes are done
  const dependsOn = (targetDecision as any).dependsOn as string[] | undefined
  if (dependsOn?.length) {
    const depNodes = await getThinkgraphNodesByIds(dependsOn)
    const blocking = depNodes.filter((n: any) => n.status !== 'done')
    if (blocking.length > 0) {
      const blockingTitles = blocking.map((n: any) => n.title).join(', ')
      throw createError({
        status: 409,
        statusText: `Blocked by unfinished dependencies: ${blockingTitles}`,
      })
    }
  }

  const derivedGraphId = (targetDecision as any).graphId || ''
  const allDecisions = derivedGraphId
    ? await getAllThinkgraphNodes(team.id, derivedGraphId)
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
          nodeId: nodeId!,
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
      const summaryNode = await createThinkgraphNode({
        content: variations > 1 ? `[v${i + 1}] ${result.childContent}` : result.childContent,
        nodeType: result.childNodeType,
        pathType: 'explored',
        graphId: (targetDecision as any)?.graphId || '',
        parentId: nodeId,
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
          const created = await createThinkgraphNode({
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
      const childNode = await createThinkgraphNode({
        content: variations > 1 ? `[v${i + 1}] ${result.childContent}` : result.childContent,
        nodeType: result.childNodeType,
        pathType: 'explored',
        graphId: (targetDecision as any)?.graphId || '',
        parentId: nodeId,
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
