import type { FeedbackSink } from './types'
import { webhookSink } from './webhook'

/**
 * The built-in sink registry. `webhook` is the default; the `slack` / `discord`
 * / `github` sinks are added here (test-first) in #964.
 */
const sinks: Record<string, FeedbackSink> = {
  webhook: webhookSink
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
