# ThinkGraph v2 — Brief

## One-liner

Canvas for thinking with AI. Nodes in, briefs out, pipeline ships.

> Read order: see [README.md](README.md). Implementation notes (deploy, bugs, ops) live in [implementation-notes.md](implementation-notes.md).

---

## Status as of 2026-04-07 (re-audited end-of-day)

This is the audit snapshot — what's actually live in `apps/thinkgraph` and `apps/thinkgraph-worker` versus what the rest of this brief still describes as future work. Update this section, not the phase list below, when things ship.

> **Re-audit note:** A full pass on 2026-04-07 (PM) found that several phases marked ⛔/🟡 had quietly progressed during parallel work the same day (commits `4be788b2`, `4bccb0e3`, `b10beff6`, `22f6f452`, `a98189bc`, plus `apps/thinkgraph-worker/src/yjs-{client,pool}.ts` landing earlier). This table reflects code state, not original commit dates.

### Convergence brief (`thinkgraph-convergence-brief.md`)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1A — MDC rendering | 🟡 **PARTIAL** | `@nuxtjs/mdc` is installed (`apps/thinkgraph/package.json:19`) and `NodeDetail.vue:354,385` renders `node.brief`/`node.output` via `<MDC>`. **Gaps:** no custom ThinkGraph MDC components built (`::chart`, `::data-table`, etc. — no `app/components/mdc/` dir exists), and dispatch services still emit raw artifacts rather than MDC markdown (e.g. `dispatch-services/code.ts:66`, `mermaid.ts`). The rendering pipe is in place; the content side hasn't moved. |
| Phase 1B — Graph validation (`thinkgraph check`) | ✅ **SHIPPED** | `apps/thinkgraph/server/utils/validate-graph.ts` validates `broken-context-ref`, `broken-depends-on`, `orphan-node`, `duplicate-title-at-depth`, `stuck-active`, `broken-wiki-link`, and (commit `4be788b2`) `stuck-worker` for Pi-stranded nodes. MCP tool `apps/thinkgraph/server/mcp/tools/check-graph.ts` and API endpoint `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/validate.get.ts` both wired. **Gaps:** no canvas visual indicators on invalid nodes; no scheduled Nitro task (both marked optional in original spec). |
| Phase 1C — Wiki-link cross-references | 🟡 **PARTIAL** | `apps/thinkgraph/server/utils/wiki-links.ts` parses `[[...]]` (regex, not the spec'd remark plugin) and `resolveWikiLinksForNode()` exists. `validate-wiki-links.ts` is wired into `validateGraph` (`broken-wiki-link` code). **Gaps:** `resolveWikiLinksForNode()` is **not called** from any node create/update endpoint, so `contextNodeIds` is not auto-populated on save. `NodeDetail.vue` renders brief/output as plain MDC with no clickable wiki-link handling; `WikiLink.vue` exists as an unused stub. Backlinks display claim in earlier audit note was overstated. |
| Phase 2A — Repo watchlist + daily digest | 🟡 **PARTIAL** | Collections `apps/thinkgraph/layers/thinkgraph/collections/{watchedrepos,watchreports}/` shipped with full schemas. Cron endpoint `apps/thinkgraph/server/api/cron/watch-repos.post.ts` and runner `apps/thinkgraph/server/utils/watch-repos.ts` (272 lines) implement GitHub commit fetching, Claude Haiku digest generation, incremental SHA tracking, and optional digest-node creation. **Gaps:** (a) no scheduled trigger calling `POST /api/cron/watch-repos`; (b) `watched_repos` not seeded from `apps/docs/data/changelog-packages.json`; (c) no canvas inbox-zone UI (no park/dismiss/act workflow); (d) the legacy `apps/docs/scripts/sync-changelogs.ts` and `.github/workflows/sync-changelogs.yml` are **still in place** alongside the new system. |
| Phase 2B — Semantic search (Vectorize) | ✅ **SHIPPED** | Commit `4bccb0e3`. Vectorize binding `VECTORIZE` in `apps/thinkgraph/wrangler.toml:19-26` (1536 dims, cosine, OpenAI `text-embedding-3-small`). Server utils `apps/thinkgraph/server/utils/embeddings.ts` (`indexNode`, `indexNodeAsync`, `deleteNodeVector`, `embedText`) and `search-similar.ts`. API `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/search-similar.post.ts`, MCP tool `apps/thinkgraph/server/mcp/tools/search-similar.ts`, admin backfill at `apps/thinkgraph/server/api/admin/backfill-embeddings.post.ts`. Auto-indexing **is wired**: `summary-generator.ts` calls `indexNodeAsync` after summary regen (covers webhook + project-assistant create paths) and `mcp/tools/update-node.ts` calls it on Pi worker edits. **Remaining gaps:** no "Find similar" UI button in `NodeDetail.vue`; no canvas highlighting of similar nodes; no re-index on status-only changes (see implementation-notes.md). |
| Phase 2C — Pipeline formalization | ⛔ **NOT STARTED** | No `pipeline_steps` collection. `ThinkgraphStep` type and `NODE_TYPE_STEPS` map exist in `apps/thinkgraph/layers/thinkgraph/collections/nodes/types.ts:37-53` but step sequences are still hardcoded per node template. No execution engine, no validation rules per step, no constitution layer. |

### v2 brief phases (this document, "Build Phases" section below)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 — Unify (kill `decisions`, single `nodes` collection) | ✅ **SHIPPED** | Migration `0013_phase0_unified_nodes.sql` migrated all data. `thinkgraph_nodes` is the source of truth. **Cleanup completed 2026-04-07** (commit `b10beff6`): `decisions/` and `workitems/` collection folders deleted; `apps/thinkgraph/server/api/teams/[id]/thinkgraph-decisions/` endpoints (11 dead duplicates of the active `thinkgraph-nodes/*` paths) deleted; `ThinkgraphWorkitemsNode.vue` (orphaned) deleted; `apps/thinkgraph/server/db/schema.ts` no longer references the legacy collections. **Residual debt:** the `thinkgraph_decisions` and `thinkgraph_workitems` DB tables still physically exist in production D1 (created by migrations 0000/0007, never explicitly DROPped); they're abandoned but consume schema slots. Dropping them is a separate migration decision. |
| Phase 1 — Flexible pipeline | 🟡 **PARTIAL** | **Structured review verdicts shipped**: `APPROVE`/`REVISE`/`RETHINK`/`UNAVAILABLE` routing implemented in `apps/thinkgraph/server/api/teams/[id]/dispatch/webhook.post.ts` (REVISE caps at 3 builder loops). **Skippable steps shipped**: analyst can write `skipTo` into stage-meta artifact and the router validates it against the node's steps array, falling back to linear progression if invalid. **Gap:** stage-scoped MCP tools NOT implemented — all 11 tools in `apps/thinkgraph/server/mcp/tools/` are unscoped and Pi receives the full set regardless of stage. |
| Phase 2 — Context & Content | 🟡 **PARTIAL** | Summary auto-generation (`apps/thinkgraph/server/utils/summary-generator.ts`, fires non-blocking from pm-tools/webhook/create-node), progressive disclosure in `apps/thinkgraph/server/utils/context-builder.ts`, and per-step token tracking in `apps/thinkgraph-worker/src/session-manager.ts` (`tokenUsage`, stored as `token-usage` artifact) all shipped. **Markdown by worker is partially done**: `apps/thinkgraph/server/utils/node-markdown.ts` builds the markdown server-side and stores it as a `node-markdown` artifact, but `session-manager.ts:1437-1439` has TODO comments where the actual git-commit logic for `.thinkgraph/nodes/{id}.md` belongs — never implemented. |
| Phase 3 — Fan-in & Synthesis | ✅ **SHIPPED** | Fan-in via `contextNodeIds`, `synthesize`/`analyse` step types in `apps/thinkgraph/layers/thinkgraph/collections/nodes/types.ts:41`, multi-select synthesis flow in `apps/thinkgraph/app/composables/useGraphActions.ts:88-133` and `SelectionBar.vue:88`. **Caveat:** `synthesize` and `analyse` are step *types* but are not auto-routed by the webhook — `DEFAULT_STAGE_ORDER` is `['analyst','builder','launcher','reviewer','merger']`, so synthesize/analyse only run when the user explicitly creates a node with those steps. They're not part of the automatic stage cascade. |
| Phase 4 — Ingestion | 🟡 **PARTIAL** | Project-level text ingestion via `ingestText` tool in `apps/thinkgraph/server/api/teams/[id]/project-assistant.post.ts:483-490` (batch-creates nodes through template detection). Template detector recognises `meta` template by regex (`apps/thinkgraph/server/utils/template-detector.ts:15`). **Gaps:** no dedicated meeting/transcript flow; meta-node UI workflow exists only as a template type, no dedicated picker. |
| Phase 5 — Output Layer | 🟡 **PARTIAL** | Public project docs tab via `apps/thinkgraph/app/components/ProjectDocs.vue` (groups completed work by template). **Gap:** no Nuxt Content integration — `@nuxt/content` not installed, only auto-generated module-type stubs visible. |

### Assistant brief (`thinkgraph-assistant-brief.md`)

| Step | Status | Notes |
|------|--------|-------|
| Step 1 — Node conversations | ✅ **SHIPPED** | Storage and UI: `nodeId` column on `apps/thinkgraph/layers/thinkgraph/collections/chatconversations/server/database/schema.ts:31`, `apps/thinkgraph/app/components/NodeChatPanel.vue` (279 lines, slash commands `/break-down` and `/send-to-pi`), streaming chat endpoint at `apps/thinkgraph/server/api/teams/[id]/thinkgraph-nodes/chat.post.ts`. **Decision #1:** the existing `chatconversations` collection holds messages instead of a new `node_messages` table — zero migration. **Decision #2 (resolved):** dispatch ships an **AI-generated structured roundup** of the per-node conversation, not the raw transcript. `apps/thinkgraph/server/utils/dispatch-conversation.ts` produces a Goal/Decisions/Constraints/Open questions/Next steps brief via `createAIProvider()` (so the summarizer follows whatever model the chat endpoint uses — local-model story unaffected), caches it on `chatconversations.metadata.dispatchSummary` keyed by a hash of the messages array (no LLM call on cache hit), and falls back to deterministic truncation (preserving every user message + every `DECISION:` line + the most recent assistant turn) if generation fails. Wired into `work-item.post.ts:66-92`; the dispatch response and `handoffMeta` carry a `conversationSummaryStatus` field (`fresh`/`cached`/`fallback-truncated`/`none`) so the UI can flag truncation. |
| Step 2 — Ask the graph (dialectic) | 🟡 **UNBLOCKED** (was ⛔) | Phase 2B (semantic search) shipped and Step 2 is now unblocked, but the dialectic-specific features remain unbuilt: no separate "ask" or "dialectic" endpoint, no graduated intensity (Quick/Standard/Deep with Haiku/Sonnet/Opus routing — chat always uses default Sonnet via `createAIProvider()`), no source-node references in responses, no canvas-level query UI (command palette / floating input), and `search-similar.ts` is **not wired into the chat endpoint**. The chat endpoint at `chat.post.ts` handles per-node and contextScope queries but lacks the dialectic sophistication. |
| Step 3 — Canvas presence | 🟡 **CODE LANDED, PENDING LIVE VERIFICATION** (was 🟡) | Pi worker infra (`apps/thinkgraph-worker/src/yjs-client.ts` ~500 lines, `yjs-pool.ts` ~188 lines, 14 `appendAgentLog`/`setAgentStatus` calls in `session-manager.ts`) was already shipped — the gap was purely the rendering layer, now coded against the new `node.ephemeral` namespace (see Option C entry below). `ThinkgraphNodesNode.vue` renders a pulsing Pi status pill in the card header + a live latest-log-line below the existing activity text, reading `props.data.ephemeral.agentStatus` / `props.data.ephemeral.agentLog` (the bridge surfaces Yjs `node.ephemeral` as `data.ephemeral` because Vue Flow only forwards the `data` prop). New `apps/thinkgraph/app/components/NodeAgentActivity.vue` renders a full scrollable log feed with auto-scroll-on-new-entry (via `nextTick`, no `setTimeout`) inside the project-page slideover (`apps/thinkgraph/app/pages/admin/[team]/project/[projectId].vue`), conditional on `flowId && selectedItemId`. The drawer feed uses its own `useFlowSync({ flowId, collection: 'thinkgraphNodes' })` so the WS lifecycle is tied to slideover mount — known cost: a second WebSocket to the same flow room while the drawer is open. Decision #5 (where to render): **option C — both card pill + drawer feed**. Worker passes strict tsc, app typecheck clean, `crouton-flow` unit tests 24/24. End-to-end browser-side rendering against a real Pi dispatch is **not yet observed** — verification was attempted via Playwright in the 2026-04-08 session but the local dev browser and Pi 5 worker were on different Yjs rooms (Pi connects directly to the production collab worker via its own `COLLAB_WORKER_URL`, while local dev's crossws is in-memory; bridging the two requires a matching `BETTER_AUTH_SECRET`). Awaiting a manual local test to flip this row to ✅ **SHIPPED**. |
| Step 4 — Background reflection | ⛔ **NOT STARTED** | No reflection / background synthesis task. Depends on Step 2 being fully built. |

### Open cleanup debt (audit findings, 2026-04-07 PM re-audit)

**Cleared since the morning audit:**
- ✅ Legacy `decisions/`/`workitems/` collections + 11 dead `thinkgraph-decisions/*` endpoints + `ThinkgraphWorkitemsNode.vue` deleted (commit `b10beff6`).
- ✅ `research-agent.ts` removed from dispatch services (commits `22f6f452`, `a98189bc`). Dispatch service count: was 17, now 16.
- ✅ **Conversation now reaches Pi.** Step 1 dispatch gap closed: `apps/thinkgraph/server/utils/dispatch-conversation.ts` produces an AI-generated roundup of the per-node chat (Goal / Decisions / Constraints / Open questions / Next steps), cached on `chatconversations.metadata.dispatchSummary` keyed by a hash of the messages, with deterministic truncation fallback that preserves user messages + `DECISION:` lines + most recent assistant turn. Wired into `work-item.post.ts`; `handoffMeta` and the dispatch response carry `conversationSummaryStatus` (`fresh`/`cached`/`fallback-truncated`/`none`).
- 🟡 **Canvas agent activity rendered (live verification pending).** Step 3 rendering layer coded: Pi's `agentStatus`/`agentLog` writes to Yjs (now under `node.ephemeral`, see next entry) are read by a pulsing status pill + latest-log-line on the node card (`ThinkgraphNodesNode.vue`) and a full scrollable activity feed in the detail slideover via the new `NodeAgentActivity.vue` component (`apps/thinkgraph/app/pages/admin/[team]/project/[projectId].vue`). The card reads `props.data.ephemeral.{agentStatus,agentLog}` (surfaced from Yjs `node.ephemeral` by `useFlowSyncBridge.ts:172`); the drawer feed opens its own `useFlowSync` against the same flow room while mounted. Auto-scroll uses `nextTick`, no `setTimeout`. Code typechecks, unit tests pass; **end-to-end live observation not yet done** (see Step 3 row above for the verification gap).
- 🟡 **Bridge `data` / `ephemeral` split (Option C) implemented (live verification pending).** Commits `17ce3122` (`packages/crouton-flow`) + `91e61371` (`apps/thinkgraph-worker` + consuming components). `YjsFlowNode` now has a sibling `node.ephemeral` field next to `node.data`; the bridge's row-sync watcher only ever spreads `row` into `node.data`, leaving `node.ephemeral` untouched across refetches — which was the underlying reason Pi's writes were getting clobbered. New `useFlowSync().updateEphemeral(nodeId, patch)` in the package, mirrored by `YjsFlowClient.updateEphemeral` in the Pi worker. Pi's `appendAgentLog`/`setAgentStatus`/`clearAgentState` and the bidirectional control observer (`userPrompt`/`userAbort`/`userSteer`) all moved over. Bridge surfaces the namespace as `data.ephemeral` at the Vue Flow boundary because Vue Flow only forwards `data` to custom node components (the Yjs-level boundary stays honest — `node.ephemeral` is a true sibling of `node.data`). `crouton-flow` unit tests 24/24, worker strict-tsc clean, app typecheck shows no new errors. **Live observation that ephemeral state actually survives a row refetch during a Pi dispatch is still pending** (the same verification gap as the entry above).

**Still open:**

- **Live verification of the canvas agent activity pipeline (Step 3 + Option C).** The code on both ends is in (`91e61371`, `17ce3122`) and the static checks pass, but a real Pi dispatch has not yet been observed rendering the pill + log feed end-to-end in a browser. The 2026-04-08 Playwright attempt was blocked by a dev/prod Yjs room split (Pi 5 worker is configured with `COLLAB_WORKER_URL=https://thinkgraph-collab.cloudflare-e53.workers.dev` and writes to the production DO; local dev's browser uses in-memory crossws unless `NUXT_PUBLIC_COLLAB_WORKER_URL` is set AND `BETTER_AUTH_SECRET` matches the production secret). A manual local test (or a deployed-prod test) is needed to flip Step 3 from 🟡 to ✅.
- **`stuck-worker` validator has no scheduled runner.** Commit `4be788b2` added the detection logic; nothing calls it on a schedule. Without a Nitro cron + alert path, the validator only runs when a human or MCP client invokes it. The Apr 7 incident would still go unnoticed for hours unless someone manually checked.
- **Wiki-link resolution not wired to save.** `resolveWikiLinksForNode()` exists but no node mutation calls it, so brief/output text containing `[[wiki]]` syntax never updates `contextNodeIds`. The validator catches broken links but the live data flow doesn't enforce them.
- **`sync-changelogs` parallel to Phase 2A runner.** Both the legacy `apps/docs/scripts/sync-changelogs.ts` + `.github/workflows/sync-changelogs.yml` AND the new `apps/thinkgraph/server/api/cron/watch-repos.post.ts` are active. Two systems doing the same work; pick one and remove the other.
- **Legacy DB tables `thinkgraph_decisions`/`thinkgraph_workitems` not dropped.** Code references all gone (Phase 0 cleanup), but the tables still exist physically in D1 since migrations 0000/0007 never had a corresponding DROP. Dropping them needs a deliberate migration step and a backup confirmation.
- **Migration filename collisions.** `0004_first_ironclad.sql` and `0009_add_user_role.sql` orphans (not in `meta/_journal.json`) still on disk alongside their journaled siblings `0004_add_pinned.sql` and `0009_grey_bruce_banner.sql`. Migrator ignores them. Safe to delete after a one-time audit of any deployed environment whose journal might differ from git — see [implementation-notes.md](implementation-notes.md#migration-filename-collisions-2026-04-07).
- **15 dormant dispatch services.** Of the 16 remaining services in `apps/thinkgraph/server/utils/dispatch-services/`, only `pi-agent` is on the v2 critical path. The other 15 (`business-canvas`, `code`, `dalle3`, `excalidraw`, `flux`, `gemini`, `lovable`, `mermaid`, `pitch`, `swot`, `technical-spec`, `text`, `ui-prototype`, `user-stories`, `v0`) are registered, surfaced in `DispatchModal`, but have produced zero artifacts in the v2 `thinkgraph_nodes` table since Phase 0. Decision needed: revive, hide, or remove.
- **Worker→app delivery has no durability layer.** The Apr 7 502 incident was patched at the *detection* level (`stuck-worker` validator) and one-shot reconciled (node `BSqV7rIawoD1JIfc6hpqB`), but the worker still has no outbox / retry / idempotency story. Future 5xx storms will strand new nodes the same way until the Pi worker outbox + app-side idempotency keys land. Tracked separately.

---

## What ThinkGraph Is

ThinkGraph is a visual canvas where messy input becomes structured work that AI executes.

You throw things at it — ideas, user stories, meeting transcripts, research, voice notes. The assistant compresses and structures them into **nodes**. You connect nodes, synthesize them into **briefs**. When a brief is actionable, the **pipeline** quality-gates it through to completion.

```
raw input → AI compress → nodes → connect → synthesize → brief → pipeline → shipped
```

ThinkGraph doesn't do the work. It dispatches, tracks, and routes. AI workers (Pi, Claude, others) execute. You steer.

---

## The Node

Everything is a node. There are no rigid types.

A node has:

| Part | Description |
|------|-------------|
| **Content** | Markdown. An idea, a user story, an insight, a brief, a meeting summary — whatever. |
| **Summary** | AI-generated one-liner (~50 tokens). Used for context assembly. Auto-generated when content is created or steps complete. |
| **Connections** | Directional. Many-to-one fan-in is first class. |
| **Steps** | Optional. A configurable sequence that the node flows through when activated. |
| **Assignee** | Who is responsible: `pi`, `human`, `client`. Only pi-assigned nodes auto-dispatch; human/client wait for triage. |
| **Provider** | What tool executes: `claude-code`, `codex`, `flux`, `openai`, `anthropic`. Decoupled from assignee — one node assigned to Pi could use different providers. Enables comparison (same brief, different providers). |
| **Artifacts** | References to outputs — PR URLs, deploy URLs, screenshots, generated files. |
| **Status** | Lifecycle state. Includes `idle`, `active`, `done`, `rejected`. `rejected` was added with the wiki-links work and lets a node be filed away without being deleted. |
| **Flags** | `pinned` keeps a node in context assembly even when out of scope; `starred` marks human favorites; `retrospective` is markdown written after a step completes. |
| **Dependencies** | `dependsOn` is an array of node IDs that must be `done` before this node can dispatch. Surfaced as clickable cards in the detail panel. |
| **Execution metadata** | `worktree` (git worktree path used by Pi for this node) and `deployUrl` (preview deploy if the launcher step ran) live on the node itself. |

### Node Templates

Templates provide default step sequences. Not rigid types — just sensible defaults you can override.

| Template | Default Steps | Use case |
|----------|---------------|----------|
| `idea` | (none) | Raw input, not yet actionable |
| `research` | `[analyse]` | AI investigates something, reports back |
| `task` | `[analyst → builder → reviewer → merger]` | Code work |
| `feature` | `[analyst → builder → launcher → reviewer → merger]` | Code work with CI/preview |
| `meta` | `[analyst → builder → reviewer → merger]` | Improvements to ThinkGraph itself |

You can add, remove, or reorder steps on any node.

### Meta Nodes

A meta node is a regular node whose brief targets ThinkGraph's own codebase. When the system learns something about itself (better prompt for analyst, new step type needed, skill update), it becomes a meta node and enters the pipeline like any other work.

The system improves itself through the same mechanism it uses to build everything else.

---

## The Pipeline

Steps are quality gates. Each step returns a signal:

| Signal | Meaning | What happens |
|--------|---------|--------------|
| Green | All good | Auto-advance to next step |
| Orange | Needs input | Pause, surface to human |
| Red | Stop | Block the pipeline |

### Built-in Steps

| Step | Role | Tools available |
|------|------|-----------------|
| **Analyst** | Evaluates the brief. Is this clear? Is it needed? Where does it belong? | Read-only: search graph, get context, grep codebase |
| **Builder** | Executes the work. Creates branch, writes code, pushes PR. | Write: create/update files, git, create PR |
| **Launcher** | CI gate. Waits for GitHub Actions. Optionally deploys preview. | Read: CI status. Optional: deploy preview |
| **Reviewer** | Quality gate. Returns structured verdict. | Read: diff, codebase search, compare |
| **Merger** | Merges PR, pulls main, closes pipeline. | Write: git merge, PR merge |
| **Analyse** | Research/thinking step. Investigates and reports back. No code changes. | Read-only: web search, file reads, graph context |
| **Synthesize** | Combines input from connected nodes into a coherent output. | Read: connected node content |
| **Optimizer** | Reviews accumulated learnings, proposes system improvements. | Read: learnings, stage instructions |

### Structured Review Verdicts

The reviewer step returns one of four verdicts (inspired by TaskPlane):

| Verdict | Meaning | What happens |
|---------|---------|--------------|
| **APPROVE** | Code is good | Advance to merger |
| **REVISE** | Code needs fixes | Send back to builder with feedback |
| **RETHINK** | Brief was wrong | Send back to analyst — the plan needs changing, not just the code |
| **UNAVAILABLE** | Can't review | Orange signal, surface to human |

### Stage-Scoped Tools

Each step only gets the MCP tools it needs (inspired by Claw Code). This enforces roles structurally, not just via prompts.

- Analyst cannot modify files or deploy
- Builder cannot merge or deploy
- Reviewer cannot edit code
- Merger cannot write new code

This solves the known friction: "analyst executes instead of evaluating."

### Skippable Steps

The analyst can decide a node doesn't need all steps. A trivial fix might skip straight to builder → merger. A research question might only need analyse. The step sequence is a suggestion, not a prison.

### Pipeline Loop Protection

Reviewer → Builder → Reviewer can cycle forever. Max 3 iterations per loop, then orange signal for human intervention.

### Model Routing

Different steps benefit from different models:

| Step | Default Model | Why |
|------|---------------|-----|
| Analyst | Opus | Needs deep reasoning to evaluate briefs |
| Builder | Sonnet | Fast execution, good enough for code |
| Launcher | Haiku | Just reading CI status |
| Reviewer | Opus | Needs deep reasoning for quality assessment |
| Merger | Sonnet | Mechanical git operations |

Configurable per node. Provider field on the node can override defaults.

### Architectural Boundary: MCP Composition

ThinkGraph is NOT an MCP client. It exposes MCP tools for agents to use (create-node, update-node, store-artifact, search-graph). Composition happens at the agent level — the worker assembles tools for each step, not ThinkGraph.

ThinkGraph is the state store and UI. Agents are the orchestrators.

---

## Context Assembly

### The Problem

With many nodes connected, dumping all content into an AI prompt blows the token budget.

### Progressive Disclosure (3 layers)

Inspired by claude-mem's pattern (~10x token savings):

| Layer | What | Size | When |
|-------|------|------|------|
| **Index** | Summary one-liner from frontmatter | ~50 tokens | Always included for connected nodes |
| **Expanded** | Full markdown content (brief/output) | ~500 tokens | Fetched when agent needs more detail |
| **Full** | Step history, conversation logs, artifacts | ~2000+ tokens | On demand only |

### Context Budget

```
Project brief (always full)
+ Pinned nodes (full — manually marked as critical context)
+ Connected nodes (summary only, by default)
+ Current node (full)
= Bounded token budget (~12K)
```

The agent can request expansion of specific nodes if summaries aren't enough.

---

## Content Storage

### Hybrid: SQLite + Markdown

**SQLite/D1** is the source of truth for structure:
- Node metadata (id, template, signal, step, connections, positions)
- Graph structure and layout
- Team scoping, auth, permissions
- Pipeline state and status
- Real-time UI state

**Markdown files** are the content layer:
- Committed to git by the worker alongside code
- Human-readable, AI-readable, diffable
- Contains brief, step outputs, compressed conversation logs

```markdown
---
id: abc123
summary: "Add auth middleware to protect API routes"
template: task
steps: [analyst, builder, reviewer, merger]
signal: green
connections: [def456, ghi789]
---

## Brief
Protect all /api/teams/* routes with auth middleware...

## Analyst
Green — clear scope, identified 3 files to modify

<details>
<summary>Conversation log</summary>
Agent evaluated brief against existing codebase...
</details>

## Builder
Green — created branch thinkgraph/abc123, PR #31

## Reviewer
APPROVE — clean implementation, no issues
```

### Worker writes both:
1. Updates SQLite via `update_workitem` (structure, status, signal)
2. Commits markdown file to `.thinkgraph/nodes/` in the repo (content)

### Nuxt Content as output layer (to explore)

When a project completes, node markdown could be served via Nuxt Content for:
- Beautiful client-facing project pages
- Searchable project documentation
- Static rendering / caching

Flagged for prototyping. Not committed to.

---

## The Assistant

The assistant is the primary interaction layer. It's how you ingest, connect, and steer.

### Ingestion

You throw raw input at the assistant. It compresses and creates nodes:

- "Here's a meeting transcript" → extracts action items, decisions, user stories as nodes
- "Research these 4 GitHub projects" → creates research nodes, dispatches analyse steps
- "I have an idea: what if we..." → creates an idea node

### Orchestration

- "Take these three user stories and write me a brief" → creates a synthesis node connected to the three, runs synthesize step
- "Dispatch this" → activates the pipeline on a node
- "This is a meta improvement" → flags as meta node targeting ThinkGraph

### Context-Aware

When you select a node and open the assistant, it knows which node you're on. Connected nodes are in context. You're having a conversation about a specific piece of work, not a generic chat.

---

## Token Tracking

Every step tracks token usage (inspired by Claw Code). Visible per node and aggregated per project.

This enables:
- Cost visibility per project (critical for agency economics)
- Identifying expensive steps that need optimization
- Comparing provider costs on the same work

---

## What's Cut

From the previous plan, these are explicitly removed:

- **6 rigid node types** (discover/architect/generate/compose/review/deploy) — replaced by templates + configurable steps
- **Skill mapping per node type** — brief drives instructions, not type
- **thinkgraphDecisions collection** — fully removed in Phase 0 (migration `0013_phase0_unified_nodes.sql`). `thinkgraph_nodes` is the source of truth; legacy collection folder and the 11 dead endpoints under `thinkgraph-decisions/` were deleted 2026-04-07
- **Dedicated provider adapter UIs** (Flux/OpenAI/Anthropic) — never built. A single generic `DispatchModal` lists all registered backend services from `server/utils/dispatch-services/` (17 files). Of these, only `pi-agent` is on the v2 critical path; the other 16 are dormant brainstorming/prototype services from the pre-v2 era — registered and clickable, but the v2 nodes table has zero artifacts produced by any of them. They are kept for now (provider variety, no maintenance cost) but should not be considered v2 features. `research-agent` is currently broken (imports a deleted `createThinkgraphDecision` symbol) and needs to be fixed or removed in Phase 1. See [dispatch-services-audit.md](./dispatch-services-audit.md) for the full breakdown
- **Designer/prototyper stage** — not earned yet
- **Competitive comparison UI** — cool but premature

---

## Build Phases

### Phase 0: Unify (foundation for everything else)

- Kill `thinkgraphDecisions` collection. Migrate to single `nodes` collection
- Remove 6-type system. Add `template` field with configurable `steps` array
- Update worker session-manager to route by step, not by type

### Phase 1: Flexible Pipeline

- Configurable step sequences per node (LED strip adapts to step count)
- Stage-scoped MCP tools (analyst=read-only, builder=write, etc.)
- Structured review verdicts (APPROVE/REVISE/RETHINK/UNAVAILABLE)
- Skippable steps (analyst can recommend skipping)

### Phase 2: Context & Content

- Auto-generate summary one-liner on every node (AI-compressed)
- Progressive disclosure in context building (index → expanded → full)
- Markdown file generation by worker (committed alongside code)
- Compressed conversation logs in markdown `<details>` blocks
- Token tracking per step, visible per node and per project

### Phase 3: Fan-in & Synthesis

- Many-to-one connections (multiple nodes → one synthesis node)
- Synthesize step type (reads connected nodes, produces combined output)
- Assistant: "combine these into a brief" workflow
- Analyse step type (research/thinking, no code changes)

### Phase 4: Ingestion

- Meeting transcript → nodes (assistant extracts and structures)
- Paste/upload any text → assistant creates nodes
- Meta node workflow (system improvements enter the pipeline)

### Phase 5: Output Layer (explore)

- Nuxt Content prototype for client-facing views
- Project documentation generated from completed node markdown
- Search across all node content

---

## Success Criteria

1. You can throw a meeting transcript at it and get structured nodes in 30 seconds
2. You can connect 5 user stories to a brief node and get a synthesized brief
3. A meta insight about ThinkGraph itself becomes a shipped improvement through the same pipeline
4. You never blow the token budget — context assembly is bounded and progressive
5. You can see what every step cost in tokens
6. The client view shows a beautiful project page, not a database dump
7. You open it every morning and know where everything stands
