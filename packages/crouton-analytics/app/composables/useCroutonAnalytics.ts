/**
 * useCroutonAnalytics — the public composable (the #946 API).
 *
 * A THIN Nuxt wrapper: it injects runtime context (config, opt-out state, an on-screen event
 * buffer, the @nuxt/scripts PostHog loader, the version-lock id) into the framework-agnostic
 * core (`analytics-core.ts`). All real logic lives in the core and is unit-tested there.
 *
 *   const { track, pageview, identify, optOut } = useCroutonAnalytics()
 *   track('cta_click', { surface: 'landing' })   // no vendor SDK imported → swappable backend
 */
import {
  resolveProvider,
  createTracker,
  type AnalyticsConfig,
  type AnalyticsProvider,
  type AnalyticsProps,
  type PostHogClient,
} from '../utils/analytics-core'

export interface RecordedEvent { event: string, props: AnalyticsProps, at: string }

export function useCroutonAnalytics() {
  // Nuxt widens runtimeConfig default values (e.g. provider literal → string) in its generated
  // types, so cast the raw runtime value back to the declared contract at this single boundary.
  const config = useRuntimeConfig().public.croutonAnalytics as AnalyticsConfig | undefined
  const optedOut = useState<boolean>('crouton-analytics-optout', () => false)
  // Only plain, serializable data goes in useState — the event buffer, never the provider.
  const events = useState<RecordedEvent[]>('crouton-analytics-events', () => [])

  // The provider holds functions, so it must NOT be serialized into the SSR payload (devalue
  // throws on functions). Cache it on the Nuxt app instance — per-request on the server,
  // persistent on the client.
  const nuxtApp = useNuxtApp() as unknown as { _croutonAnalyticsProvider?: AnalyticsProvider }
  if (!nuxtApp._croutonAnalyticsProvider) {
    nuxtApp._croutonAnalyticsProvider = resolveProvider(config, {
      sink: (rec) => {
        if (import.meta.dev) console.info('[crouton-analytics]', rec.event, rec.props)
        events.value = [{ ...rec, at: new Date().toISOString() }, ...events.value].slice(0, 50)
      },
      posthogLoader: () => {
        // @nuxt/scripts auto-imports useScriptPostHog when the module is registered + keyed.
        const loader = (globalThis as Record<string, unknown>).useScriptPostHog as
          | (() => { proxy: PostHogClient })
          | undefined
        if (typeof loader !== 'function') return undefined
        return loader().proxy
      },
    })
  }

  // Version-lock id (#951) — loose, optional. Read from analytics config for now; the version-lock
  // work will wire the real source here. Absent → events carry no version (degrades cleanly).
  const version = config?.version

  const tracker = createTracker({
    provider: nuxtApp._croutonAnalyticsProvider,
    isOptedOut: () => optedOut.value,
    version,
  })

  return {
    providerId: computed(() => nuxtApp._croutonAnalyticsProvider?.id ?? 'noop'),
    events,
    optedOut,
    track: tracker.track,
    pageview: tracker.pageview,
    identify: tracker.identify,
    optOut: () => { optedOut.value = true },
    optIn: () => { optedOut.value = false },
  }
}
