# Overengineering & Non-Idiomatic Patterns Audit

**Started**: 2026-03-03
**Scope**: All 25 packages in nuxt-crouton monorepo
**Focus**: Overengineering, non-Nuxt/Vue patterns, code duplication, reinventing the wheel

---

## Status

**Verdict**: The codebase is well-structured architecturally. The big decisions (no Pinia, no Options API, no Axios, Composition API everywhere, Nuxt UI v4, layer architecture) are all correct. The audit's findings were primarily DRY violations, manual fetch boilerplate that Nuxt handles natively, and a handful of SSR-unsafe patterns.

| Bucket | Count |
|---|---|
| Resolved (see git history under `refactor(...)` and `fix(...)`) | ~70 |
| Open — actionable | 4 (all crouton-triage infrastructure) |
| Won't fix / deferred — rationale below | ~10 |

For full per-item history search the git log: `git log --oneline --grep "refactor\|perf"` since `2026-03-03`. The dated entries below cover only what's still load-bearing.

---

## Open Work

### Triage infrastructure cluster

These are large enough to deserve their own session — replacing in-house infrastructure with off-the-shelf libraries. Each one is a contained migration but they touch hot paths (logging, rate limiting, metrics, security checks) so they need careful before/after verification.

- [ ] **crouton-triage** — 353-line custom logger (`server/utils/logger.ts`) → use `consola`
- [ ] **crouton-triage** — 318-line custom rate limiter (`server/utils/rateLimit.ts`) → use `rate-limiter-flexible` or h3
- [ ] **crouton-triage** — 307-line custom metrics collector (`server/utils/metrics.ts`) → use OpenTelemetry
- [ ] **crouton-triage** — 213-line `securityCheck.ts` — move to CI or startup plugin

---

## Won't Fix — Rationale Preserved

These items were flagged but investigated and intentionally left alone. Future audits should consult the rationale before re-flagging.

### Architectural / boundary issues that aren't actually smells

- **crouton-flow** `Flow.vue:380-383` — `resolveComponent()` usage. **Why**: genuinely needed for dynamic custom node component resolution. Not the optional-package-detection antipattern that the stub system replaces.

- **crouton-core** `component-warmup.client.ts` — `vueApp._context.components` access. **Why**: architectural, needs a separate design pass. The warmup mechanism is load-bearing for first-paint performance and there's no obvious public API replacement.

- **crouton-maps** `MapBlockView.vue:65-69` — `document.dispatchEvent(CustomEvent)` for block-edit-request. **Why**: pragmatic given Tiptap's `VueNodeViewRenderer` boundary, which doesn't reliably propagate `provide`/`inject`. The pattern is shared across ~25 block views in 6 packages (crouton-pages, crouton-bookings, crouton-triage, crouton-charts, crouton-editor, crouton-maps), scoped via `editorId` for multi-editor pages, and consumed by a single listener in `crouton-editor/Blocks.vue:254`. The "smell" is cosmetic; replacing it would require either prop drilling through extension storage or a fragile inject-through-NodeView setup. Consistency wins.

- **crouton-i18n** `DevModeToggle.vue:139-160` — `document.querySelectorAll('*')` DOM scan. **Why**: dev-only tool that scans the live DOM for `[missing.key]` markers. Acceptable for its scope.

- **crouton-editor** `Simple.vue:143-173` — `document.createElement('input')` for file selection. **Why**: standard pattern for a programmatic file picker. Vue offers no idiomatic alternative for "open OS file dialog from a button click".

- **crouton-flow** `Node.vue:104-150` — inline SVG icons. **Why**: small custom icons specific to flow nodes; not appropriate for `UIcon` or an icon library.

- **crouton-themes** `Knob.vue:42-64` — event listeners on `window`. **Why**: properly cleaned up via `removeEventListener` in the mouseUp handler. Drag interactions need window-level listeners by definition.

### Composables that look like passthrough but aren't

- **crouton-atelier** `useAtelierSync.ts` — looks like a trivial passthrough to `useCollabSync`. **Why**: it genuinely wraps a reactive composable and exposes app-specific defaults. Removing the wrapper would push setup into every consumer.

- **crouton-cli** `manifest-bridge.ts` — looks like passthrough. **Why**: it's a `jiti` interop adapter enabling `.mjs → .ts` runtime imports. Three production consumers depend on it. Load-bearing.

- **crouton-admin** `useAdminDb()` — looks like a thin null check. **Why**: it also centralizes schema re-exports from crouton-auth for all 13 admin API endpoints. Removing it would require duplicating the imports in every endpoint.

- **crouton-core** `useCroutonMutate.ts` — looks redundant. **Why**: provides action-dispatch convenience and an id guard; 2 production consumers and 14 tests. Low ROI to remove.

- **crouton-ai** `useAIProvider.ts` — zero consumers inside the monorepo. **Why**: public API for consumer apps to build provider/model selectors. Don't delete.

### Items deferred for risk or scope reasons

- **crouton-assets** `generateAltText` — duplicated in `Uploader.vue` and `FormUpdate.vue`. **Why deferred**: requires an async composable refactor that crosses several call sites; not worth doing in isolation.

- **crouton-ai** Provider/model registry — client and server have different model lists. **Why deferred**: the type shapes (`AIModel` vs `AIModelInfo`) are intentionally different and unifying them is a larger surgery than what the audit was scoped for.

- **crouton-i18n** hardcoded locale imports (`en`, `nl`, `fr`) in `serverTranslations.ts`. **Why deferred**: this is a deliberate design decision — server-side static imports give the type system a closed locale set. Dynamic loading would lose that.

- **crouton-flow** `JSON.stringify()` comparison for row-data change detection. **Why deferred**: could not locate the code path the original audit referenced.

- **crouton-email** "expires after 10 minutes" hardcoded vs configurable expiry. **Why deferred**: changing email link expiry semantics is risky (cache invalidation, user-facing copy, and security implications). Should be a deliberate product decision, not a refactor.

- **crouton-sales** non-shared cart state via `ref` instead of `useState`. **Why deferred**: there's an SSR concern around hydration mismatch that needs investigation before changing.

---

## What's Done Well

These patterns are correct across the entire codebase and should be preserved:

- **Composition API** — `<script setup lang="ts">` everywhere, zero Options API
- **No Pinia** — `useState()` for state management throughout
- **No Axios** — `$fetch` / `useFetch` used consistently
- **Nuxt UI v4** — correct component names (`USeparator`, `USwitch`, `UDropdownMenu`)
- **VueUse adoption** — `useDebounceFn`, `useClipboard`, `useOnline`, `onClickOutside`, etc.
- **Server auth** — consistent `resolveTeamAndCheckMembership` pattern
- **Layer architecture** — proper domain isolation with Nuxt layers
- **Drizzle ORM** — clean, idiomatic usage throughout server code
- **Auto-imports** — leveraged correctly in most packages
- **Well-layered composable hierarchies** — especially in crouton-collab and crouton-flow
- **Proper error handling** — `createError` with Zod validation on server endpoints

### Package-specific highlights

| Package | What's done right |
|---|---|
| crouton-core | `useCollectionQuery` (proper `useFetch`), `useNotify` (clean toast wrapper), `useImageCrop` (Cropperjs v2) |
| crouton-auth | `useSession` (SSR-safe with `useState`), `useAuthError.withError()` (good pattern, just underused) |
| crouton-collab | Composable layering: connection → sync → editor (genuine abstraction hierarchy) |
| crouton-flow | `useFlowLayout` (well-documented dagre with `needsLayout` heuristics) |
| crouton-i18n | `Input.vue` composable decomposition (textbook Composition API) |
| crouton-pages | `useReorderMode` (clean snapshot/diff pattern) |
| crouton-mcp-toolkit | Cleanest package — generic tools + collection registry, zero config per collection |
| crouton-email | Auth hook architecture (auth fires, email subscribes, decoupled) |
| crouton-maps | Token security (private server key for geocoding, public restricted for tiles) |
