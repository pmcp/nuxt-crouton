# Crouton + ThinkGraph: External Inspiration Analysis

**Date**: 2026-04-03
**Status**: Complete
**Repos analysed**: github/spec-kit, nuxt-content/mdc, Aft1n/nuxt-local-model, 1st1/lat.md

---

## Executive Summary

Four open-source projects each offer a distinct capability that maps onto ThinkGraph's evolution. **lat.md is the closest conceptual match** — ThinkGraph already IS a knowledge graph, and lat's `[[wiki-link]]` syntax + `lat check` validation pattern should be adopted first. **MDC is the highest-leverage integration** — rendering LLM output as interactive Vue components would differentiate ThinkGraph from every other thinking tool. **spec-kit validates ThinkGraph's existing pipeline architecture** but doesn't offer much to adopt directly. **nuxt-local-model is premature** given Cloudflare deployment constraints, but the semantic search concept it enables (via embeddings) should be designed now for future implementation.

**Build first**: Wiki-link references between nodes + `thinkgraph check` validation
**Build second**: MDC rendering in node content (LLM output → interactive components)
**Defer**: Local model inference (wait for Cloudflare/edge compatibility)
**Adopt pattern only**: Spec-kit's pipeline formalism (ThinkGraph already has this)

---

## 1. github/spec-kit — Spec-Driven Development

### What It Is

A Python CLI (`specify`) that structures AI-assisted development into a pipeline: `constitution → specify → plan → tasks → implement`. It scaffolds markdown files (specs, plans, task lists) and provides slash commands for AI agents. Extensions and presets customise the pipeline per project/org. 84k+ stars, backed by GitHub.

**Key architecture**: Templates (markdown with frontmatter) define each pipeline stage. Extensions hook into stages via `before_*` / `after_*` hooks in `extensions.yml`. Presets bundle templates + commands for specific workflows (e.g., `self-test`, `scaffold`).

### Analysis Against Crouton

#### Could crouton adopt a spec-driven generation pipeline?

**Partially — and it already does.** The crouton-cli's `design_schema → validate_schema → generate_collection` MCP flow is functionally equivalent to spec-kit's `specify → plan → implement`. The difference is that crouton operates at the **schema level** (describe fields → generate CRUD) while spec-kit operates at the **feature level** (describe scenarios → generate code).

**Actionable insight**: Crouton could formalise a `crouton specify` command that takes natural language ("I need a booking system with time slots, customers, and payments") and generates multiple collection schemas as a graph, not just one at a time. This would be a **schema graph generator** — the missing layer above `generate_collection`.

```
crouton specify "booking system with time slots, customers, payments"
  → Generates: bookings.json, timeslots.json, customers.json, payments.json
  → With: foreign key relationships, field types, validation rules
  → Via: crouton plan (review) → crouton generate (execute)
```

**Verdict**: Worth building. Low effort, high value. Extends existing MCP toolchain.

#### What would `crouton check` look like?

Spec-kit doesn't have a `check` command, but **lat.md does** (`lat check` validates all wiki links and code references). A `crouton check` should validate:

1. **Schema consistency** — all foreign key references point to existing collections
2. **Field type validity** — all field types exist in the registry
3. **Layer dependencies** — no circular extends, all referenced packages installed
4. **API completeness** — every collection has its expected CRUD endpoints
5. **Migration state** — schema matches current migration state

This maps better to lat.md's approach (see Section 4).

#### Could ThinkGraph's pipeline be formalised as a spec-kit-style specification?

**Yes, and it already is implicitly.** ThinkGraph's pipeline stages (`analyst → builder → reviewer → launcher → merger`) are defined as TypeScript types and enforced by the dispatch system. Spec-kit's contribution here is making the stages **template-driven** rather than code-driven.

Currently, each pipeline stage's behaviour is hardcoded in the dispatch API. If stages were defined as markdown templates (like spec-kit's `commands/*.md`), you could:
- Let users create custom pipelines per project
- Make stage instructions editable in-app (not just in code)
- Version pipeline definitions alongside the graph

```typescript
// Current: hardcoded in dispatch
const STAGE_PROMPTS = {
  analyst: 'You are analysing...',
  builder: 'You are building...'
}

// Proposed: schema-driven, stored as node content or project config
interface PipelineStage {
  id: string
  template: string      // MDC content with {{variables}}
  inputFrom: string[]   // preceding stage IDs
  outputTo: string[]    // following stage IDs
  assignee: 'pi' | 'human'
  skill?: string
}
```

**Verdict**: Adopt the pattern (template-driven stages), not the tool. ThinkGraph's existing architecture is more sophisticated than spec-kit's flat file approach.

#### Presets/extensions vs. crouton layers?

Spec-kit's presets are **template bundles** — a directory of markdown files that override the default templates. Extensions are **hook scripts** that run before/after pipeline stages. This maps loosely to crouton's layer architecture:

| Spec-kit | Crouton | Notes |
|----------|---------|-------|
| Preset | Layer `extends` | Both provide defaults that can be overridden |
| Extension | Nuxt module | Both hook into lifecycle events |
| `extensions.yml` | `nuxt.config.ts` | Central configuration |
| Template override | Component priority system | Both use last-wins override |

**The key difference**: Crouton layers are **runtime** (they affect the running application), while spec-kit presets are **generation-time** (they affect what gets scaffolded). Crouton already has the more powerful model.

**Verdict**: Nothing to adopt. Crouton's layer architecture is strictly more capable.

---

## 2. nuxt-content/mdc — Markdown Components

### What It Is

A Nuxt module that parses markdown containing Vue component references (`::component{prop="value"}`) into an AST, then renders them via `<MDCRenderer>`. Works standalone from Nuxt Content. Supports named slots, inline components, async rendering, and prose component overrides.

**Key architecture**: `parseMarkdown()` → unified/remark pipeline → custom AST → `<MDCRenderer>` renders AST nodes as Vue components. Components live in `components/mdc/` and are auto-discovered.

### Analysis Against Crouton

#### How would an `mdc` field type work alongside crouton-editor (TipTap)?

Two approaches:

**Option A: MDC as output format** (recommended)
TipTap editor stays as-is for authoring. A new `contentType: 'mdc'` option on editor fields would:
1. Store content as MDC-flavoured markdown (not HTML)
2. Render read-only views through `<MDCRenderer>` instead of `v-html`
3. Allow component references inside editor content

```typescript
// Collection schema
{
  name: 'content',
  type: 'editor',
  options: {
    contentType: 'mdc',  // Store as MDC markdown
    allowedComponents: ['Chart', 'Alert', 'CodeBlock']
  }
}
```

**Option B: MDC as separate field type**
A new `type: 'mdc'` field that uses a plain textarea/code editor for input and `<MDCRenderer>` for display. Simpler but less rich than TipTap.

**Verdict**: Option A is better. The TipTap editor already handles rich editing; MDC adds the rendering layer. This is a `crouton-editor` enhancement, not a new field type.

#### Could LLM output be rendered through MDC?

**This is the killer feature.** Currently, crouton-ai streams text responses. With MDC:

1. LLM generates markdown with `::component` references
2. Response is parsed through `parseMarkdown()`
3. `<MDCRenderer>` renders interactive Vue components inline

```markdown
Here's the analysis of your decision tree:

::thinkgraph-stats{nodeId="abc123"}
::

The main bottleneck is in the **reviewer** stage:

::thinkgraph-pipeline-chart{projectId="xyz" highlight="reviewer"}
::

I recommend splitting the reviewer into two sub-stages:

::thinkgraph-proposed-change{type="pipeline-modification"}
  - Add `code-reviewer` stage (automated)
  - Keep `design-reviewer` stage (human)
::
```

The LLM can reference **any registered MDC component**. This turns AI output from passive text into interactive, actionable UI.

**Implementation path**:
1. Add `@nuxtjs/mdc` to `crouton-ai` dependencies
2. Create `<CroutonAIResponse>` component that wraps `<MDCRenderer>`
3. Register ThinkGraph-specific MDC components (`thinkgraph-stats`, `thinkgraph-chart`, etc.)
4. Update AI system prompts to include available component documentation

**Verdict**: Build this. High differentiation, medium effort. Start with ThinkGraph-specific components, then generalise to crouton-ai.

#### Could ThinkGraph nodes render content through MDC?

**Yes — and this solves a real problem.** Currently, node content is stored as plain text or TipTap HTML. With MDC rendering:

- **Decision nodes** could contain embedded charts, linked node previews, interactive polls
- **Pipeline output** could include actionable buttons ("Apply this suggestion", "Dismiss")
- **Research nodes** could embed live data visualisations

The node `content` field would store MDC markdown. The `<NodeDetail>` component would render it through `<MDCRenderer>` instead of `v-html`.

```vue
<!-- Current -->
<div v-html="node.content" />

<!-- Proposed -->
<MDC :value="node.content" tag="div" />
```

**Verdict**: Build this as part of the MDC integration. Straightforward once `@nuxtjs/mdc` is added.

---

## 3. Aft1n/nuxt-local-model — Local HuggingFace Inference

### What It Is

A Nuxt module wrapping `@huggingface/transformers` (Transformers.js). Provides `useLocalModel()` for browser inference and `getLocalModel()` for server inference. Supports worker threads, model prewarming, configurable tasks (embedding, classification, generation, etc.). Very new (v0.1.10, 2 weeks old).

**Key architecture**: Alias-based model registry in `nuxt.config.ts`. Auto-imported composables. Server uses `onnxruntime-node`, browser uses `onnxruntime-web`. Worker thread isolation optional.

### Analysis Against Crouton

#### Could crouton-ai support local models alongside cloud providers?

**Architecturally yes, practically constrained.** The crouton-ai provider pattern (`createAIProvider(event)`) already abstracts over multiple cloud providers. Adding a local provider would fit the pattern:

```typescript
// Hypothetical
const providers = {
  openai: { ... },
  anthropic: { ... },
  local: {
    model: (alias: string) => getLocalModel(alias),
    // Limited to embedding, classification — not chat
  }
}
```

**But**: nuxt-local-model's `onnxruntime-node` dependency **won't work on Cloudflare Workers**. ThinkGraph deploys to Cloudflare Pages. This means local models are only viable:
1. **Browser-side** — `useLocalModel()` in Vue components (works)
2. **Separate Node.js service** — standalone API that ThinkGraph calls (works but adds infra)
3. **Dev-only** — local dev server with `getLocalModel()` (works)

**Verdict**: Don't integrate yet. The module is too young and the deployment constraint is blocking. Revisit when either (a) Cloudflare supports ONNX runtime, or (b) ThinkGraph adds a separate worker service.

#### Semantic search as a schema-level feature?

**This is the right abstraction, regardless of implementation.** The idea:

```typescript
// Collection schema
{
  name: 'content',
  type: 'editor',
  search: 'semantic'  // Auto-generate embeddings on save
}
```

When `search: 'semantic'` is set:
1. On create/update, content is sent to an embedding model
2. Embedding vector is stored alongside the record
3. A `searchSemantic(query, collection)` composable does cosine similarity search

**The embedding model doesn't have to be local.** OpenAI's `text-embedding-3-small` or Anthropic's embeddings work from Cloudflare. The schema-level declaration is what matters — the provider is configurable.

```typescript
// nuxt.config.ts
crouton: {
  search: {
    provider: 'openai',          // or 'local' when available
    model: 'text-embedding-3-small',
    dimensions: 256
  }
}
```

**Storage**: SQLite doesn't have native vector support, but `sqlite-vss` or a simple brute-force cosine similarity over a JSON column works for ThinkGraph's scale (thousands of nodes, not millions).

**Verdict**: Design the schema-level API now. Implement with cloud embeddings first. Swap to local models later.

#### ThinkGraph node auto-embedding?

**High value.** "Find decisions similar to this one across all branches" is a core ThinkGraph use case. Implementation:

1. Every node gets an `embedding` column (JSON array of floats)
2. On node create/update, call embedding API
3. New composable: `useSimilarNodes(nodeId, { limit: 10 })`
4. UI: "Similar nodes" panel in `<NodeDetail>`

This would also enable:
- **Cluster detection** — auto-group semantically similar nodes
- **Gap analysis** — "What areas of the graph are under-explored?"
- **Context building** — when dispatching to AI, include semantically relevant nodes, not just ancestors

**Verdict**: Build after MDC integration. Medium effort, high value for ThinkGraph specifically.

---

## 4. 1st1/lat.md — Knowledge Graph in Markdown

### What It Is

A CLI tool that maintains a `lat.md/` directory of interconnected markdown files. Sections link to each other with `[[wiki links]]` and to source code with `[[src/file.ts#symbol]]`. Source files link back with `// @lat: [[section-id]]` comments. `lat check` validates all references. `lat search` does semantic search via embeddings. `lat expand` resolves `[[refs]]` into full content for AI context.

**Key architecture**: Markdown parser with custom `[[wiki-link]]` extension → `Lattice` data structure (sections, refs, backlinks) → CLI commands operate on the lattice. MCP server exposes the same operations.

### Analysis Against Crouton

#### Could crouton's collection schema function as a knowledge graph?

**Yes — and the mechanism already partially exists.** Crouton collections with `parentId` fields create tree structures. Foreign key fields (`projectId`, `teamId`) create cross-collection links. What's missing is:

1. **Inline references** — `[[wiki-link]]` syntax inside text/editor fields
2. **Backlink resolution** — "What links to this record?"
3. **Reference validation** — "Are all `[[links]]` valid?"

Implementation for crouton:

```typescript
// Field-level config
{
  name: 'content',
  type: 'editor',
  options: {
    wikiLinks: true,  // Enable [[collection/id]] syntax
    wikiLinkFormat: '[[collection/id#field]]'
  }
}

// Server-side resolution
const backlinks = await getBacklinks('nodes', nodeId)
// Returns: [{ collection: 'nodes', id: 'abc', field: 'content', excerpt: '...' }]
```

**Verdict**: Worth building as a `crouton-core` feature. Benefits any crouton app, not just ThinkGraph.

#### Could `crouton prompt` expand collection references?

**This maps directly to lat's `lat expand`.** The idea:

```bash
crouton prompt "Fix the issue with [[nodes/abc123]]"
# Expands to:
# Fix the issue with:
# Node: "Pipeline timeout on large graphs"
# Status: active, Template: task
# Content: "The pipeline times out when..."
# Children: [def456, ghi789]
# Project: "ThinkGraph v2"
```

This is essentially what crouton-mcp-toolkit already does — `get-item` resolves a collection record into full context. The missing piece is **inline expansion syntax** that works in natural language prompts.

**Implementation**: A `expandReferences(text: string)` utility that:
1. Parses `[[collection/id]]` and `[[collection/id#field]]` patterns
2. Fetches each referenced record via the collection API
3. Replaces references with formatted context blocks
4. Returns expanded text ready for LLM consumption

**Verdict**: Build this. It's a thin wrapper over existing crouton-mcp-toolkit functionality.

#### ThinkGraph as a knowledge graph with wiki links?

**This is the most natural fit of any analysed repo.** ThinkGraph IS a knowledge graph. The current linking mechanism is structural (parent-child edges in the graph). Wiki links add **semantic, inline references** — a node's content can reference other nodes, external docs, or code.

**Proposed implementation**:

1. **Wiki-link syntax in node content**: `[[node:abc123]]`, `[[project:xyz]]`, `[[path:main/branch]]`
2. **TipTap extension** for wiki-link autocomplete (type `[[` → search nodes → insert link)
3. **Backlinks panel** in NodeDetail ("Referenced by: Node A, Node B")
4. **`thinkgraph check`** — validate all node references are valid (no broken links)
5. **`thinkgraph prompt`** — expand a node's content with all referenced context

```vue
<!-- In TipTap editor, typing [[ triggers autocomplete -->
<CroutonEditorSimple
  v-model="node.content"
  :extensions="[wikiLinkExtension]"
/>

<!-- Backlinks panel -->
<BacklinksPanel :node-id="node.id" />
<!-- Shows: "3 nodes reference this node" with links -->
```

**`thinkgraph check` validation**:
- All `[[node:id]]` references point to existing nodes
- All `[[project:id]]` references point to existing projects
- All `[[path:...]]` references have valid graph paths
- Broken references are flagged with suggestions ("Did you mean [[node:abc124]]?")

**`thinkgraph prompt` context expansion**:
- Given a node, recursively expand all `[[references]]` into full content
- Respect depth limits (default: 2 levels)
- De-duplicate (don't expand the same node twice)
- Output: structured context document suitable for AI consumption

**Verdict**: Build this first. It's the highest-impact integration for ThinkGraph and provides infrastructure that MDC rendering and semantic search build upon.

---

## Convergence Analysis

### How do these four projects converge on what ThinkGraph is trying to be?

ThinkGraph is becoming an **AI-augmented knowledge graph with executable pipelines**. Each repo contributes a distinct capability:

```
                    ThinkGraph
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   Structure        Content         Intelligence
        │               │               │
  ┌─────┴─────┐   ┌────┴────┐    ┌────┴─────┐
  │           │   │         │    │          │
spec-kit   lat.md  MDC    crouton-ai  local-model
  │           │   │         │    │          │
pipeline   links  render   generate  embed/search
formalism  validation  components  text    vectors
```

- **spec-kit** validates that pipelines should be **template-driven and customisable** (ThinkGraph already has this)
- **lat.md** provides the **linking and validation** layer ThinkGraph is missing (wiki links, `check`, `expand`)
- **MDC** provides the **rendering** layer that turns text into interactive components
- **nuxt-local-model** provides **intelligence at the edge** (embeddings, classification) — deferred but designed for

### The convergent vision

ThinkGraph nodes contain **MDC-formatted content** with **wiki-link references** to other nodes. When a node is dispatched to an AI pipeline, `thinkgraph prompt` **expands all references** into rich context. The AI generates MDC output with **interactive components**. `thinkgraph check` **validates** all references on save. Semantic embeddings enable **similarity search** across the entire graph.

### Priority order

| Priority | What | From | Effort | Impact |
|----------|------|------|--------|--------|
| 1 | Wiki-link references + `thinkgraph check` | lat.md | Medium | High — structural foundation |
| 2 | MDC rendering in node content + AI output | mdc | Medium | High — UI differentiation |
| 3 | `thinkgraph prompt` / `crouton prompt` | lat.md | Low | High — better AI context |
| 4 | Semantic search / embeddings (cloud) | nuxt-local-model concept | Medium | Medium — discovery feature |
| 5 | Schema-level `search: 'semantic'` | nuxt-local-model concept | Medium | Medium — generalised crouton feature |
| 6 | `crouton specify` (multi-collection gen) | spec-kit | Low | Low — tooling improvement |
| 7 | Template-driven pipeline stages | spec-kit | High | Low — current system works |
| 8 | Local model inference | nuxt-local-model | High | Low — blocked by Cloudflare |

---

## Bonus: Repo Watchlist Feature

### Design

A **Repo Watchlist** is a ThinkGraph project-level feature that monitors external GitHub repositories and generates digest nodes on the graph.

#### Data Model

```typescript
// New collection: thinkgraph-watchlist
interface WatchlistEntry {
  id: string
  teamId: string
  projectId: string
  repoUrl: string          // e.g., "github.com/1st1/lat.md"
  repoOwner: string
  repoName: string
  watchScope: 'releases' | 'commits' | 'issues' | 'all'
  filters?: {
    labels?: string[]      // Only issues with these labels
    paths?: string[]       // Only commits touching these paths
    authors?: string[]     // Only from these authors
  }
  lastCheckedAt: string    // ISO timestamp
  lastDigestNodeId?: string
  enabled: boolean
}

// Daily digest node (uses existing ThinkGraph node schema)
interface DigestNode extends ThinkgraphNode {
  template: 'meta'
  origin: 'watchlist'
  metadata: {
    digestDate: string     // "2026-04-03"
    watchlistEntryId: string
    changeCount: number
  }
}
```

#### Architecture

```
┌─────────────────────────────────────────────────┐
│  Scheduled Worker (thinkgraph-worker)            │
│                                                   │
│  Every morning at 06:00 UTC:                      │
│  1. Fetch all enabled watchlist entries            │
│  2. For each entry, query GitHub API:              │
│     - GET /repos/{owner}/{repo}/releases (since)   │
│     - GET /repos/{owner}/{repo}/commits (since)    │
│     - GET /repos/{owner}/{repo}/issues (since)     │
│  3. Filter by watchScope and filters               │
│  4. If changes found:                              │
│     a. Create digest parent node                   │
│       "📡 Daily Digest: lat.md — 2026-04-03"      │
│     b. For each relevant change, create child node │
│       "🔖 v1.2.0 — Added MCP server support"      │
│       "📝 PR #47 — Wiki link validation rewrite"   │
│     c. Link digest node to project root             │
│  5. Update lastCheckedAt                           │
└─────────────────────────────────────────────────┘
```

#### Child Node Structure

Each child node is a **first-class ThinkGraph node** that can be:
- **Branched from** — "This release inspires a new feature for us"
- **Linked** — `[[node:digest-child-123]]` from any other node
- **Fed into the pipeline** — dispatch to analyst for deeper analysis
- **Dismissed** — mark as `done` to archive

```typescript
// Example child node for a new release
{
  template: 'research',
  title: '🔖 lat.md v1.3.0 — Semantic search via embeddings',
  content: `
## Release: lat.md v1.3.0 (2026-04-02)

**Key changes:**
- Added \`lat search\` command with OpenAI embeddings
- New \`lat mcp\` server for editor integration
- Breaking: Renamed \`lat find\` to \`lat locate\`

**Relevance to ThinkGraph:**
- Semantic search pattern directly applicable to node search
- MCP server pattern validates our crouton-mcp-toolkit approach

::thinkgraph-action-buttons{nodeId="self"}
  Branch from this | Dismiss | Dispatch to analyst
::
  `,
  origin: 'watchlist',
  status: 'idle',
  parentId: digestParentNodeId,
  metadata: {
    source: 'github',
    repoUrl: 'https://github.com/1st1/lat.md',
    releaseTag: 'v1.3.0',
    releaseUrl: 'https://github.com/1st1/lat.md/releases/tag/v1.3.0'
  }
}
```

#### AI Enhancement (Optional)

When creating digest child nodes, optionally run each through crouton-ai to:
1. Summarise the change in context of the ThinkGraph project
2. Rate relevance (high/medium/low)
3. Suggest connections to existing nodes
4. Auto-generate `[[wiki-link]]` references to related nodes

This turns the watchlist from a passive feed into an **active contributor** to the knowledge graph.

#### UI

- **Settings > Watchlist**: Manage watched repos, configure filters
- **Graph view**: Digest nodes appear as a special cluster, visually distinct (e.g., satellite icon)
- **Notification**: Badge on project when new digest available
- **Digest panel**: Dedicated view showing all unprocessed digest items across repos

#### Implementation Notes

- Uses existing `thinkgraph-worker` (Cloudflare Worker with cron triggers)
- GitHub API rate limit: 5,000 req/hour authenticated — sufficient for ~100 watched repos
- Could extend beyond GitHub: RSS feeds, npm registry, Hacker News, arXiv
- Digest frequency configurable per entry (daily, weekly, on-release-only)

---

## Recommendations Summary

### Build Now (Q2 2026)

1. **Wiki-link system** — TipTap `[[` extension, backlinks resolution, `thinkgraph check`
2. **MDC integration** — `@nuxtjs/mdc` in crouton-ai, `<CroutonAIResponse>` component, MDC node rendering
3. **`thinkgraph prompt`** — Reference expansion for AI context building

### Build Next (Q3 2026)

4. **Semantic embeddings** — Cloud-based (OpenAI), `useSimilarNodes()`, schema-level `search: 'semantic'`
5. **Repo Watchlist** — Cron worker, GitHub API, digest node generation

### Defer

6. **Local model inference** — Blocked by Cloudflare. Revisit when edge AI runtime matures
7. **Template-driven pipeline stages** — Current code-driven approach works; invest only if users demand custom pipelines
8. **`crouton specify`** — Nice-to-have for crouton CLI, low priority vs ThinkGraph features

### Reject

- **Adopting spec-kit as a dependency** — ThinkGraph's pipeline is already more sophisticated
- **Replacing TipTap with MDC for authoring** — MDC is a rendering format, not an authoring format; keep TipTap for editing
- **Running ONNX models on Cloudflare Workers** — Technically impossible today
