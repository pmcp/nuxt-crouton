# Code Smell & Best Practices Report — All Packages

**Date:** 2026-02-20
**Scope:** 24 packages in `/packages/*`
**Method:** One dedicated analysis agent per package, run in parallel
**Overall Fleet Score: 4.6 / 10**

---

## Package Scores

| Package | Score | Critical Issues |
|---------|-------|----------------|
| `crouton-bookings` | 5.5/10 | God composable (777 lines), date normalization ×6, IDOR PATCH |
| `crouton-core` | 5.5/10 | God composable, SSR-leaking module state, IDOR on image delete |
| `crouton-admin` | 5/10 | Password hashing bypass, middleware security hole, hardwired D1 |
| `crouton-auth` | 5/10 | Auth singleton race condition, `window.location.origin` in SSR |
| `crouton-collab` | 5/10 | Memory leak (Y.Doc on reconnect), no WebSocket auth |
| `crouton-editor` | 5/10 | XSS via `v-html`, paste/drop listener leak |
| `crouton-email` | 5/10 | Module-level Resend singleton (broken on Workers), 7 `as any` |
| `crouton-mcp-toolkit` | 5/10 | Prompt injection via `teamId`, triple-duplicate mapping logic |
| `crouton-sales` | 5/10 | Side effect in computed getter, dual auth storage, fails-open token |
| `crouton-triage` | 5/10 | Module-level race condition, no webhook signature verification |
| `crouton-ai` | 4.5/10 | Silently ignored `systemPrompt` prop, zero auth on endpoints |
| `crouton-assets` | 4.5/10 | `resolveComponent()` violation, raw `route.params.team`, unauth AI endpoint |
| `crouton-designer` | 4.5/10 | Unauthenticated shell exec + filesystem write, `execSync` blocks event loop |
| `crouton-i18n` | 4.5/10 | 1742-line god component, watcher-per-call composable, commented-out auth |
| `crouton-pages` | 4.5/10 | XSS ×2 via `v-html`, 1426-line god component, unauth AI endpoint |
| `crouton` | 4/10 | `new Function()` eval, dead code, uses private `nuxt.options._layers` |
| `crouton-charts` | 4/10 | `resolveComponent()` violation, `"latest"` dep pinning, no tests |
| `crouton-cli` | 4/10 | Debug `console.log` in prod, broken timeout, `fileExists` duplicated ×9 |
| `crouton-devtools` | 4/10 | Broken API explorer (URL mismatch), entire dead orphaned client dir |
| `crouton-events` | 4/10 | Unbounded export query (DoS), SQL injection via array interpolation |
| `crouton-flow` | 4/10 | Double CLAUDE.md violation, deprecated infra + SQL injection still deployed |
| `crouton-maps` | 4/10 | Mapbox API key exposed client-side, XSS via `setHTML()`, `Math.random()` in template |
| `crouton-mcp` | 4/10 | Shell injection via `args.join(' ')`, doubled CLI arg bug, stale help text |
| `crouton-themes` | 4/10 | Full Tailwind reimported ×3, entire `blackandwhite` theme orphaned, listener leak |

---

## Cross-Cutting Issues (Found in Multiple Packages)

These patterns appear across many packages and suggest systemic problems that need architectural-level fixes.

### 🔴 Security — Unauthenticated API Endpoints (8+ packages)

`crouton-ai`, `crouton-assets`, `crouton-collab`, `crouton-designer`, `crouton-events`, `crouton-i18n`, `crouton-pages`, `crouton-triage` — all expose server API endpoints with zero auth checks. Several involve privileged operations (AI inference, file write, shell exec, data export).

**Fix:** Establish an `ensureAuth(event)` utility in `crouton-core/server/utils/` and require its use at the top of every `server/api/` handler. Run a Grep audit: `grep -r "defineEventHandler" packages/*/server/api | grep -v "ensureAuth"`.

### 🔴 CLAUDE.md Violation — `resolveComponent()` for Optional Packages (4 packages)

`crouton-assets`, `crouton-charts`, `crouton-flow`, `crouton-pages` all use `resolveComponent()` or `vueApp._context.components` to detect optional packages. CLAUDE.md explicitly forbids this.

**Fix:** Replace with `useCroutonApps().hasApp('packageId')` + stub pattern. See CLAUDE.md "Optional Cross-Package Components" section.

### 🔴 Security — Raw `route.params.team` Instead of `useTeamContext()` (4+ packages)

`crouton-assets`, `crouton-bookings`, `crouton-collab`, `crouton-pages` access `route.params.team` directly. `useTeamContext()` exists precisely to avoid capturing non-team params like project IDs.

**Fix:** Global search-and-replace: `route.params.team` → `useTeamContext().teamId`.

### 🔴 Security — SQL Injection / Unparameterized Queries (3 packages)

`crouton-events` interpolates arrays into raw SQL templates; `crouton-flow` interpolates `collectionName` directly; `crouton-designer` still has a deprecated endpoint doing the same. All three bypass Drizzle's parameterization.

**Fix:** Never concatenate user input into `sql` tagged templates. Always use Drizzle's typed query builder or properly parameterized `sql` placeholders.

### 🔴 Architecture — Module-Level Mutable Singletons Leaking Across SSR Requests (4 packages)

`crouton-auth`, `crouton-core` (Kanban state), `crouton-email` (Resend client), `crouton-triage` (in-memory cache/metrics) all hold mutable state at module level. On Cloudflare Workers, modules are reused across requests but in Node.js dev, this causes cross-request pollution.

**Fix:** Move stateful singletons to `event.context`, `useState()`, or lazy initialization inside request handlers.

### 🟠 God Composables / God Components (5+ packages)

| File | Lines |
|------|-------|
| `crouton-i18n` Input.vue | ~1,742 |
| `crouton-pages` PageEditor.vue | ~1,426 |
| `crouton-bookings` useBookingCart.ts | ~777 |
| `crouton-core` useCrouton.ts | large |
| `crouton-designer` SchemaWizard.vue | ~617 |

**Fix:** Extract sub-composables and single-responsibility components. Each composable/component should have one job.

### 🟠 XSS via Unsanitized `v-html` (3 packages)

`crouton-editor` (Preview.vue), `crouton-pages` (2 locations), `crouton-maps` (`setHTML()` on Mapbox popups). All render user-controlled or DB-sourced HTML without sanitization.

**Fix:** Use DOMPurify or a server-side sanitizer before any `v-html` bind. Never use `v-html` with untrusted content.

### 🟠 Duplicate Utility Functions Across Packages (5+ packages)

- `fileExists()` — duplicated ×9 across `crouton-cli`
- `layerCamelCase` — inlined ×9 in `crouton-cli`
- `formatCategoryLabel` — duplicated in `crouton-editor` component vs. composable
- `mapOrganizationToTeam` — duplicated in `crouton-auth`
- Date normalization — duplicated ×6 in `crouton-bookings`
- Collection mapping logic — triplicated in `crouton-mcp-toolkit`

**Fix:** Extract shared utilities to `crouton-core/shared/utils/` or the relevant package's `utils/` directory.

### 🟠 Debug `console.log` in Production Code (2 packages)

`crouton-cli`, `crouton-pages` ship debug logs that will appear in production terminals and browser consoles.

**Fix:** Use a `debug` flag or conditional logging. Add a lint rule: `no-console` with selective allowlist.

### 🟠 Options API / Non-`<script setup>` Components (2 packages)

`crouton-devtools` ships a 1700-line HTML string containing an Options API Vue app. Violates the Composition API + `<script setup lang="ts">` mandatory rule from CLAUDE.md.

### 🟠 Stale `crouton.manifest.ts` Files (5+ packages)

`crouton-themes`, `crouton-collab`, `crouton-assets`, `crouton-editor`, `crouton-maps` all have manifests with incorrect props, missing components, or components that no longer exist.

**Fix:** Run the `/audit` skill to detect manifest drift. Consider generating manifests from source rather than maintaining them manually.

### 🟡 `"latest"` Dependency Pins (2 packages)

`crouton-charts` pins `nuxt-charts: "latest"`. This breaks reproducible builds.

**Fix:** Always pin exact versions. Use `pnpm update` + lockfile for controlled updates.

### 🟡 Missing `app/app.config.ts` Registration (2 packages)

`crouton-charts` and `crouton-email` don't register in `croutonApps`. This makes them invisible to `useCroutonApps().hasApp()`, breaking the optional package detection system.

### 🟡 `useI18n()` Called Outside Component/Plugin Context (1 package)

`crouton-bookings` calls `useI18n()` inside plain utility functions. This only works by coincidence when called during component setup and will break in server routes or standalone utilities.

---

## Security Severity Summary

| Severity | Count | Examples |
|----------|-------|---------|
| 🔴 Critical | 12 | Shell exec without auth (designer), SQL injection (events/flow), Mapbox key exposure (maps), unbounded export DoS (events), XSS via v-html (editor/pages) |
| 🟠 High | 18 | Missing auth on AI endpoints (ai/assets/pages), IDOR on image delete (core), IDOR on booking PATCH (bookings), WebSocket no auth (collab), webhook no signature (triage) |
| 🟡 Medium | 24 | Prompt injection (mcp-toolkit), verification code in email subject (email), fails-open token validation (sales) |

---

## Packages Needing Urgent Attention

### 1. `crouton-designer` — STOP AND FIX IMMEDIATELY
An unauthenticated HTTP endpoint accepts user input and passes it to `execSync` (blocking the event loop for up to 2 minutes) while writing files to the filesystem. This is a Remote Code Execution vector in any environment where the dev server is reachable. The endpoint also mutates internal `useChat` refs directly.

### 2. `crouton-events` — Audit Before Next Deploy
SQL injection via array interpolation in a raw `sql` tagged template, plus an unbounded `SELECT *` on the audit log table that will grow forever and can be triggered by any authenticated user to OOM the server.

### 3. `crouton-maps` — Replace `setHTML()` Call
XSS via Mapbox's `setHTML()` — user-controlled content rendered as raw HTML in map popups. Also: the Mapbox API key is exposed to the client bundle.

### 4. `crouton-admin` — Auth Bypass Is Existential
Middleware falls through on unhandled errors, leaving admin routes unprotected. Password hashing bypasses Better Auth entirely. Client-only middleware leaves SSR unprotected.

### 5. `crouton-flow` — Deprecated Infra Is Live
The deprecated server infrastructure with SQL injection (`collectionName` interpolated directly) is still deployed and reachable. It needs to be removed, not just deprecated.

---

## Quick Wins (Low Effort, High Value)

These can be fixed with find-and-replace or very targeted edits:

1. **`route.params.team` → `useTeamContext()`** in 4+ packages — grep and replace
2. **Remove `console.log` statements** in `crouton-cli` and `crouton-pages`
3. **Add `LIMIT` to `crouton-events` export query** — one-line fix prevents DoS
4. **Register `crouton-charts` and `crouton-email` in `croutonApps`** — one config block each
5. **Fix `crouton-devtools` API URL mismatch** — server registers `/execute`, client calls `/execute-request`
6. **Remove `@import "tailwindcss"` from 3 theme CSS files** — reduces bundle size immediately
7. **Pin `nuxt-charts: "latest"` to a real version** in `crouton-charts`
8. **Add `LIMIT 500` to `crouton-events` health endpoint** — `eventsHealth.ts` fetches entire table

---

## Recommended Fix Order

### Phase 1 — Security (this sprint)
1. `crouton-designer`: Remove or auth-gate the shell exec endpoint
2. `crouton-events`: Fix SQL injection + add LIMIT on export
3. `crouton-maps`: Sanitize popup HTML; move API key to server-side proxy
4. `crouton-admin`: Fix middleware fallthrough; move password hashing to Better Auth
5. `crouton-collab`: Add auth to WebSocket upgrade handler

### Phase 2 — Correctness (next sprint)
6. Replace all `resolveComponent()` calls with `useCroutonApps().hasApp()`
7. Replace all `route.params.team` with `useTeamContext()`
8. Fix module-level singletons in `crouton-auth`, `crouton-email`, `crouton-triage`
9. Add `ensureAuth(event)` to all unprotected API endpoints
10. Fix XSS in `crouton-editor`, `crouton-pages`, `crouton-maps`

### Phase 3 — Architecture (following sprint)
11. Break up god composables/components (i18n Input.vue, pages PageEditor, bookings useBookingCart)
12. Extract shared utilities to `crouton-core/shared/utils/`
13. Fix stale manifests in all packages
14. Register missing packages in `croutonApps`
15. Decommission `crouton-flow`'s deprecated server infra

### Phase 4 — Polish
16. Remove debug `console.log` statements
17. Pin all `"latest"` dependencies
18. Add dark mode support to Minimal and KR-11 themes
19. Add touch support to Knob components in `crouton-themes`
20. Write tests for `crouton-charts`, `crouton-designer`, `crouton-themes`

---

*Generated by parallel agent analysis — one agent per package — on 2026-02-20.*