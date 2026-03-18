/**
 * Production-only middleware that proxies collab requests to Durable Objects.
 *
 * In local dev (import.meta.dev), this middleware is skipped entirely —
 * the crossws handler in server/routes/api/collab/[roomId]/ws.ts handles everything.
 *
 * In production on Cloudflare Pages, the COLLAB_ROOMS binding is available
 * via event.context.cloudflare.env. This middleware intercepts collab paths
 * and forwards the raw Cloudflare Request to the correct DO instance,
 * preserving WebSocket upgrade headers.
 *
 * Matched paths:
 *   /api/collab/{roomId}/ws
 *   /api/collab/{roomId}/users
 *   /api/collab/{roomId}/state
 */
export default defineEventHandler(async (event) => {
  // Skip in local development — crossws handler handles everything
  if (import.meta.dev) return

  const path = getRequestURL(event).pathname

  // Only intercept collab API paths
  const match = path.match(/^\/api\/collab\/([^/]+)\/(ws|users|state)$/)
  if (!match) return

  // Check for Cloudflare runtime context with COLLAB_ROOMS binding
  // Type as `any` to avoid dependency on @cloudflare/workers-types in the Nitro server context
  const cf = (event.context as Record<string, any>).cloudflare as
    | { env?: Record<string, any>; request?: Request }
    | undefined

  const collabRooms = cf?.env?.COLLAB_ROOMS
  if (!collabRooms) {
    // No binding available — fall through to the regular route handlers
    // This happens if the app deploys without the collab worker configured
    return
  }

  const roomId = match[1]
  const action = match[2] // ws, users, or state

  // Build roomKey from query params (same format as useCollabConnection)
  const url = getRequestURL(event)
  const roomType = url.searchParams.get('type') || 'generic'
  const roomKey = `${roomType}:${roomId}`

  // Get DO stub via DurableObjectNamespace API
  const doId = collabRooms.idFromName(roomKey)
  const stub = collabRooms.get(doId)

  // Build the URL the DO expects: /{action}?{query params}
  // The DO's fetch handler routes on pathname (/ws, /state, /users)
  const doUrl = new URL(url.toString())
  doUrl.pathname = `/${action}`

  // Use the original Cloudflare Request to preserve WebSocket upgrade headers.
  // event.context.cloudflare.request is the raw CF Request object —
  // using it ensures the 101 WebSocket upgrade flows through correctly.
  const cfRequest = cf!.request
  if (!cfRequest) {
    // Fallback: construct from H3 event (won't support WebSocket upgrade)
    const doRequest = new Request(doUrl.toString(), {
      method: event.method,
      headers: getHeaders(event) as HeadersInit,
    })
    const response = await stub.fetch(doRequest)
    return sendWebResponse(event, response)
  }

  // Forward the original CF request with the DO's URL
  const doRequest = new Request(doUrl.toString(), cfRequest)
  const response = await stub.fetch(doRequest)

  // Return the raw Response — Cloudflare runtime handles 101 WebSocket natively
  return sendWebResponse(event, response)
})
