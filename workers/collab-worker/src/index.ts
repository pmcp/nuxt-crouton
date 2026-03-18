/**
 * Standalone Cloudflare Worker that hosts the CollabRoom Durable Object.
 *
 * Pages projects cannot define DO classes directly — they reference DOs
 * from a separate Worker via `script_name` in their wrangler.toml.
 *
 * This worker:
 * 1. Re-exports the CollabRoom DO class (so Cloudflare can instantiate it)
 * 2. Provides a fetch handler that routes incoming requests to the correct DO instance
 *
 * Request flow:
 *   Pages middleware → DO binding (script_name: "thinkgraph-collab") → this worker → CollabRoom DO
 */

// Re-export the Durable Object class so Cloudflare registers it
export { CollabRoom } from '../../../packages/crouton-collab/server/durable-objects/CollabRoom'

interface Env {
  COLLAB_ROOMS: DurableObjectNamespace
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Extract roomKey from the URL path
    // Expected format: /{roomKey}/ws or /{roomKey}/state or /{roomKey}/users
    // The roomKey is URL-encoded and may contain colons (e.g., "flow:abc-123")
    const pathSegments = url.pathname.split('/').filter(Boolean)

    if (pathSegments.length < 2) {
      return new Response('Bad request: expected /{roomKey}/{action}', { status: 400 })
    }

    const roomKey = decodeURIComponent(pathSegments[0])
    const action = pathSegments[1] // ws, state, or users

    // Get the DO instance for this room
    const doId = env.COLLAB_ROOMS.idFromName(roomKey)
    const stub = env.COLLAB_ROOMS.get(doId)

    // Build a new URL that the DO expects: /{action}?{original query params}
    const doUrl = new URL(request.url)
    doUrl.pathname = `/${action}`

    // Forward the request to the Durable Object
    const doRequest = new Request(doUrl.toString(), request)
    return stub.fetch(doRequest)
  },
}
