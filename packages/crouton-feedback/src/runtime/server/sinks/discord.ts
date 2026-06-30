import type { Annotation } from '../../overlay/capture'
import type { FeedbackSink } from './types'

/**
 * Build a Discord webhook payload (an embed). Discord renders Markdown in the
 * embed description, so the comment + source file + page read cleanly. Pure, so
 * the shape is unit-testable without a network call.
 */
export function buildDiscordPayload(a: Annotation): Record<string, unknown> {
  return {
    embeds: [
      {
        title: '🎯 Preview feedback',
        description: [
          `**Comment:** ${a.commentText}`,
          `**Component:** \`${a.componentFile ?? 'unknown'}\``,
          `**Page:** \`${a.route}\``
        ].join('\n')
      }
    ]
  }
}

/**
 * The **discord** sink — POST an embed to a Discord webhook. Configured via
 * `croutonFeedback.discordUrl` (env `NUXT_CROUTON_FEEDBACK_DISCORD_URL`).
 */
export const discordSink: FeedbackSink = async (annotation, _markdown, { config }) => {
  const url = typeof config.discordUrl === 'string' ? config.discordUrl.trim() : ''
  if (!url) {
    return { ok: false, error: 'Discord sink not configured: set NUXT_CROUTON_FEEDBACK_DISCORD_URL.' }
  }

  try {
    await $fetch(url, { method: 'POST', body: buildDiscordPayload(annotation) })
    return { ok: true }
  }
  catch (err) {
    const status = (err as { response?: { status?: number }, statusCode?: number })?.response?.status
      ?? (err as { statusCode?: number })?.statusCode
    return { ok: false, error: `Discord request failed${status ? ` (${status})` : ''}` }
  }
}
