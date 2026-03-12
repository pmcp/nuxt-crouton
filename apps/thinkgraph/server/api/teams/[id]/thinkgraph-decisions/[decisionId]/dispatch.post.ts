import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../../../layers/thinkgraph/collections/decisions/server/database/queries'
import { getDispatchService, isServiceAvailable } from '~~/server/utils/dispatch-registry'
import { buildDispatchContext } from '~~/server/utils/context-builder'

// Import all services to register them
import '~~/server/utils/dispatch-services/dalle3'
import '~~/server/utils/dispatch-services/flux'
import '~~/server/utils/dispatch-services/lovable'
import '~~/server/utils/dispatch-services/v0'
import '~~/server/utils/dispatch-services/code'
import '~~/server/utils/dispatch-services/text'
import '~~/server/utils/dispatch-services/mermaid'

export default defineEventHandler(async (event) => {
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

  // Create child node with artifacts
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
