# ThinkGraph — Build Plan

## One-liner

Multi-project control panel for crouton apps. Pi.dev builds, you steer.

---

## Context: Where This Fits

ThinkGraph is the **PM and orchestration layer** for the crouton platform. It sits above the skill chain and AI workers:

```
Client describes what they need
        ↓
ThinkGraph: project + work items visible on a canvas
        ↓
Skills execute: /discover → /architect → /generate → /compose → /brand
        ↓
Pi.dev: does the actual work (runs skills, CLI, code generation)
        ↓
ThinkGraph: captures results, routes to review, tracks deploys
        ↓
Client sees progress, gives feedback
        ↓
Loop
```

The **Designer app pivot** (building a visual schema builder) was replaced by **skills** — conversational steps that decompose work. ThinkGraph doesn't replace skills; it's the **control room where you see which skills have run, what's next, and who needs to act.**

For the broader Atelier vision (non-technical users getting crouton apps via conversation), ThinkGraph is the professional's interface — the dashboard you use when you're managing 5+ client apps simultaneously.

---

## The Problem

When running multiple crouton apps for different clients simultaneously:

1. **No overview** — Each app is a separate worktree, a separate Pi conversation, a separate mental context. Nothing shows the full picture.
2. **Context switching is expensive** — Jumping between client projects means losing your place. "Where was I on client B's app?"
3. **AI work is invisible** — Pi is building something in a worktree, but you can't see progress without switching terminals.
4. **Client communication gap** — No way to show a client what's in progress, what's deployed, what needs their input.
5. **Handoffs fall through** — "This needs review" lives in your head, not in a system. Things get forgotten when you're juggling 5 apps.

---

## The Solution

A **project control panel** where:

- Each **crouton app** is a canvas with its active work visible
- **Work nodes** map to skill chain stages — not arbitrary tasks, but the actual steps of building a crouton app
- **Pi.dev** is dispatched directly from nodes — send work, get results back
- **Status is visible at a glance** — what's building, what's blocked, what needs your input, what's deployed
- **Clients can see their project** — read-only view with feedback capability
- **You open it every morning** and know exactly where everything stands

---

## What Crouton Already Provides

| Capability | Package | What you get |
|---|---|---|
| CRUD APIs + validation | **crouton-core** | `useCollectionQuery/Mutation`, team-scoped endpoints |
| Graph visualization | **crouton-flow** | `<CroutonFlow />` with Vue Flow, dagre auto-layout, controls, minimap |
| Real-time sync | **crouton-collab** (via crouton-flow) | Yjs CRDTs, WebSocket rooms, conflict resolution |
| Presence & cursors | **crouton-collab** | `<CollabPresence />`, `<CollabCursors />`, `<CollabStatus />` |
| Auth + teams | **crouton-auth** | Better Auth, team context, sessions |
| Rich text editing | **crouton-editor** | TipTap with blocks, slash commands, variables |
| Collection scaffolding | **crouton-cli** | Full CRUD generation from JSON schema |
| Position persistence | **crouton-flow** | `useFlowPositionStore()` + `flow_configs` table |

**Bottom line:** The infrastructure is done. The work is building ThinkGraph-specific UX on top.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Nuxt + crouton ecosystem | Extends crouton, crouton-flow, crouton-ai |
| Database | SQLite (local) / D1 (Cloudflare) | Via NuxtHub, team-scoped |
| Graph UI | crouton-flow (Vue Flow + dagre) | `<CroutonFlow />` with custom nodes |
| Real-time | crouton-collab (Yjs) | Comes free with crouton-flow |
| AI Worker | Pi.dev (HTTP dispatch) | RPC or SDK integration |
| Hosting | Cloudflare Pages | GitHub CI + Wrangler |

---

## Data Model

### projects (crouton collection)

One project = one crouton app = one client.

```json
{
  "name": {
    "type": "string",
    "meta": {
      "required": true,
      "label": "Project Name",
      "description": "Client or app name",
      "area": "main",
      "group": "details"
    }
  },
  "appId": {
    "type": "string",
    "meta": {
      "label": "Crouton App",
      "description": "apps/ directory name (e.g., velo, clientapp)",
      "area": "sidebar",
      "group": "config"
    }
  },
  "repoUrl": {
    "type": "string",
    "meta": {
      "label": "Repository",
      "description": "Git repo URL if separate from monorepo",
      "area": "sidebar",
      "group": "config"
    }
  },
  "deployUrl": {
    "type": "string",
    "meta": {
      "label": "Live URL",
      "description": "Deployed app URL",
      "area": "sidebar",
      "group": "config"
    }
  },
  "status": {
    "type": "string",
    "meta": {
      "required": true,
      "default": "active",
      "label": "Status",
      "description": "active, paused, completed",
      "area": "sidebar",
      "group": "config",
      "displayAs": "badge"
    }
  },
  "clientName": {
    "type": "string",
    "meta": {
      "label": "Client",
      "description": "Client name for display",
      "area": "sidebar",
      "group": "details"
    }
  },
  "description": {
    "type": "text",
    "meta": {
      "label": "Description",
      "description": "What this app does",
      "area": "main",
      "group": "details"
    }
  }
}
```

### work-items (crouton collection)

Nodes on the canvas. Each represents a concrete unit of work.

```json
{
  "projectId": {
    "type": "string",
    "refTarget": "projects",
    "meta": {
      "required": true,
      "label": "Project",
      "area": "sidebar",
      "group": "structure"
    }
  },
  "parentId": {
    "type": "string",
    "meta": {
      "label": "Parent",
      "description": "Parent work item for tree structure",
      "area": "sidebar",
      "group": "structure"
    }
  },
  "title": {
    "type": "string",
    "meta": {
      "required": true,
      "label": "Title",
      "description": "Short description of the work",
      "area": "main",
      "group": "details"
    }
  },
  "type": {
    "type": "string",
    "meta": {
      "required": true,
      "default": "generate",
      "label": "Type",
      "description": "discover, architect, generate, compose, review, deploy",
      "area": "sidebar",
      "group": "classification",
      "displayAs": "badge"
    }
  },
  "status": {
    "type": "string",
    "meta": {
      "required": true,
      "default": "queued",
      "label": "Status",
      "description": "queued, active, waiting, done, blocked",
      "area": "sidebar",
      "group": "classification",
      "displayAs": "badge"
    }
  },
  "brief": {
    "type": "text",
    "meta": {
      "label": "Brief",
      "description": "Input: what needs to happen",
      "area": "main",
      "group": "details"
    }
  },
  "output": {
    "type": "text",
    "meta": {
      "label": "Output",
      "description": "Result: what was produced",
      "area": "main",
      "group": "details"
    }
  },
  "assignee": {
    "type": "string",
    "meta": {
      "default": "pi",
      "label": "Assignee",
      "description": "Who is responsible: pi, human, client",
      "area": "sidebar",
      "group": "routing",
      "displayAs": "badge"
    }
  },
  "provider": {
    "type": "string",
    "meta": {
      "label": "Provider",
      "description": "What tool executes: codex, claude-code, flux, openai, anthropic",
      "area": "sidebar",
      "group": "routing"
    }
  },
  "sessionId": {
    "type": "string",
    "meta": {
      "label": "Session ID",
      "description": "External session/job ID for tracking dispatch results",
      "area": "sidebar",
      "group": "routing"
    }
  },
  "skill": {
    "type": "string",
    "meta": {
      "label": "Skill",
      "description": "Which crouton skill to run (discover, architect, generate, compose, brand)",
      "area": "sidebar",
      "group": "routing"
    }
  },
  "artifacts": {
    "type": "json",
    "meta": {
      "label": "Artifacts",
      "description": "Generated files: schemas, configs, logs from skill run",
      "area": "sidebar",
      "group": "output"
    }
  }
}
```

---

## Node Types

6 types, mapped to the skill chain + coordination.

| Type | Icon | Skill chain step | Purpose | Typical assignee |
|---|---|---|---|---|
| **discover** | `i-lucide-search` | `/discover` | Interview client, understand needs | human or pi |
| **architect** | `i-lucide-pencil-ruler` | `/architect` | Design schemas, data model, package selection | pi |
| **generate** | `i-lucide-hammer` | `/generate` | Run CLI, generate collections, write code | pi |
| **compose** | `i-lucide-layout` | `/compose` | Build pages, wire components | pi |
| **review** | `i-lucide-eye` | (handoff) | Review output, give feedback | human or client |
| **deploy** | `i-lucide-rocket` | (ops) | Deploy to Cloudflare | pi |

These map directly to the crouton skill chain. A project canvas shows the actual pipeline stages, not abstract "tasks." The `/brand` skill is folded into compose (it's theming config, not a separate work unit).

### Status Lifecycle

```
queued → active → done
              ↘ waiting (needs input from someone else)
              ↘ blocked (something is wrong)
```

5 statuses. No drafts, no thinking/working distinction, no needs_attention. Simple.

---

## Core Flow

A new project starts with discover and flows through the skill chain:

```
Project canvas (one per crouton app):

  ┌─────────────┐
  │  discover   │  "Yoga studio needs bookings, schedule, member area"
  │   ● active  │
  │   → human   │  (interview with client)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  architect  │  Pi designs schemas, picks packages (bookings, auth, pages)
  │   ○ queued  │
  │   → pi      │  (runs /architect skill)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │   review    │  You review schemas + package selection
  │   ○ queued  │
  │   → human   │
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  generate   │  Pi runs crouton CLI, generates collections
  │   ○ queued  │
  │   → pi      │  (runs /generate skill)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │   compose   │  Pi builds pages, wires components, applies theme
  │   ○ queued  │
  │   → pi      │  (runs /compose + /brand skills)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │   deploy    │  Deploy preview to Cloudflare
  │   ○ queued  │
  │   → pi      │
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │   review    │  Client clicks through live app, gives feedback
  │   ○ queued  │
  │   → client  │
  └──────┬──────┘
         │
    (feedback spawns new architect/generate/compose nodes → cycle repeats)
```

### Iteration, Not Branching

The old ThinkGraph had "branching" as a core concept. The PM version keeps it simple: feedback from a review node spawns new work nodes. If the client wants to explore two directions ("try tabs" vs "try sidebar"), that's two generate nodes under the same review. You pick the winner. No branch metaphor needed — it's just a tree.

### Partial Runs

Not every iteration goes through the full chain. "Change the schedule page layout" spawns only a compose → deploy → review cycle. "Add an invoicing collection" spawns architect → generate → compose → deploy → review. The pipeline is flexible, not rigid.

---

## Pages

### Dashboard (`/admin/[team]/`)

All projects at a glance.

```
┌─────────────────────────────────────────────┐
│  ThinkGraph                          [+ New] │
├─────────────┬─────────────┬─────────────────┤
│ Velo        │ Client B    │ Client C        │
│ ● 2 active  │ 🔄 building │ ○ waiting on    │
│   items     │   auth flow │   feedback      │
│ velo.f...   │             │                 │
│ [Open]      │ [Open]      │ [Open]          │
└─────────────┴─────────────┴─────────────────┘
```

### Project Canvas (`/admin/[team]/project/[projectId]`)

Graph view of work items for one project.

```vue
<CroutonFlow
  :rows="workItems"
  collection="work-items"
  parent-field="parentId"
  label-field="title"
  :flow-id="`project-${projectId}`"
  minimap
  @node-click="openDetail"
/>
```

Right panel: work item detail with brief, output, assignee, dispatch controls.

### Client View (`/project/[shareToken]`)

Read-only. No auth required. Shows:
- Project status
- Active work items
- Live preview embeds
- Feedback form (creates feedback nodes)

---

## Work Dispatch

ThinkGraph dispatches work to different providers. Pi.dev is the primary worker for code tasks, but any AI can be a target.

### Assignees & Providers

**Assignees** (who is responsible):

| Assignee | What happens |
|---|---|
| `pi` | Dispatched to Pi.dev with a skill to run |
| `human` | Waits for you to act |
| `client` | Waits for client input (shared view) |

**Providers** (what tool executes):

| Provider | What it does | Use case |
|---|---|---|
| `codex` | OpenAI Codex agent | Code generation, schema design |
| `claude-code` | Claude Code CLI | Code generation, review |
| `flux` | Flux/Replicate API | Hero images, logos, brand assets |
| `openai` | OpenAI API | Alternative code gen, DALL-E images |
| `anthropic` | Claude API | Independent code review, docs |

### Dispatch Flow

From any work item node, "Dispatch" button:

1. Builds context: project brief + node brief + ancestor outputs
2. Routes by assignee:
   - **Pi**: dispatches via HTTP with skill + provider to use
   - **API providers**: HTTP call to provider with brief + artifacts
   - **Human/client**: sets status to `waiting`
3. Stores `sessionId` on the node
4. Node status → `active`

### Result Capture

When any provider completes:
1. Output captured in node's `output` field
2. Artifacts stored (schemas, images, configs, generated files)
3. Status → `done`
4. Next node in the chain auto-queues

### Context Building

Each dispatched node receives: the project brief, its own brief, and ancestor node outputs. This is how context flows through the pipeline — each node's output becomes the next node's input. For long chains, a summarisation node can compress the ancestor chain.

### Skill Mapping (Pi.dev)

| Node type | Skill | What Pi does |
|---|---|---|
| discover | `/discover` | Interview questions, brief generation |
| architect | `/architect` | Schema design, package selection, config |
| generate | `/generate` (= `/crouton`) | Run CLI, generate collections, migrations |
| compose | `/compose` | Build pages, wire components, TipTap content |
| deploy | (no skill — ops) | `wrangler pages deploy`, D1 migrations |

### Multi-AI Patterns

The assignee/provider split means multi-AI patterns emerge naturally from the graph — no special architecture needed. Two sibling nodes with the same brief but different providers (Codex vs Claude Code) enable comparison. Mixed pipelines (Pi for code, Flux for images) just use different providers per node. A review node targeting a different AI gives you an independent second opinion before human review.

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
│   ├── project.json
│   └── work-item.json
├── app/
│   ├── pages/
│   │   ├── index.vue                         # Landing
│   │   ├── admin/[team]/
│   │   │   ├── index.vue                     # Dashboard (all projects)
│   │   │   └── project/[projectId].vue       # Project canvas
│   │   └── project/[shareToken].vue          # Client view (public)
│   ├── components/
│   │   ├── WorkItemsNode.vue                 # Custom Vue Flow node
│   │   ├── ProjectCard.vue                   # Dashboard project card
│   │   ├── WorkItemDetail.vue                # Right panel detail
│   │   ├── WorkDispatch.vue                  # Dispatch controls (Pi, API providers, human)
│   │   └── ClientFeedback.vue                # Public feedback form
│   └── composables/
│       ├── useProjectDashboard.ts            # Multi-project overview data
│       ├── useWorkDispatch.ts                # Provider dispatch (Pi, Flux, OpenAI, etc.)
│       └── useWorkItemFlow.ts                # Graph-specific logic
├── server/
│   ├── api/teams/[id]/
│   │   ├── projects/                         # Generated CRUD
│   │   ├── work-items/                       # Generated CRUD
│   │   └── dispatch/
│   │       ├── index.post.ts                 # Send work to any provider (Pi, Flux, OpenAI...)
│   │       └── webhook.post.ts               # Receive results from providers
│   └── api/public/
│       └── project/[shareToken].get.ts       # Client view data
└── layers/thinkgraph/
    └── collections/
        ├── projects/                          # Generated by crouton-cli
        └── work-items/                        # Generated by crouton-cli
```

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-flow',
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
      name: 'projects',
      fieldsFile: './schemas/project.json'
    },
    {
      name: 'work-items',
      fieldsFile: './schemas/work-item.json',
      hierarchy: {
        enabled: true,
        parentField: 'parentId'
      }
    }
  ],

  targets: [
    {
      layer: 'thinkgraph',
      collections: ['projects', 'work-items']
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

### Phase 1: Foundation ✅

**Goal:** Projects + work items, basic graph view.

1. ✅ Update schemas (project.json, work-item.json)
2. ✅ Regenerate collections with crouton-cli
3. ✅ Run migrations
4. ✅ Build dashboard page (project cards)
5. ✅ Build project canvas page with `<CroutonFlow />`
6. ✅ Build `WorkItemsNode.vue` (type icon, status badge, assignee, title)
7. ✅ Work item detail panel (slideover with brief/output/status editing)

### Phase 2a: Work Dispatch ✅

**Goal:** Send work to Pi, get results back.

8. ✅ `useWorkDispatch.ts` — composable for dispatch with toast notifications
9. ✅ Dispatch API endpoint (`/api/teams/[id]/dispatch/work-item.post.ts`)
10. ✅ Webhook endpoint for results (`/api/teams/[id]/dispatch/webhook.post.ts`)
11. ✅ Pi worker HTTP dispatch endpoint (`/dispatch` on `pi-api.pmcp.dev`)
12. ✅ Progressive output flush (3s interval PATCH to work item)
13. ✅ Live output preview on node cards (last 200 chars with blinking cursor)
14. ✅ Callback from Pi worker to webhook on session completion
15. ✅ Terminal panel wired (WebSocket — works locally, needs DO relay for production)
16. ✅ Quick-create menu on drag-to-empty from node handle

### Phase 2b: Pi Agent Workflow

**Goal:** Pi actually builds crouton apps, not just answers questions.

17. ✅ Rewrite `buildAgentPrompt` per node type — different prompt for discover/architect/generate/compose/review/deploy
18. ✅ Worktree management — Pi creates a git branch + worktree per generate/compose node (`git worktree add /tmp/thinkgraph/{id} -b thinkgraph/{id}`)
19. ✅ Skill execution — generate nodes run `/crouton` skill (crouton CLI), compose nodes build pages
20. ✅ Git workflow — Pi commits in the worktree, pushes the branch, stores branch name in work item `worktree` field
21. ✅ Fix output format — only keep final complete text, not progressive deltas
22. ✅ Suppress `pi-extension` old tool errors — PM dispatches use dedicated PM tools (`update_workitem`, `get_workitem`) instead of legacy thinking graph tools
23. ✅ Auto-advance — when a node completes, webhook auto-sets next queued child to active
24. ✅ PR creation — `create_pr` PM tool added to pm-tools.ts, runs `gh pr create` and updates work item artifacts
25. ✅ Retrospective field — agents write lessons learned after each task, visible on node cards and detail panel
26. ✅ Output capture fix — PM dispatches use tool-written output (not streaming deltas), callback only sends status
27. ✅ Fix `get_workitem` 404 — tool was hitting non-existent single-item GET endpoint, now uses `?ids=` on list endpoint

### Phase 3: Client View ✅

**Goal:** Shareable project view with feedback.

13. ✅ Share token generation — `shareToken` field on project model, Share button on canvas copies link
14. ✅ Public project view page (`/project/[shareToken]`) — read-only tree view, progress bar, no auth
15. ✅ `ClientFeedback.vue` — feedback form creates `review` work items with `assignee: human`
16. ✅ Live preview embed — iframe toggle when project has `deployUrl`, browser chrome styling

### Phase 4: Additional Providers

**Goal:** Dispatch to AI providers beyond Pi.

17. Flux/Replicate adapter — image generation from brand briefs
18. OpenAI adapter — alternative code gen, DALL-E for images
19. Anthropic adapter — Claude API for independent code review
20. Competitive comparison UI — side-by-side output from two providers on same brief

### Phase 5: Polish

21. Dashboard status aggregation (count active/waiting/blocked per project)
22. Keyboard shortcuts (N: new node, D: done, W: dispatch work)
23. Node visual states (active = pulse, waiting = orange, done = green, blocked = red)
24. Provider icon on nodes (Pi logo, OpenAI logo, Flux logo, human avatar)
25. Real-time sync via crouton-collab

---

## Relationship to Strategy

### Atelier Vision

ThinkGraph is the **professional interface** for the Atelier vision:
- **Non-technical users** get the chat endpoint (describe → get app)
- **You (the developer/agency)** get ThinkGraph (manage multiple client apps, see the pipeline, steer AI workers)
- **Clients** get the shared view (see progress, give feedback)

Same skill chain, same CLI, same packages underneath. Different interfaces for different audiences.

### The Designer Pivot

The old "Designer app" (visual schema builder with kanban canvas) was replaced by conversational skills. ThinkGraph doesn't bring the designer back — it provides **visibility over skill execution**, not a visual builder. You see that `/architect` ran and produced 3 schemas, not a drag-drop schema editor.

### MCP Integration

When crouton packages ship `server/mcp/` tools, ThinkGraph can expose them as context for Pi dispatch. "This project uses crouton-bookings and crouton-auth" → Pi gets the relevant MCP tools automatically.

---

## Success Criteria

1. You open it every morning and know where all client projects stand
2. You can dispatch work to Pi with the right skill and context in one click
3. Clients can see their project and leave feedback without you emailing screenshots
4. Adding a new client project takes < 5 minutes
5. The canvas shows the real pipeline: what was discovered, designed, generated, deployed, reviewed
6. Feedback loops back into the pipeline — client says "change X" → new architect/generate cycle spawns

---

## Key Principles

1. **One canvas per app** — Not per idea, not per sprint. Per client product.
2. **Nodes are skill stages, not thoughts** — Every node maps to a concrete step in building a crouton app.
3. **Pi does the work, you steer** — Dispatch skills, review output, route feedback.
4. **Clients see progress** — Shared view is a first-class feature.
5. **The pipeline is flexible** — Not every iteration needs all stages. Change a page? Just compose → deploy → review.
6. **Skills are the engine, ThinkGraph is the dashboard** — Don't duplicate what skills do. Visualize and orchestrate.
