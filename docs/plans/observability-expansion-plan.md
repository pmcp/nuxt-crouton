# Observability Expansion Plan

_Generated from full-monorepo audit, 2026-02-20_

This plan extends the existing [devtools-events-unification plan](./devtools-events-unification.md) (Phases 1–4, largely complete) with findings from a systematic audit of all 24 packages. It covers blind spots, missing hook integrations, structural gaps, and new devtools capabilities.

---

## Progress

| Group | Done | Total | Status |
|-------|------|-------|--------|
| A — Quick Wins | 2 | 3 | 🔄 |
| B — Structural | 0 | 3 | 🔲 |
| C — Package Integrations | 0 | 9 | 🔲 |
| D — DevTools Enhancements | 0 | 3 | 🔲 |
| **Total** | **2** | **18** | 🔄 |

---

## Group A — Quick Wins
_Pure additions, no architectural changes. Highest ROI._

### A1 — crouton-i18n: add `crouton:mutation` to translation endpoints
- [x] `server/api/teams/[id]/translations-ui/index.post.ts` — call hook after `createTranslation()`
- [x] `server/api/teams/[id]/translations-ui/[translationId].patch.ts` — call hook after `updateTranslation()`, capture `beforeData`
- [x] `server/api/teams/[id]/translations-ui/[translationId].delete.ts` — call hook after `deleteTranslation()`, capture `beforeData`

**Why:** Translation mutations are completely invisible to events and devtools. Who changed which string, when, is untracked.

**Hook shape:**
```typescript
await useNuxtApp().hooks.callHook('crouton:mutation', {
  operation: 'create' | 'update' | 'delete',
  collection: 'translationsUi',
  itemId: translation.id,
  data,        // on create
  updates,     // on update
  result,      // returned record
  beforeData,  // on update/delete: fetch before the write
})
```

---

### A2 — crouton-mcp-toolkit: add source attribution to MCP tool calls
- [x] `server/mcp/tools/create-item.ts` — set `event.context.mutationSource = 'mcp'` before `$fetch`
- [x] `server/mcp/tools/update-item.ts` — same
- [x] `server/mcp/tools/delete-item.ts` — same

**Why:** MCP tools call the standard collection API which already fires `crouton:mutation`, but those events are indistinguishable from human UI mutations. Critical for audit trails when AI has write access.

**The events schema already has `metadata?: Record<string, any>`.** The tracker composable reads `event.context` server-side — extend it to forward `mutationSource` and any MCP client headers into the event `metadata`.

---

### A3 — crouton-devtools: fix events package detection
- [ ] Replace string-match (`layer.cwd.includes('nuxt-crouton-events')`) with `useCroutonApps().hasApp('events')` pattern (or check against `croutonApps` registry in app config)
- [ ] Verify `crouton-events` registers itself in `croutonApps` (check `app/app.config.ts`)

**Why:** Current detection is fragile — breaks if install path changes or package is symlinked. The `hasApp()` pattern already exists in the codebase.

---

## Group B — Structural
_System-level changes that unlock visibility for many packages at once._

### B1 — Extend devtools operation tracker to cover manifest-declared routes
- [ ] Read `provides.apiRoutes` (or equivalent) from each package's `crouton.manifest.ts` at module setup time
- [ ] Store the route patterns in Nitro runtime config alongside `croutonCollections`
- [ ] Extend `operationTracker.ts` to also match against those patterns (not just `/api/crouton-collection/*`)
- [ ] Add `routeGroup` to the `Operation` type to distinguish `collection` | `bookings` | `ai` | `sales` | `triage` etc.

**Why:** ~15 packages use custom API routes that are completely invisible to devtools. A single structural change makes them all visible.

**Packages that immediately benefit:** crouton-ai, crouton-assets, crouton-bookings, crouton-sales, crouton-triage, crouton-pages, crouton-collab.

---

### B2 — Add `crouton:operation` hook for non-CRUD events
- [ ] Define `crouton:operation` hook type in crouton-core (or crouton-events)
- [ ] Payload: `{ type: string, source: string, teamId?: string, userId?: string, metadata?: Record<string, any> }`
- [ ] crouton-events: subscribe to `crouton:operation` and persist to a separate `crouton_operations` table (or extend `crouton_events` with a `type` discriminator)
- [ ] crouton-devtools: subscribe to `crouton:operation` and add entries to the in-memory store

**Why:** Auth lifecycle, email sends, AI completions, webhook ingestion, print jobs — none of these are CRUD mutations but are all meaningful operational events. The current `crouton:mutation` hook shape doesn't fit them.

**Proposed operation types:**
```
auth:login, auth:logout, auth:register
auth:team:created, auth:team:member-added
admin:user:banned, admin:user:deleted, admin:impersonate:start
email:sent, email:failed
ai:translate, ai:chat
asset:uploaded, asset:deleted
booking:batch-created, booking:email-sent
webhook:received
```

---

### B3 — Correlation ID propagation
- [ ] Generate `correlationId` in Nitro `request` hook and store in `event.context.correlationId`
- [ ] Forward `correlationId` into `crouton:mutation` hook payload
- [ ] Forward into `crouton:operation` hook payload
- [ ] crouton-triage: propagate through processing pipeline service boundaries
- [ ] crouton-designer: propagate through scaffold step chain

**Why:** Long-running async pipelines (triage processing: webhook → AI → Notion, designer: chat → schema → scaffold) have no way to link related operations. A correlation ID makes the full chain queryable.

---

## Group C — Package Integrations
_Per-package telemetry additions. Depends on B2 (`crouton:operation`) for non-CRUD items._

### C1 — crouton-admin: audit trail for super-admin operations
- [ ] `server/api/admin/users/create.post.ts` — emit `crouton:operation` (`admin:user:created`, include `adminId`, new user details)
- [ ] `server/api/admin/users/ban.post.ts` — emit `crouton:operation` (`admin:user:banned`, include reason, duration)
- [ ] `server/api/admin/users/delete.post.ts` — emit `crouton:operation` (`admin:user:deleted`, include cascade impact count)
- [ ] `server/api/admin/impersonate/start.post.ts` — emit `crouton:operation` (`admin:impersonate:start`, include `targetUserId`)
- [ ] `server/api/admin/impersonate/stop.post.ts` — emit `crouton:operation` (`admin:impersonate:stop`)

**Why critical:** Zero audit trail for super-admin actions. Who banned whom, who impersonated whom — currently invisible.

---

### C2 — crouton-auth: team lifecycle events
- [ ] Identify where team create/update/delete operations happen in Better Auth integration
- [ ] Emit `crouton:operation` for: `auth:team:created`, `auth:team:updated`, `auth:team:deleted`
- [ ] Emit `crouton:operation` for: `auth:team:member-added`, `auth:team:member-removed`
- [ ] Emit `crouton:operation` for: `auth:user:registered` (new user sign-up)

**Note:** Login/logout are high-volume and may be better as a separate opt-in. Team lifecycle events are the highest-value items here.

---

### C3 — crouton-email: emit operation on send
- [ ] `app/composables/useEmailService.ts` (or server equivalent) — emit `crouton:operation` after `send()` resolves
- [ ] Include: `recipient` (hashed or plain depending on privacy setting), `subject`, `template`, `status: 'sent' | 'failed'`, `duration`
- [ ] On failure: emit with `error` field

**Why:** Every email send is currently invisible. Debugging "did the confirmation email send?" requires log diving.

---

### C4 — crouton-ai: emit operation per AI call
- [ ] `server/api/ai/translate.post.ts` — emit `crouton:operation` (`ai:translate`) with source/target language, text length, model, latency
- [ ] `server/api/ai/translate-blocks.post.ts` — same, add block count
- [ ] Any chat completion endpoint — emit `ai:chat` with model, message count, streaming duration

**Why:** AI operations are expensive and have latency characteristics worth monitoring. Token usage and model selection are also invisible today.

---

### C5 — crouton-assets: emit operation on upload/delete
- [ ] `server/api/upload-image.post.ts` — emit `crouton:operation` (`asset:uploaded`) with filename, MIME type, file size, duration, blob pathname
- [ ] `server/api/upload-image.delete.ts` — emit `crouton:operation` (`asset:deleted`) with blob pathname
- [ ] Add correlation between the blob upload and the subsequent collection record creation (use `correlationId` from B3)

---

### C6 — crouton-bookings: fire mutation hooks from custom endpoints
- [ ] `server/api/crouton-bookings/*/customer-bookings-batch.post.ts` — fire `crouton:mutation` for each created booking (or a single batch event via `crouton:operation`)
- [ ] Email trigger function (`triggerBookingCreatedEmail`) — emit `crouton:operation` (`booking:email-sent` / `booking:email-failed`)
- [ ] Monthly limit enforcement — emit `crouton:operation` (`booking:limit-reached`) when monthly cap is hit

---

### C7 — crouton-collab: room lifecycle events
- [ ] Durable Object `CollabRoom` — emit `crouton:operation` (`collab:room:created`) on first document access
- [ ] WebSocket connect handler — emit `collab:user:joined` with roomId, userId
- [ ] WebSocket disconnect handler — emit `collab:user:left`
- [ ] D1 save callback — emit `collab:synced` with room ID, update size (for performance monitoring)

**Note:** These are high-volume in active sessions — consider sampling or debouncing before persisting.

---

### C8 — crouton-triage: structured telemetry for pipeline
- [ ] Webhook ingestion endpoints — emit `crouton:operation` (`webhook:received`) with source, thread ID, content hash
- [ ] `processor.ts` pipeline stages — emit per-stage operations with duration (parse, AI analysis, routing, Notion creation)
- [ ] Retry handler — emit `crouton:operation` (`webhook:retry`) with attempt number, backoff duration
- [ ] Notion creation (`notion.ts`) — emit `crouton:operation` (`notion:page:created`) with output ID, task count
- [ ] Use `correlationId` (B3) to link all stages of a single discussion processing run

**Note:** This is the highest-complexity integration. Consider implementing B3 first and starting with just webhook ingestion + final outcome events before adding per-stage granularity.

---

### C9 — crouton-sales: POS operation telemetry
- [ ] Receipt print endpoint — emit `crouton:operation` (`sales:receipt:printed`) with order ID, printer, success/failure, duration
- [ ] Helper auth endpoint — emit `crouton:operation` (`sales:helper:login`) with event ID (no PIN in payload)
- [ ] Helper revoke — emit `sales:helper:revoked`
- [ ] Event open/close state transitions — emit `sales:event:opened`, `sales:event:closed`

---

## Group D — DevTools Enhancements
_New UI capabilities. Depends on B1 and B2._

### D1 — System Operations tab
- [ ] New tab in devtools client for non-collection operations
- [ ] Shows entries from `crouton:operation` hook (auth, admin, AI, email, webhooks, etc.)
- [ ] Filterable by operation type, source package, time range
- [ ] Distinguishes MCP-sourced mutations (A2) with a badge

---

### D2 — MCP attribution in Operations tab
- [ ] Add `source` column to existing Operations tab (`ui` | `mcp` | `api`)
- [ ] Style MCP rows distinctly (e.g. robot icon, different row colour)
- [ ] Filter: "Show MCP only" toggle

---

### D3 — Generator history tab (crouton-cli)
- [ ] CLI writes metadata to `.crouton-generation-history.json` in app root after each generation run (collection name, fields, generator, timestamp, git SHA if available)
- [ ] Devtools reads this file via a new RPC endpoint
- [ ] New "Generators" tab showing timeline of schema changes

---

## What's out of scope (skip)

| Package | Reason |
|---------|--------|
| crouton-maps | Read-only external geocoding API, no data mutations |
| crouton-themes | Purely cosmetic, no mutations |
| crouton-charts | Read-only, already visible via collection API |
| crouton-flow position updates | Intentionally silent; positions not audit-relevant |

---

## Recommended implementation order

1. **A1** (i18n hooks) — 3 files, ~30 min, immediate events visibility
2. **A2** (MCP attribution) — 3 files, ~30 min, security-critical
3. **A3** (detection fix) — 1 file, ~15 min, prevents future breakage
4. **B2** (`crouton:operation` hook) — defines the contract for all C items
5. **B1** (tracker expansion) — unlocks devtools visibility for 7+ packages
6. **C1** (admin audit trail) — critical compliance gap
7. **C3** (email) — high debugging value, low effort
8. **C4** (AI) — high observability value
9. **C5** (assets) — straightforward
10. **C6** (bookings) — medium complexity
11. **C2** (auth team lifecycle) — depends on Better Auth hook points
12. **B3** (correlation IDs) — needed before C7 and C8
13. **C8** (triage) — highest complexity, save for last
14. **C7** (collab) — WebSocket context, non-trivial
15. **C9** (sales) — straightforward once B2 exists
16. **D1/D2** (devtools UI) — after B1+B2 give it data to show
17. **D3** (generator history) — nice-to-have DX

---

## Daily Log

| Date | Work Done |
|------|-----------|
| 2026-02-20 | Audit completed across all 24 packages. Plan created. |
| 2026-02-20 | A1 complete — added `crouton:mutation` hook to all 3 i18n translation endpoints. Used `verifyTeamTranslation` return value as `beforeData` for PATCH/DELETE (no extra DB query). |
| 2026-02-20 | A2 complete — MCP tools stamp `event.context.mutationSource = 'mcp'` and call `trackMcpMutation()` (new server utility) after each successful collection API call. Direct post to crouton-events write endpoint with `metadata: { mutationSource: 'mcp' }` and cookie forwarding, since event-listener plugin is client-side only and MCP mutations are server-side. |
