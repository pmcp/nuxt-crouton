import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../../layers/thinkgraph/collections/decisions/server/database/queries'
import { getDispatchService, isServiceAvailable, ensureServicesLoaded } from '~~/server/utils/dispatch-registry'
import { buildMultiNodeContext } from '~~/server/utils/context-builder'

export default defineEventHandler(async (event) => {
  await ensureServicesLoaded()
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)
  const { nodeIds, serviceId, prompt, options, count = 1 } = body as {
    nodeIds: string[]
    serviceId: string
    prompt?: string
    options?: Record<string, unknown>
    count?: number
  }
  const variations = Math.min(Math.max(count, 1), 6)

  if (!nodeIds?.length) {
    throw createError({ status: 400, statusText: 'nodeIds array is required' })
  }
  if (!serviceId) {
    throw createError({ status: 400, statusText: 'serviceId is required' })
  }

  const service = getDispatchService(serviceId)
  if (!service) {
    throw createError({ status: 404, statusText: `Service "${serviceId}" not found` })
  }
  if (!isServiceAvailable(service, event)) {
    throw createError({ status: 403, statusText: `Service "${serviceId}" is not configured` })
  }

  const allDecisions = await getAllThinkgraphDecisions(team.id)
  const targets = nodeIds
    .map(id => allDecisions.find((d: any) => d.id === id))
    .filter(Boolean) as any[]

  if (targets.length === 0) {
    throw createError({ status: 404, statusText: 'No matching decisions found' })
  }

  const { combinedContext, combinedContent } = buildMultiNodeContext(targets, allDecisions)

  const createdNodes: any[] = []

  for (let i = 0; i < variations; i++) {
    const variationPrompt = variations > 1
      ? `${prompt || ''}\n\n[Variation ${i + 1} of ${variations}: Take a distinctly different approach from previous variations. Be creative and explore a different angle, style, or strategy.]`.trim()
      : prompt

    const result = await service.execute(
      {
        nodeContent: combinedContent,
        thinkingPath: combinedContext,
        prompt: variationPrompt,
        options,
      },
      event
    )

    // Connect to first source node via parentId, store all source IDs for extra edges
    const existingArtifacts = Array.isArray(result.artifacts) ? result.artifacts : []
    const childNode = await createThinkgraphDecision({
      content: variations > 1 ? `[v${i + 1}] ${result.childContent}` : result.childContent,
      nodeType: result.childNodeType,
      pathType: 'explored',
      graphId: targets[0]?.graphId || '',
      parentId: nodeIds[0],
      source: 'dispatch',
      model: serviceId,
      starred: false,
      branchName: '',
      versionTag: variations > 1 ? `v${i + 1}` : '',
      artifacts: [...existingArtifacts, { type: 'synthesis', sourceNodeIds: nodeIds }],
      teamId: team.id,
      owner: user.id,
    } as any)

    createdNodes.push(childNode)
  }

  return variations > 1 ? createdNodes : createdNodes[0]
})
