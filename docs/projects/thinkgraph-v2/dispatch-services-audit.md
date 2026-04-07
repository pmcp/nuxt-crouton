# Dispatch Services Audit

**Date:** 2026-04-07
**Scope:** `apps/thinkgraph/server/utils/dispatch-services/` (17 files)
**Trigger:** brief.md "What's Cut" section claims dedicated provider UIs were removed, but the backend service files are still present. This audit determines what's wired up vs. dead code.

## Method

For each service:
- **Registered?** — listed in `ensureServicesLoaded()` in `dispatch-registry.ts`
- **Referenced?** — referenced anywhere outside its own file (grepped on service `id`). Generic registry consumers (`getDispatchService(id)`, `getAllDispatchServices()`) are *not* counted as direct references — only hard-coded `id` mentions or special-case wiring.
- **Used in DB?** — appears as `provider` in any `artifacts[]` JSON in `thinkgraph_nodes` (the unified v2 table) **or** `thinkgraph_decisions` (legacy)
- **Last touched** — `git log -1` on the file

## How services are surfaced today

There is **no per-provider UI**. All 17 services are loaded eagerly at Nitro startup via `server/plugins/dispatch-services.ts` → `ensureServicesLoaded()`, then exposed generically:

- `GET /api/teams/[id]/thinkgraph-nodes/dispatch/services` → returns the full registry list
- `POST /api/teams/[id]/thinkgraph-nodes/[nodeId]/dispatch` → looks up the service by `serviceId` from request body
- `POST /api/teams/[id]/thinkgraph-nodes/dispatch-multi` → same, multi
- (legacy mirror routes exist under `thinkgraph-decisions/...`)

Only one client component consumes any of this: `app/components/DispatchModal.vue` (used by `GraphEditor.vue`). It lists every registered service generically.

So "registered" effectively means "shown to the user in DispatchModal as a tile they can click."

## Database evidence

`thinkgraph_nodes` (149 rows, the unified v2 table) — artifact `provider` values across all 217 artifacts:

| type | provider | count |
|---|---|---|
| `conversation-log` | — | 97 |
| `handoff` | `pi` | 49 |
| `pr` | — | 27 |
| `stage-output` | — | 23 |
| `node-markdown` | — | 17 |
| `handoff` | `human` | 3 |
| `questions` | — | 3 |
| `stage-meta` | — | 1 |

**Zero dispatch-service artifacts in the v2 nodes table.** The only `provider` value present is `pi` — that comes from the Pi worker session machinery, not from `pi-agent.ts`'s artifact output.

`thinkgraph_decisions` (116 rows, legacy table) — only 4 dispatch artifacts ever recorded:

| type | provider | count |
|---|---|---|
| `synthesis` | — | 2 |
| `prototype` | `ui-prototype` | 1 |
| `text` | `research-agent` | 1 |

So in the entire history of both tables, only **2 of the 16 non-`pi-agent` services have ever produced an artifact**, and both lived in the legacy table.

The `thinkgraph_nodes.provider` column exists but is empty across all 149 rows.

## Per-service table

| Service | Registered? | Referenced? | Used in DB? | Last touched | Verdict |
|---|---|---|---|---|---|
| `business-canvas` | yes | no | no | `87daa66b` (4w ago) | KEEP-DORMANT |
| `code` | yes | no | no | `92297f15` (4w ago) | KEEP-DORMANT |
| `dalle3` | yes | no | no | `96a015b0` (4w ago) | KEEP-DORMANT |
| `excalidraw` | yes | no | no | `a3227282` (4w ago) | KEEP-DORMANT |
| `flux` | yes | no | no | `96a015b0` (4w ago) | KEEP-DORMANT |
| `gemini` | yes | no¹ | no | `a47cd826` (4w ago) | KEEP-DORMANT |
| `lovable` | yes | no | no | `96a015b0` (4w ago) | KEEP-DORMANT |
| `mermaid` | yes | no | no | `1fc46b68` (4w ago) | KEEP-DORMANT |
| `pi-agent` | yes | yes² | indirect³ | `9f21a9e8` (3d ago) | **KEEP** |
| `pitch` | yes | no | no | `87daa66b` (4w ago) | KEEP-DORMANT |
| `research-agent` | yes | no | 1× (legacy decisions table) | `a7af06c5` (6d ago) | **INVESTIGATE** |
| `swot` | yes | no | no | `87daa66b` (4w ago) | KEEP-DORMANT |
| `technical-spec` | yes | no | no | `87daa66b` (4w ago) | KEEP-DORMANT |
| `text` | yes | no | no | `96a015b0` (4w ago) | KEEP-DORMANT |
| `ui-prototype` | yes | no | 1× (legacy decisions table) | `92297f15` (4w ago) | KEEP-DORMANT |
| `user-stories` | yes | no | no | `0573f212` (4w ago) | KEEP-DORMANT |
| `v0` | yes | no | no | `96a015b0` (4w ago) | KEEP-DORMANT |

**Notes:**

¹ The string `'gemini'` appears in `app/components/PathTypeModal.vue` but in an unrelated provider-name dropdown, not a reference to this dispatch service.

² `pi-agent` is the modern Pi worker dispatch path. It's the only service that consumes `context._meta` (teamSlug/teamId/graphId/decisionId), uses the new `buildDispatchContext` helper, and writes back via `updateThinkgraphNode`. It's actively touched (last commit 3 days ago, vs. 4-6 weeks for the others).

³ `pi-agent` doesn't appear as a `provider` value in artifacts — it pushes work into the Pi worker pipeline which then writes `handoff` / `conversation-log` / `pr` / `stage-output` artifacts (provider `pi` or unset). The 49 `handoff:pi` artifacts in the v2 nodes table are downstream of `pi-agent` dispatches.

### Why `research-agent` is INVESTIGATE

`research-agent.ts:6` imports `createThinkgraphDecision` from `../../layers/thinkgraph/collections/nodes/server/database/queries`. **That symbol does not exist anywhere in the codebase** (grep returns nothing). The function it's trying to call is part of the killed `thinkgraphDecisions` collection (Phase 0 removed it).

This means `research-agent` will crash on import — or at minimum on first invocation — under the v2 schema. It's either:
- (a) silently broken since the Phase 0 unification, kept registered but non-functional, or
- (b) supposed to have been migrated to `createThinkgraphNode` and the migration was missed.

Last commit on the file (`a7af06c5`, 6 days ago) is titled *"refactor(thinkgraph): update dispatch infrastructure for unified nodes"* which suggests (b): the migration was attempted but the import wasn't fixed. Needs a human call: fix the import to use the v2 query, or delete the service.

## Recommendation for brief.md "What's Cut"

The current line in brief.md reads:

> - **Dedicated provider adapter UIs** (Flux/OpenAI/Anthropic) — multi-provider dispatch exists, dedicated UIs aren't needed

This is **technically accurate** at the UI layer — there is no per-provider screen, just one generic `DispatchModal` that lists every registered service. But it understates what's still in the tree. Suggested replacement:

> - **Dedicated provider adapter UIs** (Flux/OpenAI/Anthropic) — never built. A single generic `DispatchModal` lists all registered backend services from `server/utils/dispatch-services/` (17 files). Of these, only `pi-agent` is on the v2 critical path; the other 16 are dormant brainstorming/prototype services from the pre-v2 era — registered and clickable, but the v2 nodes table has zero artifacts produced by any of them. They are kept for now (provider variety, no maintenance cost) but should not be considered v2 features. `research-agent` is currently broken (imports a deleted `createThinkgraphDecision` symbol) and needs to be fixed or removed in Phase 1.

## Follow-ups (not part of this audit)

- Fix or delete `research-agent.ts` — it imports a symbol that no longer exists
- Decide whether `DispatchModal` should be hidden / gated until the dormant services are either revived or removed
- The `provider` column on `thinkgraph_nodes` is empty across all 149 rows — confirm whether it's still needed
