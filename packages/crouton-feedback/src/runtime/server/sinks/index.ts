import type { FeedbackSink } from './types'
import { webhookSink } from './webhook'
import { slackSink } from './slack'
import { discordSink } from './discord'
import { githubSink } from './github'

/**
 * The built-in sink registry. `webhook` is the default; `slack` / `discord` post
 * a formatted message to a channel webhook; `github` posts an issue/PR comment.
 */
const sinks: Record<string, FeedbackSink> = {
  webhook: webhookSink,
  slack: slackSink,
  discord: discordSink,
  github: githubSink
}

/** Resolve a sink by name. Returns null for an unknown/unregistered name. */
export function resolveSink(name?: string): FeedbackSink | null {
  return sinks[name || 'webhook'] ?? null
}

/** Names of the registered sinks (for diagnostics). */
export function registeredSinks(): string[] {
  return Object.keys(sinks)
}

export type { FeedbackSink } from './types'
