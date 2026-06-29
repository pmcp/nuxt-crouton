/**
 * @fyit/crouton-analytics — D1 self-host sink (#968), pure logic.
 *
 * The self-host / "stays in GitHub" path: usage events written to our own D1 table instead of a
 * third party. Because usage events come from ANONYMOUS visitors, the ingest endpoint is PUBLIC —
 * so this validation/mapping is the security boundary, and it's hand-written logic → unit-tested
 * (#774). The server endpoint stays thin and delegates here.
 *
 * No Nuxt imports (framework-agnostic, like analytics-core). The endpoint injects server-owned
 * context (id, timestamp, teamId, version); the client beacon injects only event + props.
 */
import type { AnalyticsProvider, AnalyticsProps, CroutonAnalyticsEvent } from './analytics-core'

/** The only event names a public endpoint will accept (the lean-loop set, #949). */
export const KNOWN_ANALYTICS_EVENTS = ['pageview', 'poc_first_visit', 'cta_click', 'signup', 'key_action'] as const

export const MAX_PROPS_KEYS = 50
export const MAX_PROPS_BYTES = 4096

/** Untrusted ingest payload from the client beacon. id/teamId/timestamp here are IGNORED. */
export interface AnalyticsIngestInput {
  event?: unknown
  props?: AnalyticsProps
  sessionId?: unknown
  path?: unknown
  [k: string]: unknown
}

/** Server-owned context the endpoint injects — never client-controlled. */
export interface AnalyticsRowContext {
  id: string
  now: number
  teamId: string
  version?: string
}

export interface AnalyticsRow {
  id: string
  timestamp: number
  teamId: string
  event: string
  props: AnalyticsProps
  sessionId: string | null
  path: string | null
  version: string | null
}

export class AnalyticsIngestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalyticsIngestError'
  }
}

export function isKnownEvent(name: unknown): name is CroutonAnalyticsEvent {
  return typeof name === 'string' && (KNOWN_ANALYTICS_EVENTS as readonly string[]).includes(name)
}

/**
 * Validate + sanitize an untrusted ingest payload. Rejects anything a public endpoint shouldn't
 * store: unknown/empty event names, and props that are too many or too large. Strips a
 * client-supplied `version` (server owns it). Throws AnalyticsIngestError on reject.
 */
export function validateAnalyticsIngest(input: AnalyticsIngestInput): {
  event: string
  props: AnalyticsProps
  sessionId: string | null
  path: string | null
} {
  if (!isKnownEvent(input.event)) {
    throw new AnalyticsIngestError(`unknown event: ${String(input.event)}`)
  }
  const rawProps = (input.props && typeof input.props === 'object') ? input.props : {}
  // Server owns the version dimension — never trust a client-supplied one.
  const { version: _ignored, ...props } = rawProps
  if (Object.keys(props).length > MAX_PROPS_KEYS) {
    throw new AnalyticsIngestError('too many props')
  }
  if (JSON.stringify(props).length > MAX_PROPS_BYTES) {
    throw new AnalyticsIngestError('props too large')
  }
  return {
    event: input.event,
    props,
    sessionId: typeof input.sessionId === 'string' ? input.sessionId : null,
    path: typeof input.path === 'string' ? input.path : null,
  }
}

/**
 * Build the DB row. The server owns `id`/`timestamp`/`teamId`/`version` via `ctx` — any of those
 * supplied by the client are ignored (can't be spoofed).
 */
export function toAnalyticsRow(input: AnalyticsIngestInput, ctx: AnalyticsRowContext): AnalyticsRow {
  const clean = validateAnalyticsIngest(input)
  return {
    id: ctx.id,
    timestamp: ctx.now,
    teamId: ctx.teamId,
    event: clean.event,
    props: clean.props,
    sessionId: clean.sessionId,
    path: clean.path,
    version: ctx.version ?? null,
  }
}

/** Client provider — beacon each event to the injected sender (e.g. navigator.sendBeacon). */
export function createD1Provider(
  send: (payload: { event: string, props: AnalyticsProps }) => void,
): AnalyticsProvider {
  return {
    id: 'd1',
    track: (event, props = {}) => send({ event, props }),
  }
}
