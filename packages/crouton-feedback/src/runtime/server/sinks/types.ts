import type { H3Event } from 'h3'
import type { Annotation } from '../../overlay/capture'

/** Server-side feedback config (populated from module options + env in #965). */
export interface FeedbackServerConfig {
  /** Which built-in sink receives a sent annotation. */
  sink?: string
  /** Generic webhook destination (the `webhook` sink). */
  webhookUrl?: string
  // Slack/Discord/GitHub routing fields are added by #964/#965.
  [key: string]: unknown
}

/** What a sink reports back to the dispatcher. */
export interface SinkResult {
  ok: boolean
  /** Safe, user-facing message on failure — never echo a token/secret. */
  error?: string
  /** Optional extra data surfaced to the client (e.g. a comment URL). */
  data?: Record<string, unknown>
}

/** Context handed to a sink: the resolved config + the request event. */
export interface SinkContext {
  config: FeedbackServerConfig
  event: H3Event
}

/**
 * A feedback destination. Given the structured annotation and its pre-rendered
 * Markdown, deliver it somewhere and report success/failure. The dispatcher
 * (`/api/_feedback`) resolves one by name and calls it.
 *
 * (The conceptual contract is `(annotation, markdown) => result`; `ctx` carries
 * the config + event a real sink needs — e.g. per-request env on Workers.)
 */
export type FeedbackSink = (
  annotation: Annotation,
  markdown: string,
  ctx: SinkContext
) => Promise<SinkResult>
