# CLAUDE.md - @fyit/crouton-devtools

## Package Purpose

DevTools integration for Nuxt Crouton. Provides visual inspection and management of CRUD collections in Nuxt DevTools with zero config.

## Key Files

| File | Purpose |
|------|---------|
| `src/module.ts` | Nuxt module entry point |
| `src/runtime/transform/croutonSrc.ts` | Build-time `data-crouton-src` stamper (preview-review overlay, #490) |
| `src/runtime/plugins/review-overlay.client.ts` | In-page preview-review overlay: click element → comment → payload (#489) |
| `src/runtime/overlay/capture.ts` | Pure capture helpers + `formatReviewComment` (selector / source-file / annotation / Markdown), unit-tested (#489, #491) |
| `src/runtime/server/api/review.post.ts` | `POST /api/_review` → GitHub PR comment bridge (#491) |
| `src/runtime/pages/data-browser.vue` | Collection inspector UI |
| `src/runtime/server-rpc/client.ts` | Embedded DevTools UI (Vue app) |
| `src/runtime/server-rpc/collections.ts` | Get collections RPC |
| `src/runtime/server-rpc/operations.ts` | Get operations RPC |
| `src/runtime/server-rpc/events.ts` | Query persisted events (when events package installed) |
| `src/runtime/server-rpc/eventsHealth.ts` | Events health statistics |
| `src/runtime/server/utils/operationStore.ts` | In-memory operation tracking |
| `src/runtime/server/plugins/operationTracker.ts` | Nitro plugin for tracking API calls |

## Features

- **Collections Tab** - View all registered collections with search & filter
- **Operations Tab** - Monitor live CRUD operations in real-time
- **API Explorer Tab** - Test collection endpoints interactively
- **Data Browser Tab** - Browse collection data with layout options
- **Activity Tab** - Unified events view (when `nuxt-crouton-events` installed)
- Dark mode support
- Auto-refresh capabilities

## Installation

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/devtools',
    '@fyit/crouton-devtools'
  ],
  devtools: {
    enabled: true
  }
})
```

## Mobile DevTools (eruda) layer — `@fyit/crouton-devtools/eruda`

A separate, **opt-in Nuxt layer** (not the DevTools module above) that adds
[eruda](https://github.com/liriliri/eruda) — an **in-page** devtools panel for
**mobile** browsers (console incl. Vue hydration warnings, Elements/DOM, Network).
Use it to debug a preview on a phone where desktop DevTools aren't available.

```typescript
// nuxt.config.ts — opt in (apps/pocs choose this; it is NOT auto-applied)
export default defineNuxtConfig({
  extends: ['@fyit/crouton-devtools/eruda']
})
```

**Gating — staging/dev only, NEVER production:** the layer's client plugin loads
eruda only when `import.meta.dev` (local) **or** the public flag
`croutonEruda` is true. Enable it for a staging build by setting the env var in the
app's `cf:staging` script; leave `cf:deploy` (production) untouched:

```jsonc
// app package.json
"cf:staging": "NUXT_PUBLIC_CROUTON_ERUDA=true NITRO_PRESET=cloudflare_module nuxt build && …",
"cf:deploy":  "NITRO_PRESET=cloudflare_module nuxt build && …"   // no flag → eruda never loads
```

- eruda is a **dynamic import** → its own chunk, **never fetched** when the flag is
  false, so production pays ~nothing.
- `NUXT_PUBLIC_CROUTON_ERUDA` maps to `runtimeConfig.public.croutonEruda` (Nuxt env
  convention).
- Files: `eruda/nuxt.config.ts` (layer entry + flag), `eruda/plugins/eruda.client.ts`
  (gated loader). For *arbitrary* sites on the go, a dedicated inspector app (e.g.
  Inspect Browser) stays the companion. Epic #387.

## What You'll See

### Collection Inspector

- **Collection Cards** - Quick overview of each collection
- **Search & Filter** - Find by name, layer, or API path
- **Layer Badges** - Internal/external/custom indicators
- **Detail View** - Click for full configuration

### Collection Details

- Name and key
- API path
- Component name
- Layer type
- Full JSON configuration

### Activity Tab (Events Integration)

When `nuxt-crouton-events` is installed, the Activity tab appears automatically:

- **Health Dashboard** - Total events, today's count, this week, status
- **Operation Breakdown** - CREATE/UPDATE/DELETE counts
- **Filters** - By collection, operation type, limit
- **Events List** - Timeline of persisted mutation events
- **Event ↔ Operation Correlation** - Link HTTP operations to events via itemId

The module auto-detects the events package via layer inspection.

## Preview-review source stamping — `data-crouton-src` (epic #488, #490)

A build-time Vue **compiler** transform that injects
`data-crouton-src="<relative .vue path>"` onto each component's *root* element, so
a click on a deployed staging preview resolves to the owning source file. This is
the capture primitive behind the agent UI sign-off loop (annotate a preview →
structured PR comment → agent edits *that* file).

Why a compiler transform (not Vue DevTools' inspector): DevTools' `data-v-inspector`
is injected by a **dev-only** Vite middleware and is stripped from `nuxt build`, so
it can't help on a deployed Workers preview. A compiler `nodeTransform` runs during
SFC compilation, so the attribute is present in the built SSR + client output.

**Gating — staging only, NEVER production** (mirrors the eruda layer): the transform
is installed only when `NUXT_PUBLIC_CROUTON_REVIEW=true` at build time (set it in an
app's `cf:staging` script, never `cf:deploy`). Flag absent → transform not registered
→ zero attributes in the build. It also skips third-party components under
`node_modules`, so a click only ever resolves to a file in this repo.

```jsonc
// app package.json
"cf:staging": "NUXT_PUBLIC_CROUTON_REVIEW=true NITRO_PRESET=cloudflare_module nuxt build && …",
"cf:deploy":  "NITRO_PRESET=cloudflare_module nuxt build && …"   // no flag → never stamped
```

Registered in `module.ts` *before* the dev-only early return (staging is a non-dev
build). Verified by `test/croutonSrc.test.ts`.

### The in-page overlay (#489)

Under the same `NUXT_PUBLIC_CROUTON_REVIEW` gate, the module registers a client
plugin (`runtime/plugins/review-overlay.client.ts`) that renders a self-contained
feedback toolbar on the preview: toggle select-mode → hover highlights elements →
click freezes one and opens a comment box. On send it builds a `ReviewAnnotation`
(`route`, `cssSelector`, `componentFile` from the nearest `data-crouton-src`,
`boundingBox`, `commentText`) and POSTs it to `/api/_review`.

- **Vanilla DOM on purpose** — no dependency on the host app's UI library, so it
  renders identically on any crouton app/sandbox preview.
- **The `/api/_review` endpoint → GitHub PR comment bridge lands in #491.** Until
  then the overlay logs + toasts the payload so capture is verifiable standalone.
- Pure capture logic lives in `runtime/overlay/capture.ts` (DOM-pure, happy-dom
  unit tests in `test/capture.test.ts`); the plugin is the DOM/UX glue around it.
- Runtime Nuxt composables are imported from `nuxt/app` (not `#imports`) so the
  file typechecks even when pulled into a consuming app's program.

### The GitHub bridge — `POST /api/_review` (#491)

`runtime/server/api/review.post.ts` turns a posted `ReviewAnnotation` into a PR
comment via `formatReviewComment` (the `🎯 Preview feedback` Markdown the agent
keys off) + the GitHub issues-comments API, so the subscribed agent
(`subscribe_pr_activity`) wakes on it. Registered (staging-only) under the same
gate; absent from production builds. Returns `{ data, error }`; failures surface a
status-coded message that never echoes the token.

Config is server-side `runtimeConfig.croutonReview`, populated at **runtime** from
Worker env so the token never ships in the bundle or reaches the client:

| Env var | Maps to | Notes |
|---------|---------|-------|
| `NUXT_CROUTON_REVIEW_GITHUB_TOKEN` | `croutonReview.githubToken` | Worker **secret** — never baked |
| `NUXT_CROUTON_REVIEW_REPOSITORY` | `croutonReview.repository` | `owner/repo` (may bake from build env) |
| `NUXT_CROUTON_REVIEW_PR` | `croutonReview.pr` | PR number (or per-request `body.prNumber`) |

Wiring these into an app's `cf:staging` + the `ui-proposal` gate is #492. Server
imports use `nitropack/runtime` (not `#imports`) for the same typecheck reason as
the client plugin.

## Architecture

```
src/
├── module.ts                    # Nuxt module (events detection, tab registration)
├── runtime/
│   ├── pages/
│   │   └── data-browser.vue    # Data browser page
│   ├── server-rpc/
│   │   ├── client.ts           # Embedded Vue app (all tabs)
│   │   ├── collections.ts      # Get collections
│   │   ├── endpoints.ts        # List endpoints
│   │   ├── operations.ts       # Track operations
│   │   ├── events.ts           # Query persisted events
│   │   └── eventsHealth.ts     # Events health stats
│   └── server/
│       ├── plugins/
│       │   └── operationTracker.ts  # Nitro plugin
│       └── utils/
│           └── operationStore.ts    # In-memory store
```

## Common Tasks

### Add new DevTools tab
1. Create page in `src/runtime/pages/`
2. Register in `module.ts` with `addCustomTab()`
3. Add server RPC if needed

### Add operation tracking
Use `src/runtime/server/utils/operationStore.ts` utilities.

## Development

```bash
# Build module
pnpm build

# Test in playground
cd playground && pnpm dev
```

## Roadmap

- ✅ Phase 1: Collection inspector
- ✅ Phase 2: CRUD operations monitoring, API testing
- ✅ Phase 3: Collection data browser
- ✅ Phase 4: Events integration (Activity tab)
- Phase 5: Generator history and rollback
- Phase 6: Schema validation, i18n manager

## Dependencies

- **Core**: `@nuxt/devtools-kit ^1.6.4`, `@nuxt/kit ^3.15.1`
- **Build**: `unbuild ^3.6.1`
- **Dev only**: Zero production impact

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
pnpm build          # Build module
```
