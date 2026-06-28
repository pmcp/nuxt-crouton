/**
 * SPIKE (#945 / #946) — prototype of the future `@fyit/crouton-analytics` public API.
 *
 * This lives in the blog POC to prove the shape end-to-end before it's lifted into
 * `packages/crouton-analytics`. The contract here is what the package should expose:
 *   const { track, pageview, identify, optOut, optIn } = useCroutonAnalytics()
 *
 * Design points being validated:
 *  - ONE stable API; the backend is a swappable PROVIDER resolved from runtime config
 *    (no app code imports a vendor SDK directly → no lock-in, the core thesis).
 *  - A no-op default so an unconfigured POC still boots clean.
 *  - A `console` provider that also pushes to an on-screen ring buffer, so the spike is
 *    visually verifiable WITHOUT real PostHog credentials.
 *  - The default lean-loop event set is a typed union (tiny + stable).
 *  - `version` enrichment is a loose optional hook (#951) — attached when present.
 */

export type CroutonAnalyticsEvent =
  | 'pageview'
  | 'poc_first_visit'
  | 'cta_click'
  | 'signup'
  | 'key_action'

export type CroutonAnalyticsProps = Record<string, string | number | boolean | null | undefined>

export interface CroutonAnalyticsProvider {
  id: string
  track: (event: string, props?: CroutonAnalyticsProps) => void
  identify?: (distinctId: string, traits?: CroutonAnalyticsProps) => void
}

interface AnalyticsConfig {
  provider?: 'noop' | 'console' | 'posthog'
  posthog?: { key?: string, host?: string }
}

export interface RecordedEvent {
  event: string
  props: CroutonAnalyticsProps
  at: string
}

/** No-op — the safe default when analytics is unconfigured or opted out. */
function createNoopProvider(): CroutonAnalyticsProvider {
  return { id: 'noop', track: () => {} }
}

/** Console + on-screen ring buffer — observable without any backend key (spike demo). */
function createConsoleProvider(buffer: Ref<RecordedEvent[]>): CroutonAnalyticsProvider {
  return {
    id: 'console',
    track(event, props = {}) {
      const rec: RecordedEvent = { event, props, at: new Date().toISOString() }
      // eslint-disable-next-line no-console
      console.info('[crouton-analytics]', event, props)
      buffer.value = [rec, ...buffer.value].slice(0, 25)
    },
    identify(distinctId, traits = {}) {
      // eslint-disable-next-line no-console
      console.info('[crouton-analytics] identify', distinctId, traits)
    },
  }
}

/**
 * PostHog via @nuxt/scripts (the real default in production). Behind config so the spike
 * never needs a key to run. Uses the @nuxt/scripts auto-imported loader when available.
 */
function createPostHogProvider(): CroutonAnalyticsProvider {
  // `useScriptPostHog` is auto-imported by @nuxt/scripts when the module is registered.
  // Guarded so the spike degrades to no-op if the module/key is absent.
  const loader = (globalThis as unknown as { useScriptPostHog?: () => { proxy: { capture: (e: string, p?: unknown) => void, identify: (id: string, t?: unknown) => void } } }).useScriptPostHog
  if (typeof loader !== 'function') {
    if (import.meta.dev) console.warn('[crouton-analytics] posthog provider requested but @nuxt/scripts loader not found — falling back to no-op')
    return createNoopProvider()
  }
  const { proxy } = loader()
  return {
    id: 'posthog',
    track: (event, props) => proxy.capture(event, props),
    identify: (distinctId, traits) => proxy.identify(distinctId, traits),
  }
}

export function useCroutonAnalytics() {
  const config = useRuntimeConfig().public.crouton?.analytics as AnalyticsConfig | undefined
  const optedOut = useState<boolean>('crouton-analytics-optout', () => false)
  // Only plain, serializable data goes in useState — the event buffer, not the provider.
  const buffer = useState<RecordedEvent[]>('crouton-analytics-events', () => [])

  // The provider holds functions, so it must NOT be serialized into the SSR payload.
  // Cache it on the Nuxt app instance (per-request on the server, persistent on the client).
  const nuxtApp = useNuxtApp() as unknown as { _croutonAnalyticsProvider?: CroutonAnalyticsProvider }
  function provider(): CroutonAnalyticsProvider {
    if (nuxtApp._croutonAnalyticsProvider) return nuxtApp._croutonAnalyticsProvider
    let resolved: CroutonAnalyticsProvider
    switch (config?.provider) {
      case 'posthog': resolved = createPostHogProvider(); break
      case 'console': resolved = createConsoleProvider(buffer); break
      default: resolved = createNoopProvider()
    }
    nuxtApp._croutonAnalyticsProvider = resolved
    return resolved
  }

  /** Optional version/experiment enrichment (#951) — loose hook, no hard dependency. */
  function withVersion(props: CroutonAnalyticsProps): CroutonAnalyticsProps {
    const version = (config as unknown as { version?: string })?.version
      ?? (useRuntimeConfig().public as unknown as { croutonVersion?: string }).croutonVersion
    return version ? { version, ...props } : props
  }

  function track(event: CroutonAnalyticsEvent | (string & {}), props: CroutonAnalyticsProps = {}) {
    if (optedOut.value) return
    provider().track(event, withVersion(props))
  }

  function pageview(path?: string) {
    track('pageview', { path: path ?? (import.meta.client ? window.location.pathname : undefined) })
  }

  function identify(distinctId: string, traits: CroutonAnalyticsProps = {}) {
    if (optedOut.value) return
    provider().identify?.(distinctId, withVersion(traits))
  }

  const optOut = () => { optedOut.value = true }
  const optIn = () => { optedOut.value = false }

  return {
    providerId: computed(() => provider().id),
    events: buffer,
    optedOut,
    track,
    pageview,
    identify,
    optOut,
    optIn,
  }
}
