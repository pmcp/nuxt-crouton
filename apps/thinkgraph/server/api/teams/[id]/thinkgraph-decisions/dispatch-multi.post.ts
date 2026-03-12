import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../../layers/thinkgraph/collections/decisions/server/database/queries'
import { getDispatchService, isServiceAvailable, ensureServicesLoaded } from '~~/server/utils/dispatch-registry'
import { buildMultiNodeContext } from '~~/server/utils/context-builder'

export default defineEventHandler(async (event) => {
  await ensureServicesLoaded()
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)
  const { nodeIds, serviceId, prompt, options } = body as {
    nodeIds: string[]
    serviceId: string
    prompt?: string
    options?: Record<string, unknown>
  }

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

  const result = await service.execute(
    {
      nodeContent: combinedContent,
      thinkingPath: combinedContext,
      prompt,
      options,
    },
    event
  )

  // Connect to first source node via parentId, store all source IDs for extra edges
  const existingArtifacts = Array.isArray(result.artifacts) ? result.artifacts : []
  const childNode = await createThinkgraphDecision({
    content: result.childContent,
    nodeType: result.childNodeType,
    pathType: 'explored',
    parentId: nodeIds[0],
    source: 'dispatch',
    model: serviceId,
    starred: false,
    branchName: '',
    versionTag: '',
    artifacts: [...existingArtifacts, { type: 'synthesis', sourceNodeIds: nodeIds }],
    teamId: team.id,
    owner: user.id,
  } as any)

  return childNode
})
