# ThinkGraph v2 — Brief

## One-liner

Canvas for thinking with AI. Nodes in, briefs out, pipeline ships.

> Read order: see [README.md](README.md). Implementation notes (deploy, bugs, ops) live in [implementation-notes.md](implementation-notes.md).

---

## Status as of 2026-04-07

This is the audit snapshot — what's actually live in `apps/thinkgraph` versus what the rest of this brief still describes as future work. Update this section, not the phase list below, when things ship.

### Convergence brief (`thinkgraph-convergence-brief.md`)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1A — MDC rendering | ✅ **SHIPPED** | Commit `074ebe56`. `@nuxtjs/mdc` installed, NodeDetail renders output via `<MDCRenderer>`. |
| Phase 1B — Graph validation (`thinkgraph check`) | ⛔ **NOT STARTED** | No `validateGraph` server util, no `check-graph` MCP tool. |
| Phase 1C — Wiki-link cross-references | ✅ **SHIPPED** | Commit `46d09824`. See `apps/thinkgraph/server/utils/wiki-links.ts` and `validate-wiki-links.ts`. Backlinks display in NodeDetail. |
| Phase 2A — Repo watchlist + daily digest | ⛔ **NOT STARTED** | The `sync-changelogs` GitHub Action is still active in `apps/docs`. No `watched_repos`/`watch_reports` collections exist. |
| Phase 2B — Semantic search (Vectorize) | ⛔ **NOT STARTED** | No Vectorize index, no embedding hook, no `search-similar` MCP tool. |
| Phase 2C — Pipeline formalization | ⛔ **NOT STARTED** | Steps still stored as a JSON array on the node. No `pipeline_steps` config. |

### v2 brief phases (this document, "Build Phases" section below)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 — Unify (kill `decisions`, single `nodes` collection) | 🟡 **PARTIAL** | Migration `0013_phase0_unified_nodes.sql` shipped. `thinkgraph_nodes` is the runtime source of truth. MCP tools updated (`apps/thinkgraph/server/mcp/tools/*-node.ts`). **BUT** legacy `decisions/` and `workitems/` collection folders still exist on disk and `apps/thinkgraph/server/api/teams/[id]/thinkgraph-decisions/` has 11 endpoints still importing from `decisions/server/database/queries`. Cleanup pending — see [convergence brief](thinkgraph-convergence-brief.md) and the open-debt note below. |
| Phase 1 — Flexible pipeline | ⛔ **NOT STARTED** | Configurable step sequences exist in the schema (`steps` JSON), but stage-scoped MCP tools, structured review verdicts, and skippable steps are not implemented. |
| Phase 2 — Context & Content | 🟡 **PARTIAL** | Summary auto-generation, progressive disclosure, and per-step token tracking shipped (commit `96f5933e`). Markdown file generation by worker NOT shipped. |
| Phase 3 — Fan-in & Synthesis | ✅ **SHIPPED** | Fan-in via `contextNodeIds`, `synthesize`/`analyse` step types, multi-select synthesis flow (commits `6aa06e7e`, `dbb6c5a5`). |
| Phase 4 — Ingestion | 🟡 **PARTIAL** | Project-level text ingestion shipped (commit `7954b503`). Meeting transcript flow and meta-node workflow not yet built. |
| Phase 5 — Output Layer | 🟡 **PARTIAL** | Public project docs tab shipped (commit `93aad7c0`). No Nuxt Content prototype. |

### Assistant brief (`thinkgraph-assistant-brief.md`)

| Step | Status | Notes |
|------|--------|-------|
| Step 1 — Node conversations | ✅ **SHIPPED** | Per-node chat panel (commit `2b56dfec`, enriched in `365b1d60`). **Decision #1 in the assistant brief was decided differently than proposed:** instead of a new `node_messages` table, the existing `chatconversations` collection holds the messages. The `nodeId` foreign key on `thinkgraph_chatconversations` scopes a conversation to a node, and `NodeChatPanel.vue` is the UI. Reasoning: the collection already existed, has the right shape, and zero-migration was preferred over a new table. |
| Step 2 — Ask the graph (dialectic) | ⛔ **NOT STARTED** | Blocked on Phase 2B (semantic search). |
| Step 3 — Canvas presence | ⛔ **NOT STARTED** | **Now harder than the brief assumed:** terminal streaming infrastructure was deleted in commit `9f21a9e8`, so the WebSocket relay this would have built on top of is gone. Pi worker would need a fresh Yjs client implementation. |
| Step 4 — Background reflection | ⛔ **NOT STARTED** | Depends on Steps 2 + 3. |

### Open cleanup debt (audit findings, 2026-04-07)

- **Legacy collection folders not deleted.** `apps/thinkgraph/layers/thinkgraph/collections/decisions/` and `.../workitems/` still exist on disk. `decisions` has 11 live consumers in `apps/thinkgraph/server/api/teams/[id]/thinkgraph-decisions/*` that import `getAllThinkgraphDecisions` from the collection's `queries.ts`. `workitems` is referenced only by `apps/thinkgraph/app/components/ThinkgraphWorkitemsNode.vue`, which itself appears to be unreferenced. Safe deletion requires first migrating those endpoints (or confirming they too are dead) — not done in this pass.
- **Dispatch services audited (2026-04-07), see [dispatch-services-audit.md](./dispatch-services-audit.md).** All 17 services in `apps/thinkgraph/server/utils/dispatch-services/` are registered and surfaced through one generic `DispatchModal` (no per-provider UIs ever existed). Of the 17, only `pi-agent` is on the v2 critical path — the v2 `thinkgraph_nodes` table has zero artifacts produced by any of the other 16. `research-agent` is **broken**: it imports `createThinkgraphDecision` which no longer exists in the codebase (orphaned by the Phase 0 unification). Verdicts: 1 KEEP (`pi-agent`), 1 INVESTIGATE (`research-agent`), 15 KEEP-DORMANT.
- **Migration filename collisions.** `0004_add_pinned.sql` / `0004_first_ironclad.sql` and `0009_add_user_role.sql` / `0009_grey_bruce_banner.sql` coexist. The journal (`meta/_journal.json`) references only `0004_add_pinned` and `0009_grey_bruce_banner`; the other two are orphan files not in the journal and never run by the migrator. Investigated but not deleted in this pass — see [implementation-notes.md](implementation-notes.md#migration-filename-collisions-2026-04-07) for the detailed write-up.

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
- **thinkgraphDecisions collection** — runtime is killed (Phase 0 migration shipped, `thinkgraph_nodes` is the source of truth), but the legacy collection folder and 11 server endpoints under `apps/thinkgraph/server/api/teams/[id]/thinkgraph-decisions/` are still on disk. See "Open cleanup debt" in the status section above
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
