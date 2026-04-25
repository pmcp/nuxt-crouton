import type { H3Event } from 'h3'
import { getRequestHeader, getQuery, readBody, createError } from 'h3'

/**
 * Validate the public form token from (in order of precedence):
 *   1. x-kvr-token header
 *   2. ?t=<token> query string
 *   3. body.token field (reads body; only use on POST with JSON bodies)
 *
 * Throws 401 when invalid. Returns void on success.
 */
export async function requirePublicToken(event: H3Event, opts: { readBody?: boolean } = {}) {
  const config = useRuntimeConfig(event)
  const expected = (config.kvr as { publicToken?: string })?.publicToken
  if (!expected) {
    throw createError({ status: 503, statusText: 'Public submit not configured (missing NUXT_KVR_PUBLIC_TOKEN)' })
  }

  const headerToken = getRequestHeader(event, 'x-kvr-token')
  const queryToken = (getQuery(event).t as string | undefined) || undefined
  let bodyToken: string | undefined
  if (opts.readBody) {
    try {
      const body = await readBody(event)
      bodyToken = (body && typeof body === 'object' ? (body as any).token : undefined)
    }
    catch {
      // Non-JSON body (e.g., multipart). Caller handles body separately.
    }
  }

  const got = headerToken || queryToken || bodyToken
  if (!got || got !== expected) {
    // Use 403 (not 401) so crouton-auth's global 401 redirect plugin does not
    // send the visitor to /auth/login on an invalid share link.
    throw createError({ status: 403, statusText: 'Invalid or missing public token' })
  }
}
