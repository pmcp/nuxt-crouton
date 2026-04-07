# ThinkGraph Convergence — Implementation Brief

**Date:** 2026-04-03
**Status:** Ready to build
**Based on:** [Research report](../reports/crouton-thinkgraph-research-report-20260403.md) (validated)
**Context:** [Original agent brief](crouton-thinkgraph-agent-brief.md)

---

## What This Is

An actionable implementation plan for ThinkGraph's next evolution. Four external projects were analyzed (spec-kit, MDC, nuxt-local-model, lat.md), validated against the actual codebase, and distilled into a tiered build plan.

**The meta-insight:** All four projects solve the same problem — making knowledge navigable and actionable for AI agents. ThinkGraph already has the strongest foundation (structured schema, visual graph, dispatch system, MCP tools) but lacks validation, rich rendering, semantic search, and external signal ingestion.

---

> **Status note (2026-04-07 PM re-audit):** The "What ThinkGraph Has Today" / "What's Missing" sections below were written at the *start* of the convergence brief and are now stale. For current code state see the status table in [brief.md](brief.md#status-as-of-2026-04-07-re-audited-end-of-day). Short version: most "missing" items are now ✅ shipped or 🟡 partial. The phase descriptions further down are still useful as design references.

## What ThinkGraph Has Today

| Capability | Implementation |
|-----------|---------------|
| Unified node model | `thinkgraph_nodes` — template (idea/research/task/feature/meta), steps, status, brief, output, artifacts. Phase 0 cleanup complete (commit `b10beff6`). |
| Visual graph | Vue Flow canvas with tree hierarchy + context edges (fan-in from contextNodeIds, synthesis artifacts) |
| AI expand | 5 modes: diverge, deep_dive, prototype, converge, validate |
| Dispatch services | **16 services** (was 17 — `research-agent` removed in commits `22f6f452`/`a98189bc`). Only `pi-agent` is on the v2 critical path; the other 15 are dormant. |
| MCP tools | **11 tools** (was 8): create-node, update-node, search-graph, expand-node, get-digest, resume-graph, store-artifact, get-thinking-path, **check-graph** (Phase 1B), **search-similar** (Phase 2B), **get-graph-overview**. All unscoped — Pi receives the full set regardless of pipeline stage. |
| Context assembly | 3 scopes (full/branch/manual), progressive disclosure (index→expanded→full), 12K token budget. Per-step token usage tracked in worker. |
| Multi-select | Shift+click selection, synthesizeSelected(), brief generation, export |
| Integrations | Notion sync, project sharing (public shareToken), graph digest, real-time collab (Yjs). **Pi worker is now a full Yjs participant** via `apps/thinkgraph-worker/src/yjs-{client,pool}.ts` — writes `appendAgentLog`/`setAgentStatus` to per-canvas Y.Docs in real time (no UI consumer yet). |
| External input | InjectRequest collection + Phase 2A `watchedrepos`/`watchreports` collections + cron runner `apps/thinkgraph/server/api/cron/watch-repos.post.ts`. No canvas inbox UI yet. |
| Graph validation | `validateGraph` server util at `apps/thinkgraph/server/utils/validate-graph.ts` — 7 checks including `stuck-worker` for Pi-stranded nodes (commit `4be788b2`). Exposed via `check-graph` MCP tool and `GET /api/teams/[id]/thinkgraph-nodes/validate`. |
| Semantic search | Cloudflare Vectorize index (1536 dims, OpenAI `text-embedding-3-small`). `embeddings.ts` + `search-similar.ts` + admin backfill (`apps/thinkgraph/server/api/admin/backfill-embeddings.post.ts`). **Auto-indexing on node create/update is NOT wired** — relies on manual backfill. |

## What's Missing (re-audited 2026-04-07 PM)

1. ~~No graph validation~~ → ✅ shipped (Phase 1B), but no scheduled runner and no canvas visual indicators on invalid nodes.
2. **No rich output rendering** — `@nuxtjs/mdc` installed and `<MDC>` used in `NodeDetail.vue`, but no custom ThinkGraph MDC components built and dispatch services don't emit MDC syntax.
3. **No live cross-referencing on save** — wiki-link parser/resolver/validator all exist, but no node mutation calls `resolveWikiLinksForNode()` and there's no clickable wiki-link rendering in `NodeDetail.vue`.
4. ~~No semantic search~~ → ✅ infrastructure shipped (Phase 2B), but no auto-index hook on write and no "Find similar" UI button.
5. ~~No external signal ingestion~~ → 🟡 collections + cron runner shipped (Phase 2A), but no canvas inbox-zone UI and the legacy `sync-changelogs` action is still parallel to it.
6. **No pipeline formalization** — Phase 2C still untouched. Steps are still hardcoded in `NODE_TYPE_STEPS`.
7. **No conversation context in dispatch (NEW critical gap)** — dispatch flow at `work-item.post.ts` doesn't include `chatconversations` messages in the Pi context payload. The premise of "conversation as the most valuable execution context" is broken in practice.
8. **No UI rendering of agent activity (NEW critical gap)** — Pi worker writes `agentLog`/`agentStatus` to Yjs in real time but no Vue component subscribes. Smallest gap with the highest visible payoff.
9. **No durable worker→app delivery layer** — Apr 7 502 storm exposed this. Patched at the *detection* level via `stuck-worker` validator + one-shot reconciliation, but no outbox / retry / idempotency story. Tracked separately.

---

## Build Plan

### Phase 1 — Immediate (1-2 weeks)

Three features that build on existing infrastructure with no new external dependencies.

#### 1A. MDC Output Rendering

**What:** Replace plain text node output with MDC-rendered content. AI dispatch services generate MDC markdown with `::component` references. ThinkGraph renders interactive components in node output.

**Why first:** Immediate visual impact. Makes AI output dramatically more useful. No backend changes.

**Key decision:** Install `@nuxtjs/mdc` as standalone module (no Nuxt Content dependency).

**Watch out for:** Shiki adds 6 `@shikijs/*` packages — disable syntax highlighting in config if bundle size is a concern. No sandboxing of rendered components (don't render untrusted user MDC without review).

**What to build:**
- Install `@nuxtjs/mdc` in ThinkGraph app
- Create 5-8 ThinkGraph MDC components: `::chart`, `::data-table`, `::code-block`, `::mermaid`, `::image-gallery`, `::alert`, `::callout`
- Update NodeDetail to render output via `<MDCRenderer>` instead of raw text
- Update dispatch services to generate MDC syntax in their output
- Store parsed AST in `artifacts` for caching (AST is serializable JSON)

**Source:** [@nuxtjs/mdc](https://github.com/nuxt-content/mdc) — v0.21.1, 395 stars, actively maintained, standalone

---

#### 1B. Graph Validation (`thinkgraph check`)

**What:** Validate graph integrity: broken contextNodeIds, orphaned nodes (no parent, not root), duplicate titles at same depth, nodes stuck in `active` status >24h.

**Why second:** Low effort, prevents graph rot. Foundation for wiki-link validation in 1C.

**What to build:**
- Server utility: `validateGraph(teamId, projectId)` → returns array of validation errors
- MCP tool: `check-graph` for agent use
- Visual indicators on canvas for invalid nodes (red outline, warning icon)
- API endpoint: `GET /api/teams/[id]/thinkgraph-nodes/validate`
- Optional: scheduled Nitro task for nightly validation

**Inspired by:** lat.md's `lat check` (validates all wiki links resolve, dead code refs, missing backlinks)

---

#### 1C. Wiki-Link Cross-References

**What:** Allow `[[node title]]` or `[[#nodeId]]` syntax in node briefs and outputs. Parse on save, resolve to node IDs, create bidirectional context edges. Display as clickable links.

**Why here:** Formalizes cross-referencing that's currently manual (raw contextNodeIds). Makes the graph navigable for both humans and AI.

**Key decision:** Use MDC's remark pipeline (installed in 1A) for parsing instead of building a separate regex parser.

**What to build:**
- Remark plugin to parse `[[wiki links]]` in brief/output text
- Server-side resolution: `[[node title]]` → nodeId lookup (fuzzy match within project)
- On save: extract links, update `contextNodeIds` automatically
- On render: convert to clickable links that select/focus the referenced node on canvas
- `thinkgraph check` extension (from 1B): validate all wiki links resolve

**Inspired by:** lat.md's `[[wiki links]]` + backlinks system

---

### Phase 2 — Next month

Requires new infrastructure (Vectorize, GitHub API, pipeline schemas).

#### 2A. Repo Watchlist + Daily Digest

**What:** Auto-generate daily digest nodes from watched GitHub repos. Each meaningful change becomes a child node with suggested actions. The graph grows with external signals, not just manual thinking.

**Why:** Highest-value feature for turning ThinkGraph from a "thinking tool" into an "intelligence feed."

**Existing infrastructure (replaces):** The `sync-changelogs` GitHub Action (`.github/workflows/sync-changelogs.yml` + `apps/docs/scripts/sync-changelogs.ts`) already does the core loop: daily cron → fetch GitHub releases for 14 tracked repos → AI summary via Claude Haiku → store results. Currently outputs to a flat JSON file (`apps/docs/data/changelog-releases.json`) that feeds the docs changelog page. This feature **replaces** that action by moving the same flow into ThinkGraph collections, where results become actionable graph nodes instead of static JSON. The docs changelog page can read from ThinkGraph's API instead.

**What already works (from sync-changelogs):**
- GitHub releases API fetching with rate-limit handling
- AI summary generation (importance rating, breaking changes, new features, relevance score)
- Tracked repos config (`apps/docs/data/changelog-packages.json`): nuxt, vue, @nuxt/ui, drizzle-orm, better-auth, @vueuse/core, ai, stripe, typescript, @nuxtjs/i18n, @nuxthub/core, zod, @nuxt/content, nitro

**What's new:**
- Data stored in ThinkGraph collections instead of flat JSON
- `whyInteresting` strategic context per repo (for smarter AI relevance filtering)
- Commit + docs change tracking, not just releases
- Canvas inbox zone integration
- Actionable nodes (park/dismiss/act) instead of passive changelog entries

**Collections to create:**

`watched_repos` — repoUrl, name, description, whyInteresting (strategic context for relevance AI), relatesTo (tags), checkFrequency (daily/weekly), lastCheckedAt, lastKnownSha, lastKnownRelease, active

`watch_reports` — date, watchedRepoId (ref), changeType (release/commits/docs/breaking), summary, relevance, suggestedTemplate (idea/research/task/feature), suggestedActions (JSON), status (unread/acted/parked/dismissed), digestNodeId, childNodeId

**Scheduled job:** Nitro scheduled task (Cloudflare cron trigger) iterates repos → GitHub API (releases + commits since last check) → filter noise → AI relevance assessment → create digest parent node (template: meta, origin: ai) → create child nodes per change

**Canvas integration:** Digest nodes appear in an "inbox zone" (top-right). Visual: newspaper icon, dashed border, `origin: ai` badge. User drags to main graph to act, right-clicks to park/dismiss.

**Migration:** Seed `watched_repos` from existing `changelog-packages.json`. Import existing `changelog-releases.json` entries as initial `watch_reports`. Then delete the GitHub Action workflow, the sync script, and the JSON data files.

**Auth:** `GITHUB_TOKEN` env var (PAT, public_repo scope). 14 repos = ~42 API calls/day.

**Cost:** ~$0.30/month (GitHub API free, AI summary ~$0.01/day, Cloudflare cron free).

**Seed repos:** Keep all 14 from existing config + add: spec-kit, mdc, nuxt-local-model, lat.md, polaris-vue.

**Full schema designs:** See research report appendix.

---

#### 2B. Semantic Search (Workers AI + Vectorize)

**What:** Embed node content at write time, store vectors, query by similarity. "Find nodes like this one."

**Stack (all Cloudflare-native, zero external infra):**

| Component | Product | Purpose | Cost |
|-----------|---------|---------|------|
| Embedding generation | Workers AI `@cf/baai/bge-base-en-v1.5` | Turn text into 768-dim vector | $0.067/M input tokens |
| Vector storage + search | **Cloudflare Vectorize** | Store vectors, ANN nearest-neighbor queries | $0.01/M queried dims |
| Content storage | D1 (existing) | Node metadata, briefs, output | Already in use |
| Optional reranking | Workers AI `@cf/baai/bge-reranker-base` | Rerank combined results | $0.003/M tokens |

**NOT D1 for vectors.** D1 has no vector operations. Vectorize is purpose-built for this.

**Architecture:**
```
Node create/update
  → Workers AI embed (title + brief + output)
  → Vectorize upsert (nodeId, vector)
  → D1 stores content as before

"Find similar" query
  → Workers AI embed query text
  → Vectorize nearest neighbors → top-N nodeIds
  → D1 fetch full records
  → UI highlights on canvas
```

**What to build:**
- Vectorize index: `thinkgraph-nodes` (768 dims, cosine metric)
- Server hook on node create/update: embed via Workers AI, upsert to Vectorize
- API: `POST /api/teams/[id]/thinkgraph-nodes/search-similar`
- MCP tool: `search-similar`
- UI: "Find similar" button on node detail → highlights similar nodes on canvas

**Estimated cost:** ~$0.31/month for 10K nodes queried 1K times/day.

**Why Vectorize, not D1:** Vectorize uses HNSW index structures for O(log n) similarity search. D1 would require loading all vectors into memory for O(n) brute-force — unusable past a few hundred nodes.

---

#### 2C. Pipeline Formalization

**What:** Make pipeline steps schema-driven. Each step has: name, description, input spec, output spec, validation criteria, AI prompt template.

**What to build:**
- `pipeline_steps` config (collection or project-level config): step name, prompt template, validation rules, expected output format
- Update `steps` JSON field to reference step definitions by ID
- Step execution engine: iterate steps → assemble context per step → validate output → advance
- Constitution layer: per-project rules every step must respect ("always cite sources", "max 500 words")

**Why tier 2:** Current steps system works. Formalization adds value when pipelines get complex or are shared across projects.

**Inspired by:** spec-kit's constitution gates and validation-at-every-stage pattern.

---

### Phase 3 — Future

| Item | What | Why deferred |
|------|------|-------------|
| 3A. Spec-driven collection generation | `crouton specify`: natural language → schema JSON → code | Current JSON → code pipeline works well |
| 3B. `crouton check` | Validate schema graph across all collections | Not needed until 20+ collections |
| 3C. Local model provider | Transformers.js adapter for crouton-ai | Workers AI covers this; full Transformers.js needs separate Node.js service |
| 3D. Source code annotations | `// @crouton: [[collection#field]]` traceability | Generated code already traceable by path; annotations wouldn't survive regeneration |

### Rejected

- **spec-kit as dependency** — Python CLI, Node.js friction. Take the ideas (constitution, validation gates), not the tool.
- **nuxt-local-model as dependency** — Won't run on Cloudflare Workers (native C++ addon). Use Workers AI instead.
- **lat.md as dependency** — ThinkGraph's structured nodes are more powerful than freeform markdown sections. Take wiki-link syntax and validation concepts.

---

## Key Decisions for Each Phase

### Phase 1 decisions (make before starting)
1. **MDC component set** — which 5-8 components to build first? Suggest: chart, data-table, code-block, mermaid, alert. Add image-gallery and callout if time permits.
2. **Wiki-link resolution** — fuzzy match on title, or require exact match? Fuzzy is friendlier but may produce false positives in large graphs.
3. **Validation severity** — are broken contextNodeIds errors or warnings? Suggest: errors for missing nodes, warnings for stale references.

### Phase 2 decisions (make before starting)
4. **Vectorize index scope** — one index per project, or one global index with project metadata filtering?
5. **Digest node positioning** — fixed inbox zone, or smart auto-layout that avoids existing nodes?
6. **Pipeline step storage** — new collection vs. project-level config? Collection is more flexible but may be over-engineered for the current node count.

---

## Reference

- [Research report](../reports/crouton-thinkgraph-research-report-20260403.md) — full analysis + validation appendix
- [Original agent brief](crouton-thinkgraph-agent-brief.md) — the research task that produced the report
- [ThinkGraph v2 docs](../projects/thinkgraph-v2/) — prior design documents
