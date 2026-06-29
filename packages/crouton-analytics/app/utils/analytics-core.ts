/**
 * @fyit/crouton-analytics — framework-agnostic core.
 *
 * Pure logic with NO Nuxt imports: provider resolution, version enrichment, and the
 * track/pageview/identify orchestration. The `useCroutonAnalytics()` composable injects the
 * runtime context (config, opt-out state, an event sink, the PostHog loader, the version-lock
 * id) into `createTracker()`. Keeping this layer Nuxt-free is what makes it unit-testable (#946)
 * and what lets the backend be a swappable PROVIDER rather than a hardcoded SDK (the no-lock-in
 * thesis).
 */

/** The default lean-loop event set every POC inherits — tiny + stable (#949). */
export type CroutonAnalyticsEvent =
  | 'pageview'
  | 'poc_first_visit'
  | 'cta_click'
  | 'signup'
  | 'key_action'

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

export interface AnalyticsProvider {
  id: string
  track: (event: string, props?: AnalyticsProps) => void
  identify?: (distinctId: string, traits?: AnalyticsProps) => void
}

export interface AnalyticsConfig {
  provider?: 'noop' | 'console' | 'posthog'
  /** Version-lock / experiment id (#951) — when set, stamped on every event. */
  version?: string
  posthog?: { key?: string, host?: string }
}

/** Minimal shape of the PostHog client (e.g. the @nuxt/scripts proxy). */
export interface PostHogClient {
  capture: (event: string, props?: AnalyticsProps) => void
  identify?: (distinctId: string, traits?: AnalyticsProps) => void
}

export interface ResolveDeps {
  /** Sink for the console provider — receives every recorded event (logger + on-screen buffer). */
  sink?: (rec: { event: string, props: AnalyticsProps }) => void
  /** Lazy PostHog client loader (e.g. @nuxt/scripts useScriptPostHog). Returns undefined if unavailable. */
  posthogLoader?: () => PostHogClient | undefined
}

export function createNoopProvider(): AnalyticsProvider {
  return { id: 'noop', track: () => {} }
}

export function createConsoleProvider(
  sink?: (rec: { event: string, props: AnalyticsProps }) => void,
): AnalyticsProvider {
  return {
    id: 'console',
    track: (event, props = {}) => sink?.({ event, props }),
    identify: () => {},
  }
}

export function createPostHogProvider(client: PostHogClient): AnalyticsProvider {
  return {
    id: 'posthog',
    track: (event, props) => client.capture(event, props),
    identify: (distinctId, traits) => client.identify?.(distinctId, traits),
  }
}

/**
 * Pick the active provider from config. ALWAYS degrades to no-op rather than throwing — an
 * unconfigured (or misconfigured) app must still boot clean, and `posthog` with no loader
 * available falls back silently instead of crashing the app.
 */
export function resolveProvider(config: AnalyticsConfig | undefined, deps: ResolveDeps = {}): AnalyticsProvider {
  switch (config?.provider) {
    case 'console':
      return createConsoleProvider(deps.sink)
    case 'posthog': {
      const client = deps.posthogLoader?.()
      return client ? createPostHogProvider(client) : createNoopProvider()
    }
    case 'noop':
    default:
      return createNoopProvider()
  }
}

/**
 * Stamp the version-lock id (#951) onto an event's props. The version is SYSTEM metadata and is
 * authoritative — it overrides any caller-supplied `version` prop so the attribution dimension
 * ("which change moved this metric?") can't be silently corrupted by app code. When no version is
 * set, props pass through unchanged.
 */
export function withVersion(props: AnalyticsProps, version?: string): AnalyticsProps {
  return version ? { ...props, version } : props
}

export interface TrackerOptions {
  provider: AnalyticsProvider
  isOptedOut: () => boolean
  version?: string
}

export interface Tracker {
  track: (event: CroutonAnalyticsEvent | (string & {}), props?: AnalyticsProps) => void
  pageview: (path?: string) => void
  identify: (distinctId: string, traits?: AnalyticsProps) => void
}

/** The orchestration: opt-out gating + version enrichment in front of a provider. */
export function createTracker(opts: TrackerOptions): Tracker {
  const { provider, isOptedOut, version } = opts

  function track(event: CroutonAnalyticsEvent | (string & {}), props: AnalyticsProps = {}) {
    if (isOptedOut()) return
    provider.track(event, withVersion(props, version))
  }

  return {
    track,
    pageview: (path?: string) => track('pageview', { path }),
    identify: (distinctId: string, traits: AnalyticsProps = {}) => {
      if (isOptedOut()) return
      provider.identify?.(distinctId, withVersion(traits, version))
    },
  }
}
