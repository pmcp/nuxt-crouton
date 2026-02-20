/// <reference path="../../../crouton-hooks.d.ts" />
import { useNitroApp } from 'nitropack/runtime'

/**
 * Internal endpoint for Durable Object → Nitro hook bridging.
 *
 * Cloudflare Durable Objects run in a Workers-isolated environment where
 * `useNitroApp()` is not available. This endpoint accepts a POST from the DO
 * and re-emits the event into Nitro's hook system so downstream listeners
 * (e.g. crouton-events operation-listener) can persist it.
 *
 * This route is internal — never expose it to the public internet.
 * The DO calls it via `fetch('http://localhost/_crouton/operation', ...)`.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    type?: string
    source?: string
    teamId?: string
    userId?: string
    metadata?: Record<string, unknown>
  }

  if (!body.type) {
    throw createError({ status: 400, statusText: 'Missing type' })
  }

  useNitroApp().hooks.callHook('crouton:operation', {
    type: body.type,
    source: body.source ?? 'crouton-collab',
    teamId: body.teamId,
    metadata: body.metadata,
  }).catch(() => {})

  return { ok: true }
})
