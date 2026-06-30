import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { formatAnnotationMarkdown, type Annotation } from '../../overlay/capture'
import { resolveSink, registeredSinks } from '../sinks'
import type { FeedbackServerConfig } from '../sinks/types'

/**
 * Feedback dispatcher — `POST /api/_feedback`.
 *
 * Receives an `Annotation` from the Annotate tool, renders it to Markdown, then
 * hands both to the configured sink (webhook / slack / discord / github). The
 * sink decides where it lands; this handler only validates + dispatches.
 *
 * Config comes from server `runtimeConfig.croutonFeedback`, populated at runtime
 * from env so no credential ships in the bundle or reaches the client. Returns
 * `{ data, error }`; on failure `error` is a safe message that never echoes a
 * token or secret.
 */
type FeedbackBody = Partial<Annotation>

export default defineEventHandler(async (event) => {
  // Cast at the boundary: the monorepo resolves two h3 versions, so the H3Event
  // from defineEventHandler isn't nominally identical to useRuntimeConfig's.
  const config = (useRuntimeConfig(event as Parameters<typeof useRuntimeConfig>[0])
    .croutonFeedback || {}) as FeedbackServerConfig

  let body: FeedbackBody
  try {
    body = await readBody<FeedbackBody>(event)
  }
  catch {
    return { data: null, error: 'Invalid request body' }
  }

  if (!body?.commentText || !body?.route || !body?.cssSelector) {
    return { data: null, error: 'Missing required fields (commentText, route, cssSelector)' }
  }

  const sinkName = config.sink || 'webhook'
  const sink = resolveSink(sinkName)
  if (!sink) {
    return {
      data: null,
      error: `Unknown feedback sink '${sinkName}'. Available: ${registeredSinks().join(', ')}.`
    }
  }

  const markdown = formatAnnotationMarkdown(body as Annotation)

  try {
    const result = await sink(body as Annotation, markdown, { config, event })
    return result.ok
      ? { data: { ok: true, ...(result.data ?? {}) }, error: null }
      : { data: null, error: result.error || 'Feedback was not sent' }
  }
  catch {
    // A sink threw unexpectedly — never surface internals.
    return { data: null, error: 'Feedback dispatch failed' }
  }
})
