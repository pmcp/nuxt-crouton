# ThinkGraph — Build Plan (Revised)

## One-liner

Your thinking belongs to you. Branch, explore, and merge ideas across any AI.

---

## The Problem

When working with AI on complex problems:

1. **Context pollution** — Conversations get messy. You go too far down one path and can't get back cleanly.
2. **Ideas get lost** — You say "not now" to a v2 idea and it disappears forever.
3. **Thinking is trapped** — Your insights are locked in ChatGPT's history, or Claude's, or scattered across both.
4. **Starting over** — When you revisit an old project, the reasoning that led to decisions is gone.
5. **No cross-AI workflow** — You want Claude for analysis, Gemini for divergence, Cursor for prototyping. They don't share context.

---

## The Solution

A **visual thinking graph** where:

- Every insight/decision is a **node**
- Nodes connect in a **tree structure** (parent → children)
- You can **branch** to explore different directions
- You can **star** valuable insights
- You can **park** future ideas (v2/v3) without losing them
- You can **generate portable context** from any selection
- **Any AI** can read the graph and continue
- **Multiple entry points**: auto-capture where possible, paste fallback where not

---

## What Crouton Already Provides

This plan was originally written when crouton was minimal. Now the framework provides most of the infrastructure out of the box:

| Capability | Package | What you get |
|---|---|---|
| CRUD APIs + validation | **crouton-core** | `useCollectionQuery/Mutation`, team-scoped endpoints |
| Graph visualization | **crouton-flow** | `<CroutonFlow />` with Vue Flow, dagre auto-layout, controls, minimap |
| Real-time sync | **crouton-collab** (via crouton-flow) | Yjs CRDTs, WebSocket rooms, conflict resolution |
| Presence & cursors | **crouton-collab** | `<CollabPresence />`, `<CollabCursors />`, `<CollabStatus />` |
| Auth + teams | **crouton-auth** | Better Auth, team context, sessions |
| AI integration | **crouton-ai** | `useChat()`, multi-provider (Claude, GPT, Gemini) |
| Rich text editing | **crouton-editor** | TipTap with blocks, slash commands, variables |
| Collection scaffolding | **crouton-cli** | Full CRUD generation from JSON schema |
| Position persistence | **crouton-flow** | `useFlowPositionStore()` + `flow_configs` table |
| Drag-and-drop | **crouton-flow** | `useFlowDragDrop()` for external items onto canvas |
| Custom nodes | **crouton-flow** | Auto-resolves `[Collection]Node.vue` components |
| Container grouping | **crouton-flow** | `useFlowGroupManager()`, `useFlowContainerDetection()` |

**Bottom line:** The infrastructure is done. The work is building ThinkGraph-specific UX on top.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Nuxt + crouton ecosystem | Extends crouton, crouton-flow, crouton-ai |
| Database | SQLite (local) / D1 (Cloudflare) | Via NuxtHub, team-scoped |
| Graph UI | crouton-flow (Vue Flow + dagre) | `<CroutonFlow />` with custom node |
| Real-time | crouton-collab (Yjs) | Comes free with crouton-flow |
| AI interface | crouton-ai + `llm` CLI | Multi-provider chat + CLI log import |
| Hosting | Cloudflare Pages | GitHub CI + Wrangler |

---

## Data Model

### decisions (crouton collection schema)

```json
{
  "content": {
    "type": "text",
    "meta": {
      "required": true,
      "label": "Content",
      "description": "The decision or insight text",
      "area": "main",
      "group": "details"
    }
  },
  "nodeType": {
    "type": "string",
    "meta": {
      "required": true,
      "default": "insight",
      "label": "Type",
      "description": "idea, insight, decision, question",
      "area": "sidebar",
      "group": "classification",
      "displayAs": "badge"
    }
  },
  "pathType": {
    "type": "string",
    "meta": {
      "label": "Path Type",
      "description": "diverge, deep_dive, prototype, converge, validate, park",
      "area": "sidebar",
      "group": "classification",
      "displayAs": "badge"
    }
  },
  "starred": {
    "type": "boolean",
    "meta": {
      "default": false,
      "label": "Starred",
      "description": "Marked as valuable insight",
      "area": "sidebar",
      "group": "classification"
    }
  },
  "branchName": {
    "type": "string",
    "meta": {
      "default": "main",
      "label": "Branch",
      "description": "Exploration branch name",
      "area": "sidebar",
      "group": "structure"
    }
  },
  "versionTag": {
    "type": "string",
    "meta": {
      "default": "v1",
      "label": "Version",
      "description": "v1, v2, v3, parked",
      "area": "sidebar",
      "group": "structure",
      "displayAs": "badge"
    }
  },
  "parentId": {
    "type": "string",
    "meta": {
      "label": "Parent Decision",
      "description": "Parent node for tree structure",
      "area": "sidebar",
      "group": "structure"
    }
  },
  "source": {
    "type": "string",
    "meta": {
      "label": "Source",
      "description": "llm, paste, mcp, import, manual",
      "area": "sidebar",
      "group": "provenance"
    }
  },
  "model": {
    "type": "string",
    "meta": {
      "label": "AI Model",
      "description": "Which AI model generated this",
      "area": "sidebar",
      "group": "provenance"
    }
  }
}
```

### decision-sources (for merges)

```json
{
  "decisionId": {
    "type": "string",
    "refTarget": "decisions",
    "meta": {
      "required": true,
      "label": "Decision",
      "area": "main",
      "group": "details"
    }
  },
  "sourceId": {
    "type": "string",
    "refTarget": "decisions",
    "meta": {
      "required": true,
      "label": "Source Decision",
      "area": "main",
      "group": "details"
    }
  }
}
```

---

## Path Types

| Type | Icon | Purpose | When to use |
|---|---|---|---|
| **Diverge** | `i-lucide-git-branch-plus` | Generate many options | Starting exploration, brainstorming |
| **Deep dive** | `i-lucide-microscope` | Explore one idea fully | Found something interesting |
| **Prototype** | `i-lucide-hammer` | Make it real | Validated, ready to build |
| **Converge** | `i-lucide-git-merge` | Merge insights | Multiple paths, need synthesis |
| **Validate** | `i-lucide-shield-question` | Stress-test | Challenge assumptions |
| **Park** | `i-lucide-archive` | Save for later | Good idea but not now |

---

## App Structure

```
apps/thinkgraph/
├── nuxt.config.ts
├── app.config.ts
├── crouton.config.js
├── package.json
├── wrangler.toml
├── schemas/
│   ├── decision.json
│   └── decision-source.json
├── app/
│   ├── pages/
│   │   ├── index.vue                    # Landing / project selector
│   │   └── admin/[team]/
│   │       └── graph.vue                # Main graph workspace
│   ├── components/
│   │   ├── DecisionsNode.vue            # Custom Vue Flow node (auto-resolved)
│   │   ├── ParkedNode.vue               # Dotted-border parked node variant
│   │   ├── PathTypeModal.vue            # Path type selector
│   │   ├── QuickAdd.vue                 # Paste input + parser
│   │   ├── SelectionBar.vue             # Multi-select actions
│   │   └── ContextGenerator.vue         # Brief/context generation
│   └── composables/
│       ├── useDecisionGraph.ts          # Graph-specific logic (filtering, context chains)
│       ├── useDecisionParser.ts         # Parse DECISION: blocks from pasted text
│       └── useContextGenerator.ts       # Build portable context from node paths
├── server/
│   └── api/teams/[id]/
│       ├── decisions/
│       │   ├── tree.get.ts              # Returns nodes + edges for graph
│       │   └── context/[decisionId].get.ts  # Portable context for a decision chain
│       ├── briefs/
│       │   └── generate.post.ts         # Generate brief from selected node IDs
│       └── llm/
│           └── import.get.ts            # Scan llm CLI logs, return candidates
└── layers/thinkgraph/
    └── collections/
        ├── decisions/                   # Generated by crouton-cli
        │   ├── types.ts
        │   ├── app/components/
        │   │   ├── _Form.vue
        │   │   └── List.vue
        │   ├── app/composables/
        │   │   └── useThinkgraphDecisions.ts
        │   └── server/
        │       ├── api/teams/[id]/thinkgraph-decisions/
        │       └── database/
        └── decision-sources/            # Generated by crouton-cli
```

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-flow',   // includes crouton-collab
    '@fyit/crouton-ai',     // for context generation
    './layers/thinkgraph'
  ],

  hub: {
    db: 'sqlite'
  }
})
```

### crouton.config.js

```javascript
export default {
  collections: [
    {
      name: 'decisions',
      fieldsFile: './schemas/decision.json',
      hierarchy: {
        enabled: true,
        parentField: 'parentId'
      }
    },
    {
      name: 'decision-sources',
      fieldsFile: './schemas/decision-source.json'
    }
  ],

  targets: [
    {
      layer: 'thinkgraph',
      collections: ['decisions', 'decision-sources']
    }
  ],

  dialect: 'sqlite',

  flags: {
    useTeamUtility: true,
    useMetadata: false,
    autoRelations: true,
    noTranslations: true
  }
}
```

---

## Build Phases

### Phase 1: Scaffold & Graph (core)

**Goal:** Decisions as nodes on an interactive graph.

1. **Create app scaffold**
   ```bash
   # Copy from playground template
   cp -r apps/playground apps/thinkgraph
   # Update package.json, nuxt.config.ts, wrangler.toml
   ```

2. **Generate collections**
   ```bash
   cd apps/thinkgraph
   pnpm crouton config    # generates from crouton.config.js
   pnpm run db:generate   # creates migration
   ```

3. **Build `DecisionsNode.vue`** — Custom Vue Flow node
   - Star toggle (top-left)
   - Path type icon + color
   - Content preview (truncated)
   - Branch tag
   - Version badge (v1/v2/parked)
   - Parked nodes: dotted border, dimmed opacity

4. **Build graph workspace page** (`admin/[team]/graph.vue`)
   ```vue
   <CroutonFlow
     :rows="decisions"
     collection="decisions"
     parent-field="parentId"
     label-field="content"
     :flow-id="activeFlowId"
     :saved-positions="positions"
     minimap
     @node-click="onNodeClick"
     @node-dbl-click="openDetail"
   />
   ```

5. **Build sidebar** — Branch filter, version filter, starred filter, search

---

### Phase 2: Input & Context (what makes it ThinkGraph)

**Goal:** Get decisions in, get context out.

6. **`useDecisionParser.ts`** — Parse `DECISION: {...}` blocks from pasted text
   - Accepts raw AI output
   - Extracts structured decision objects
   - Returns array for review

7. **`QuickAdd.vue`** — Paste input component
   - Textarea for pasting AI output
   - Live preview of parsed decisions
   - Add/edit/skip per decision
   - Assigns to current branch

8. **`PathTypeModal.vue`** — "What kind of path?"
   - Select path type (diverge, deep dive, prototype, converge, validate, park)
   - Select method (llm CLI, Claude, ChatGPT, Gemini, copy context)
   - Generates appropriate context/command

9. **`useContextGenerator.ts`** — Build portable context
   - Walk the decision chain from root to selected node
   - Include starred insights from other branches
   - Format as prompt-ready markdown
   - Template per path type (diverge → "Generate 5-10 approaches...", etc.)

10. **`/api/teams/[id]/decisions/context/[decisionId].get.ts`** — Server-side context generation

---

### Phase 3: Multi-select & Briefs

**Goal:** Select across branches, generate actionable output.

11. **Selection mode** — Shift+click to multi-select nodes across branches

12. **`SelectionBar.vue`** — Floating bar showing selection
    - Count + node labels
    - "Generate brief" dropdown (Markdown, AI prompt, Lovable/Cursor brief, custom)
    - "Start converge" — create a new convergence node from selection
    - "Copy context" — portable context to clipboard

13. **`/api/teams/[id]/briefs/generate.post.ts`** — Brief generation endpoint
    - Accepts `{ ids: string[], format: string }`
    - Builds context from selected decisions
    - Returns formatted brief

---

### Phase 4: Integrations

**Goal:** Automatic capture from external tools.

14. **llm CLI integration**
    - `/api/teams/[id]/llm/import.get.ts` — Read `~/.llm/logs.db`, extract candidates
    - Import UI: review, tag, assign to branch
    - `log_decision` tool definition for `llm --functions`

15. **Real-time sync** (already built into crouton-flow)
    - Enable `sync` prop on `<CroutonFlow />`
    - Configure CollabRoom Durable Object in wrangler.toml
    - Multiple tabs/users editing the graph simultaneously

16. **AI-assisted features** (via crouton-ai)
    - Auto-summarize a branch into a brief
    - Suggest path type based on conversation context
    - "What's missing?" analysis across branches

---

### Phase 5: Polish

17. **Visual refinement**
    - Branch colors (consistent per branch name)
    - Animated edges for active paths
    - Transition when nodes are starred/parked
    - Dark mode tuning

18. **Keyboard shortcuts**
    - `s` — star selected node
    - `p` — park selected node
    - `n` — new child node
    - `q` — quick add (paste)
    - `/` — search
    - `Esc` — clear selection

19. **Search & filter**
    - Full-text search across content
    - Filter by branch, version, path type, starred
    - Highlight matching nodes on graph

---

## Input Methods

| Method | Friction | How it works |
|---|---|---|
| **Manual add** | Low | Click "+" on a node, type content |
| **Paste (QuickAdd)** | Low | Paste AI output, parser extracts `DECISION:` blocks |
| **llm CLI** | Auto | `llm` auto-logs to SQLite, ThinkGraph imports |
| **llm tool** | Auto | AI calls `log_decision()` via `llm --functions` |
| **MCP Server** | Auto | Cursor/Claude Code tool integration (v2) |

---

## Context Generation Templates

When starting a path from a node, generate a prompt like:

```markdown
You are continuing an exploration.

## Path so far
D1: Version control for AI reasoning
D2: Context pollution is the real pain
D3: Decisions = compressed portable context

## Starred insights from other branches
B2: Genetic algorithms for ideas (branch: breeding)
C1: SQLite schema defined (branch: schema)

## Your task
[Template varies by path type]

## Output format
When you reach a key insight or decision, format it as:
DECISION: {"content": "your insight", "type": "insight", "branch": "current_branch"}
```

### Templates by path type

| Path type | Task prompt |
|---|---|
| Diverge | "Generate 5-10 different approaches to: [node content]" |
| Deep dive | "Go deep on: [node content]. Explore implications, edge cases, trade-offs." |
| Prototype | "Create a working prototype for: [node content]. Be specific and practical." |
| Converge | "Synthesize these insights into a unified approach: [selected nodes]" |
| Validate | "Challenge and stress-test this decision: [node content]. Find holes." |
| Park | (no AI prompt — just tags the node as parked) |

---

## V2 Features (Parked)

| Feature | Description |
|---|---|
| MCP Server | Tool integration for Cursor, Claude Code |
| AI recommendations | Track model performance per path type |
| Team collaboration | Shared graphs, permissions, notifications |
| llm-thinkgraph plugin | Native `llm` plugin |
| Browser extension | Auto-capture from any AI web interface |
| Export | Decision tree as documentation |
| Templates | Reusable graph structures for common explorations |

---

## Key Differences from Original Plan

| Original plan | Revised |
|---|---|
| Build Vue Flow integration from scratch | Use `<CroutonFlow />` — already done |
| Build Yjs sync (Phase 2) | Free — crouton-flow extends crouton-collab |
| Manual CRUD endpoints | Generated by crouton-cli |
| Raw SQL schema | crouton JSON schema format |
| `/api/decisions` endpoints | `/api/teams/[id]/thinkgraph-decisions/` (team-scoped) |
| Custom state management | `useCollectionQuery/Mutation` |
| Auth is implicit | crouton-auth with team context |
| 10 build phases | 5 focused phases |

---

## Success Criteria

1. You use it for every project
2. Ideas don't get lost
3. V2 dreams stay parked until ready
4. You never start from zero again
5. Works with any AI (llm, web interfaces, or paste)

---

## Key Principles

1. **Auto where possible, paste where not** — Multiple entry points, same destination
2. **Unix philosophy** — Small tools that compose
3. **Your thinking belongs to you** — Not trapped in any AI provider
4. **Structured parking** — v2/v3 ideas are parked, not forgotten
5. **Reduce friction incrementally** — Don't build perfect, build useful