import type { FeedbackSink } from './types'

/**
 * The **webhook** sink — POST the annotation + its Markdown as JSON to any URL.
 * The flexible default: n8n, Zapier, a custom endpoint, etc.
 *
 * Configured via `croutonFeedback.feedback.webhookUrl` (env
 * `NUXT_CROUTON_FEEDBACK_WEBHOOK_URL`). Provider-specific formatting
 * (Slack/Discord) and the GitHub bridge are separate sinks (#964).
 */
export const webhookSink: FeedbackSink = async (annotation, markdown, { config }) => {
  const url = typeof config.webhookUrl === 'string' ? config.webhookUrl.trim() : ''
  if (!url) {
    return {
      ok: false,
      error: 'Webhook sink not configured: set NUXT_CROUTON_FEEDBACK_WEBHOOK_URL '
        + '(or croutonFeedback.feedback.webhookUrl).'
    }
  }

  try {
    await $fetch(url, {
      method: 'POST',
      body: { annotation, markdown }
    })
    return { ok: true }
  }
  catch (err) {
    const status = (err as { response?: { status?: number }, statusCode?: number })?.response?.status
      ?? (err as { statusCode?: number })?.statusCode
    return { ok: false, error: `Webhook request failed${status ? ` (${status})` : ''}` }
  }
}
