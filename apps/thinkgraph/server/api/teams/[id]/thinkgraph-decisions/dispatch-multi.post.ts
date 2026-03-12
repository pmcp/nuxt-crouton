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

  // Create result as a root node (multi-select has no single parent)
  const childNode = await createThinkgraphDecision({
    content: result.childContent,
    nodeType: result.childNodeType,
    pathType: 'explored',
    parentId: '',
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
