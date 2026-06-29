# CLAUDE.md - @fyit/crouton-devtools

## Package Purpose

DevTools integration for Nuxt Crouton. Provides visual inspection and management of CRUD collections in Nuxt DevTools with zero config.

## Key Files

> **The in-page feedback toolkit moved to `@fyit/crouton-feedback` (epic #960).**
> The glasses launcher, the Console (eruda) + Annotate tools, the tool registry,
> the source-stamp transform, and the sink dispatcher are no longer here — this
> package **installs** `@fyit/crouton-feedback` under its own gate (`installModule`
> in `module.ts`), so `crouton init` apps need no extra wiring and the staging
> review flow is unchanged. crouton-devtools keeps only the **DevTools-tab**
> surface (collections / operations / events / data-browser) + the operation
> tracker. Back-compat: `server/plugins/reviewAlias.ts` maps the legacy
> `NUXT_CROUTON_REVIEW_*` secrets onto crouton-feedback's `github` sink at runtime,
> so existing staging deploys keep working without a secret rename (#966).

| File | Purpose |
|------|---------|
| `src/module.ts` | Nuxt module entry — installs `@fyit/crouton-feedback` (the overlay toolkit) + registers the DevTools tabs |
| `src/runtime/server/plugins/reviewAlias.ts` | Nitro plugin: aliases legacy `NUXT_CROUTON_REVIEW_*` config → `croutonFeedback` github sink (back-compat, #966) |
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

**Auto-included in `crouton init` scaffolds (#595):** `@fyit/crouton-devtools` is automatically added to the generated app's `devDependencies` and `modules` array. The generated `cf:staging` script prefixes `NUXT_PUBLIC_CROUTON_REVIEW=true` so staging builds activate the review overlay without any extra configuration. Production builds (`cf:deploy`) omit the flag, so there is zero production footprint.

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

## Unified dev-tools launcher + tool registry (epic #808, #809)

One neutral **glasses** button (bottom-right) → a Nuxt UI 4 dropdown of toggleable
tools. The launcher only renders the registry; it owns no tool logic, so adding
the next tool is one `registerTool()` call, not another floating button. **Console
(eruda) + Annotate** are the first two registered tools (#810).

```ts
// A tool registers itself from its own client plugin:
const { registerTool } = useCroutonDevTools()
registerTool({
  id: 'console',
  label: 'Console',
  icon: 'i-lucide-terminal',
  order: 1,
  isAvailable: () => true,        // hide/disable in the current context
  activate: async () => { /* lazy-import + show */ },
  deactivate: () => { /* hide */ },
  badge: () => unread || null     // optional row badge
})
```

- **Registry** (`useCroutonDevTools`) — a module-singleton reactive store
  (`registerTool` / `unregisterTool` / reactive `tools` filtered by `isAvailable`
  + sorted by `order` / `isActive` / `toggle`). Pure Vue reactivity, unit-tested
  in `test/useCroutonDevTools.test.ts` (no Nuxt needed). `resetCroutonDevTools()`
  for HMR/tests.
- **Launcher** (`CroutonDevTools.vue`) — `UPopover` + `UButton` (glasses) +
  `USwitch` rows + `UIcon`. Built on Nuxt UI 4 (every crouton app ships it);
  hidden when no tool is available.
- **Mount** (`crouton-devtools.client.ts`) — appends the launcher to `<body>` on
  `app:mounted` and renders it with `nuxtApp.vueApp._context` as `appContext`, so
  global U* components resolve without the host app placing anything in its layout.
- **Tools (#810):**
  - **Console** (`tools/console.ts`) — eruda, **lazy-imported on first toggle**
    (own chunk, nothing fetched until opened). Supersedes the separate
    `@fyit/crouton-devtools/eruda` `extends` layer (kept but deprecated). The
    `loadEruda` arg is injectable so the tool is unit-tested without the lib.
  - **Annotate** (`tools/annotate.ts` + `useCroutonAnnotate` + `CroutonAnnotate.vue`)
    — pin a comment on a page element → builds the `ReviewAnnotation` (reusing the
    pure `overlay/capture.ts`) → POSTs to `/api/_review`. The launcher toggle drives
    select-mode; the **old standalone `review-overlay.client.ts` FAB is retired**
    (deleted). Comment panel rebuilt on Nuxt UI 4; the highlight is a styled div.
- **Gating** — the module adds the plugins + auto-imports `useCroutonDevTools`
  in local dev, when a build sets `NUXT_PUBLIC_CROUTON_DEVTOOLS=true`, or on a
  staging review build (`NUXT_PUBLIC_CROUTON_REVIEW=true`, so Annotate replaces the
  old overlay there) (→ `runtimeConfig.public.croutonDevtools`); the plugins
  double-check at runtime, so production ships nothing. Registered **before** the
  dev-only early return so a flagged staging build gets it. Folder-based auto-on for
  pocs/fixtures + flag unification is #811.

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

### The in-page overlay — now the Annotate tool (#489 → #810)

The feedback overlay is the **Annotate tool** in the unified menu (#810): toggle
it from the glasses launcher → hover highlights elements → click freezes one and
opens a comment box. On send it builds a `ReviewAnnotation` (`route`,
`cssSelector`, `componentFile` from the nearest `data-crouton-src`, `boundingBox`,
`commentText`) and POSTs it to `/api/_review`.

- **History:** originally a self-contained vanilla-DOM FAB
  (`review-overlay.client.ts`, #489) so it didn't depend on the host UI library.
  Rebuilt on **Nuxt UI 4** for #810 (the launcher already mounts in the host
  app's context) — comment panel = `CroutonAnnotate.vue` (UTextarea/UButton),
  highlight = a styled fixed div; the old FAB plugin is **deleted**.
- Pure capture logic still lives in `runtime/overlay/capture.ts` (DOM-pure,
  happy-dom unit tests in `test/capture.test.ts`), reused unchanged.
- The select/POST glue lives in `runtime/composables/useCroutonAnnotate.ts`; it
  uses bare `$fetch` (Nuxt global) like the old overlay did.
- **No PR? → opens a new issue instead** is #812 (target-resolution ladder).

### The GitHub bridge — `POST /api/_review` (#491)

`runtime/server/api/review.post.ts` turns a posted `ReviewAnnotation` into a PR
comment via `formatReviewComment` (the `🎯 Preview feedback` Markdown the agent
keys off) + the GitHub issues-comments API, so the subscribed agent
(`subscribe_pr_activity`) wakes on it. Registered (staging-only) under the same
gate; absent from production builds. Returns `{ data, error }`; failures surface a
status-coded message that never echoes a token or the private key.

**Auth — the Crouton GitHub App (#519).** The bridge posts as `crouton[bot]`, not a
person: it mints a short-lived (~1h) **installation token** just-in-time from the
shared App's credentials, uses it for the one comment, and lets it expire. No PAT is
stored; the one durable secret is the App private key (it only signs JWTs to mint
tokens). The sign-JWT → exchange-for-installation-token flow is done with
**WebCrypto, dependency-free** in `runtime/server/utils/githubApp.ts` (mirrors
`workers/ticket-editor`, the sibling App consumer), so the package adds nothing to
the lockfile and runs unchanged on Workers + Node 18+.

Config is server-side `runtimeConfig.croutonReview`, populated at **runtime** from
Worker env so nothing ships in the bundle or reaches the client:

| Env var | Maps to | Notes |
|---------|---------|-------|
| `NUXT_CROUTON_REVIEW_GITHUB_APP_ID` | `croutonReview.githubAppId` | Crouton App id (not secret) |
| `NUXT_CROUTON_REVIEW_GITHUB_APP_PRIVATE_KEY` | `croutonReview.githubAppPrivateKey` | Worker **secret** — the App PEM; the one durable secret |
| `NUXT_CROUTON_REVIEW_GITHUB_APP_INSTALLATION_ID` | `croutonReview.githubAppInstallationId` | installation to mint tokens for (not secret) |
| `NUXT_CROUTON_REVIEW_GITHUB_TOKEN` | `croutonReview.githubToken` | **interim** PAT fallback (#519) — honoured only if no App creds; dev/throwaway, never production |
| `NUXT_CROUTON_REVIEW_REPOSITORY` | `croutonReview.repository` | `owner/repo` (may bake from build env) |
| `NUXT_CROUTON_REVIEW_PR` | `croutonReview.pr` | PR number (or per-request `body.prNumber`) |

App credentials take precedence over the PAT; the PAT path stays only so the bridge
keeps working before the App is wired (retire it on App wiring). Verified by
`test/githubApp.test.ts` (the JWT signing path) — see also
`writeups/setup/review-bridge-token-setup.md`.

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
