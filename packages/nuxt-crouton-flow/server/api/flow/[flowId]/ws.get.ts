/**
 * WebSocket endpoint that proxies to Durable Object
 *
 * Route: GET /api/flow/:flowId/ws?collection=decisions
 */
export default defineEventHandler(async (event) => {
  const flowId = getRouterParam(event, 'flowId')
  const collection = getQuery(event).collection as string

  if (!flowId || !collection) {
    throw createError({
      statusCode: 400,
      message: 'flowId and collection are required',
    })
  }

  // Get Cloudflare env from context
  const env = event.context.cloudflare?.env

  if (!env?.FLOW_ROOMS) {
    throw createError({
      statusCode: 500,
      message: 'Durable Objects not configured',
    })
  }

  // Get or create Durable Object for this flow
  const id = env.FLOW_ROOMS.idFromName(flowId)
  const stub = env.FLOW_ROOMS.get(id)

  // Forward request to Durable Object
  const url = new URL(event.node.req.url!, 'https://placeholder')
  url.pathname = '/ws'
  url.searchParams.set('flowId', flowId)
  url.searchParams.set('collection', collection)

  return stub.fetch(url.toString(), {
    headers: event.node.req.headers as HeadersInit,
  })
})
