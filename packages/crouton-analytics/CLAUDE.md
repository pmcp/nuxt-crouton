# CLAUDE.md - @fyit/crouton-analytics

## Package Purpose

Provider-agnostic **usage analytics** for nuxt-crouton — the measure half of the lean-startup
loop (epic #945). Apps call one stable composable; the backend is a swappable provider, so there's
no vendor lock-in (the core thesis). Default provider is **PostHog** (already wired in this org);
a self-host sink is the ownership path.

> **Not** `@fyit/crouton-events`. That package is CRUD **audit** ("who changed what data", server
> mutation hook → D1). This is product **usage** ("are visitors using it", client pageviews +
> intent events → PostHog/self-host). Different question, trigger, sink, privacy posture (#945).

## Architecture

```
app code → useCroutonAnalytics()        ← thin Nuxt wrapper (composable)
              └─ analytics-core.ts       ← pure, Nuxt-free logic (unit-tested)
                   ├─ resolveProvider()  ← picks backend from config, degrades to no-op
                   ├─ withVersion()      ← stamps the version-lock id (#951), authoritative
                   └─ createTracker()    ← opt-out gating + enrichment in front of a provider
```

The split is deliberate: **all logic lives in `app/utils/analytics-core.ts`** (no Nuxt imports →
testable), and `app/composables/useCroutonAnalytics.ts` only injects runtime context (config,
opt-out `useState`, the `@nuxt/scripts` PostHog loader, the version id). Lesson baked in from the
spike: the resolved provider holds functions, so it's cached on `nuxtApp` — never in `useState`
(devalue can't serialize functions into the SSR payload).

## Key Files

| File | Purpose |
|------|---------|
| `app/utils/analytics-core.ts` | Pure core: provider factories, `resolveProvider`, `withVersion`, `createTracker` |
| `app/utils/__tests__/analytics-core.test.ts` | The agreed behaviour contract (Test Sign-Off #774) |
| `app/composables/useCroutonAnalytics.ts` | Public API — `track/pageview/identify/optOut/optIn` + provider wiring |
| `nuxt.config.ts` | Layer: extends crouton-core, registers `@nuxt/scripts`, default `provider: 'noop'` |
| `crouton.manifest.ts` | Package manifest (addon; `useCroutonAnalytics`) |

## Usage

```ts
const { track, pageview, optOut } = useCroutonAnalytics()
track('cta_click', { surface: 'landing' })   // lean-loop event
```

Configure the backend per app (env or runtimeConfig):
```
NUXT_PUBLIC_CROUTON_ANALYTICS_POSTHOG_KEY=phc_xxx   # + provider: 'posthog'
```

## Default event set (the contract POCs inherit, #949)

`pageview` (auto) · `poc_first_visit` · `cta_click` · `signup` · `key_action` (generic — app
labels the action). Keep it tiny + stable.

## Status

Epic #945. This package is the abstraction layer (#946). Adapters (PostHog/self-host #947),
generator auto-wiring (#948), and the graduation posture-flip + version tagging (#951) build on it.

## Testing

`pnpm --filter @fyit/crouton-analytics test` — pure-logic vitest (no Nuxt runtime needed). The
test is the contract: "done" = it passes (Test Sign-Off #774).
