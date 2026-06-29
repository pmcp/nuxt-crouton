import type { Annotation } from '../../overlay/capture'
import type { FeedbackSink } from './types'

/**
 * Build a Slack incoming-webhook payload (Block Kit). `text` is the notification
 * fallback; the blocks render the comment + the source file + the page. Pure, so
 * the shape is unit-testable without a network call.
 */
export function buildSlackPayload(a: Annotation): Record<string, unknown> {
  return {
    text: `🎯 Preview feedback: ${a.commentText}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🎯 Preview feedback', emoji: true } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*Comment:* ${a.commentText}`,
            `*Component:* \`${a.componentFile ?? 'unknown'}\``,
            `*Page:* \`${a.route}\``
          ].join('\n')
        }
      }
    ]
  }
}

/**
 * The **slack** sink — POST a Block Kit message to a Slack incoming webhook.
 * Configured via `croutonFeedback.slackUrl` (env `NUXT_CROUTON_FEEDBACK_SLACK_URL`).
 */
export const slackSink: FeedbackSink = async (annotation, _markdown, { config }) => {
  const url = typeof config.slackUrl === 'string' ? config.slackUrl.trim() : ''
  if (!url) {
    return { ok: false, error: 'Slack sink not configured: set NUXT_CROUTON_FEEDBACK_SLACK_URL.' }
  }

  try {
    await $fetch(url, { method: 'POST', body: buildSlackPayload(annotation) })
    return { ok: true }
  }
  catch (err) {
    const status = (err as { response?: { status?: number }, statusCode?: number })?.response?.status
      ?? (err as { statusCode?: number })?.statusCode
    return { ok: false, error: `Slack request failed${status ? ` (${status})` : ''}` }
  }
}
