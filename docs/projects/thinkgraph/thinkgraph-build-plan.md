# ThinkGraph — Build Plan

> Read `thinkgraph-brief.md` for the product vision.
> Read `thinkgraph-skill.md` for the agent operating model.
> This document is the technical build plan.

---

## One-liner

A spatial, collaborative canvas where humans and AI coordinate work together —
from epic to shipped, with full execution trace.

---

## What crouton already provides

| Capability | Package | What you get |
|---|---|---|
| CRUD APIs + validation | **crouton-core** | `useCollectionQuery/Mutation`, team-scoped endpoints |
| Graph visualization | **crouton-flow** | `<CroutonFlow />` with Vue Flow, dagre layout, minimap |
| Real-time sync | **crouton-collab** | Yjs CRDTs, WebSocket rooms, conflict resolution |
| Presence + cursors | **crouton-collab** | `<CollabPresence />`, `<CollabCursors />` |
| Auth + teams | **crouton-auth** | Better Auth, team context, sessions |
| AI integration | **crouton-ai** | `useChat()`, multi-provider (Claude, GPT, Gemini) |
| Rich text editing | **crouton-editor** | TipTap with blocks, slash commands |
| Collection scaffolding | **crouton-cli** | Full CRUD generation from JSON schema |
| Position persistence | **crouton-flow** | `useFlowPositionStore()` + `flow_configs` table |
| Custom nodes | **crouton-flow** | Auto-resolves `[Collection]Node.vue` components |

**Bottom line:** Infrastructure is done. The work is ThinkGraph-specific data model + UX.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Nuxt + crouton ecosystem |
| Database | SQLite (local) / D1 (Cloudflare) via NuxtHub |
| Graph UI | crouton-flow (Vue Flow + dagre) |
| Real-time | crouton-collab (Yjs) — free with crouton-flow |
| AI execution | Claude Code CLI via spawn + MCP |
| Notion sync | Notion MCP |
| Hosting | Cloudflare Pages |

---

## Data model

### canvases

One canvas per epic. Scoped to a team.

```json
{
  "title": { "type": "string", "meta": { "required": true, "label": "Title" } },
  "epicId": { "type": "string", "meta": { "label": "Notion Epic ID" } },
  "epicBrief": { "type": "text", "meta": { "label": "Epic Brief" } },
  "status": {
    "type": "string",
    "meta": {
      "label": "Status",
      "description": "active, closed",
      "default": "active",
      "displayAs": "badge"
    }
  }
}
```

---

### nodes

The core primitive. Every unit of work, thinking, or coordination.

```json
{
  "canvasId": {
    "type": "string",
    "refTarget": "canvases",
    "meta": { "required": true, "label": "Canvas" }
  },
  "parentId": {
    "type": "string",
    "refTarget": "nodes",
    "meta": { "label": "Parent Node" }
  },
  "nodeType": {
    "type": "string",
    "meta": {
      "required": true,
      "label": "Type",
      "description": "epic | user_story | task | milestone | question | decision | remark | fork | send",
      "displayAs": "badge"
    }
  },
  "status": {
    "type": "string",
    "meta": {
      "required": true,
      "default": "idle",
      "label": "Status",
      "description": "draft | idle | thinking | working | needs_attention | done | error",
      "displayAs": "badge"
    }
  },
  "title": {
    "type": "string",
    "meta": { "required": true, "label": "Title" }
  },
  "brief": {
    "type": "text",
    "meta": { "label": "Brief", "description": "Input. What needs to happen here." }
  },
  "output": {
    "type": "text",
    "meta": { "label": "Output", "description": "The handoff brief. Produced when node is done." }
  },
  "handoffType": {
    "type": "string",
    "meta": {
      "label": "Handoff Type",
      "description": "task | claude_code | human_review | child_nodes | send | close"
    }
  },
  "handoffMeta": {
    "type": "json",
    "meta": { "label": "Handoff Meta", "description": "Worktree path, send target, assignee, etc." }
  },
  "contextScope": {
    "type": "string",
    "meta": {
      "label": "Context Scope",
      "default": "branch",
      "description": "full | branch | manual"
    }
  },
  "contextNodeIds": {
    "type": "json",
    "meta": { "label": "Manual Context Nodes", "description": "For contextScope: manual" }
  },
  "notionTaskId": {
    "type": "string",
    "meta": { "label": "Notion Task ID", "description": "Set when task is written to Notion" }
  },
  "worktree": {
    "type": "string",
    "meta": { "label": "Worktree", "description": "Git worktree branch for task/fork nodes" }
  },
  "sendTarget": {
    "type": "string",
    "meta": { "label": "Send Target", "description": "claude | gpt | gemini | flux | human:{userId}" }
  },
  "sendMode": {
    "type": "string",
    "meta": {
      "label": "Send Mode",
      "description": "block | async | fire_and_forget"
    }
  },
  "injectMode": {
    "type": "string",
    "meta": {
      "label": "Inject Mode",
      "default": "queue",
      "description": "direct | queue | fork"
    }
  },
  "origin": {
    "type": "string",
    "meta": {
      "label": "Origin",
      "description": "human | ai | notion_sync",
      "displayAs": "badge"
    }
  },
  "stepIndex": {
    "type": "integer",
    "meta": { "label": "Step", "description": "Creation order within canvas" }
  },
  "skillVersion": {
    "type": "string",
    "meta": { "label": "Skill Version", "description": "Which skill version ran on this node" }
  },
  "tokenCount": {
    "type": "integer",
    "meta": { "label": "Token Count", "description": "Total tokens consumed by this node" }
  },
  "userId": {
    "type": "string",
    "meta": { "label": "Created By" }
  }
}
```

---

### inject-requests

Human inputs queued for injection into a running session.

```json
{
  "nodeId": {
    "type": "string",
    "refTarget": "nodes",
    "meta": { "required": true, "label": "Target Node" }
  },
  "fromUserId": { "type": "string", "meta": { "label": "From User" } },
  "content": { "type": "text", "meta": { "required": true, "label": "Content" } },
  "status": {
    "type": "string",
    "meta": {
      "default": "pending",
      "description": "pending | approved | injected | rejected"
    }
  }
}
```

---

## App structure

```
apps/thinkgraph/
├── nuxt.config.ts
├── crouton.config.js
├── schemas/
│   ├── canvas.json
│   ├── node.json
│   └── inject-request.json
├── app/
│   ├── pages/
│   │   ├── index.vue                        # Canvas list / epic selector
│   │   └── admin/[team]/
│   │       └── canvas/[canvasId].vue         # Main canvas workspace
│   ├── components/
│   │   ├── NodesNode.vue                     # Custom Vue Flow node (auto-resolved)
│   │   ├── NodeDetail.vue                    # Slide-in panel: brief, output, handoff, actions
│   │   ├── HandoffPanel.vue                  # Declare + trigger handoff
│   │   ├── ContextHighlight.vue              # Edge + node highlight for context chain
│   │   ├── EpicOverview.vue                  # Read-only progress per user story path
│   │   ├── InjectQueue.vue                   # Pending inject requests for a node
│   │   └── PlanningReview.vue                # Approve/edit draft task breakdown
│   └── composables/
│       ├── useNodeContext.ts                  # Walk ancestor chain, build context payload
│       ├── useHandoff.ts                      # Trigger handoff by type
│       ├── useWorktree.ts                     # Create / close / list worktrees
│       └── useNotionSync.ts                   # Pull epic+stories, push tasks+status
├── server/
│   ├── utils/
│   │   ├── claude-responder.ts               # Spawn Claude Code with node context
│   │   ├── context-builder.ts                # Assemble context chain from ancestor briefs
│   │   └── notion-client.ts                  # Notion MCP wrapper
│   └── api/teams/[id]/
│       ├── canvases/
│       ├── nodes/
│       │   ├── index.post.ts                  # Create node, trigger AI if needed
│       │   ├── [nodeId]/
│       │   │   ├── context.get.ts             # Assembled context chain for a node
│       │   │   ├── handoff.post.ts            # Execute handoff
│       │   │   └── inject.post.ts             # Inject content into running session
│       ├── inject-requests/
│       └── notion/
│           ├── sync.post.ts                   # Pull epic + user stories → nodes
│           └── push-task.post.ts              # Write approved task to Notion
└── layers/thinkgraph/
    └── collections/
        ├── canvases/
        ├── nodes/
        └── inject-requests/
```

---

## Build phases

---

### Phase 1 — Canvas + node graph

**Goal:** Nodes on a canvas, wired to the data model.

1. Scaffold app, extend crouton + crouton-flow + crouton-collab
2. Generate collections via crouton-cli
3. Build `NodesNode.vue` — the custom Vue Flow node:
    - Type badge (color per node type)
    - Title
    - Status dot with animation class
    - Origin badge (human / ai / notion)
    - Step index
    - Worktree indicator if present
    - Progress bar if status = working
4. Build canvas workspace page:
   ```vue
   <CroutonFlow
     :rows="nodes"
     collection="nodes"
     parent-field="parentId"
     label-field="title"
     :flow-id="canvasId"
     minimap
     @node-click="onNodeClick"
   />
   ```
5. Build `NodeDetail.vue` — slide-in panel on node click:
    - Brief (read + edit)
    - Conversation (collapsed by default, expandable)
    - Output (empty until done)
    - Handoff (declare + trigger)
    - Context scope selector (full / branch / manual)
    - Actions: fork, remark, inject request

**Milestone:** You can create nodes manually, wire parent-child, see the graph.

---

### Phase 2 — Node status + animations

**Goal:** The canvas communicates work state visually.

6. CSS animation classes per status:
   ```css
   .status-thinking  { animation: pulse 1.6s ease-in-out infinite; }
   .status-working   { animation: pulse 0.8s ease-in-out infinite; }
   .status-needs-attention { animation: attention 1s ease-in-out infinite; }
   ```
7. Edge styling via `useContextHighlight.ts`:
    - On node select: dim non-context nodes, highlight ancestor chain
    - Animate edges in ancestor chain (flow direction = data direction)
    - Hover ghost: show context connections without selecting
8. Draft node visual: dashed border, reduced opacity, no step index
9. Status bar: live count per status across canvas

**Milestone:** Canvas feels alive. You understand work state at a glance.

---

### Phase 3 — Context chain

**Goal:** Nodes know what their ancestors decided.

10. `useNodeContext.ts` — walks ancestor chain, collects output briefs:
    ```typescript
    // Returns ordered array of ancestor output briefs
    // Respects contextScope: full | branch | manual
    // contextNodeIds for manual scope
    async function buildContextChain(nodeId: string, scope: string): Promise<ContextBrief[]>
    ```
11. `context-builder.ts` (server) — assembles context payload for AI:
    ```typescript
    // Formats context chain as structured prompt preamble
    // Includes: node type, title, output brief, step index
    // Respects token budget — summarises deep chains if needed
    function buildContextPayload(chain: ContextBrief[], budget: number): string
    ```
12. `/api/teams/[id]/nodes/[nodeId]/context.get.ts` — returns assembled context
13. Manual context select UI: click nodes to toggle into context, watch edges appear

**Milestone:** Every node knows its full lineage. Context is visible and selectable.

---

### Phase 4 — Notion sync

**Goal:** Epics and user stories flow in. Task status flows back.

14. `notion-client.ts` — Notion MCP wrapper:
    - `getEpic(epicId)` → epic title + brief
    - `getUserStories(epicId)` → array of user story records
    - `createTask(storyId, brief)` → creates task in Notion, returns taskId
    - `updateTaskStatus(taskId, status)` → moves kanban card

15. `/api/teams/[id]/notion/sync.post.ts`:
    - Accepts `epicId`
    - Creates canvas root node (type: epic) from Notion epic
    - Creates user story nodes (type: user_story) as children
    - Sets `origin: notion_sync` on all created nodes

16. `/api/teams/[id]/notion/push-task.post.ts`:
    - Accepts approved task node
    - Writes to Notion via MCP
    - Updates node with `notionTaskId`

17. `useNotionSync.ts` composable — pull on canvas open, push on approval

**Milestone:** Open a canvas with an epic ID, user stories appear as nodes automatically.

---

### Phase 5 — Planning pass

**Goal:** AI breaks user stories into tasks. Humans approve.

18. `claude-responder.ts` — spawn Claude Code with planning skill:
    ```typescript
    spawn('claude', [
      '-p', planningPrompt,
      '--no-session-persistence',
      '--permission-mode', 'bypassPermissions'
    ], { cwd: projectDir, detached: true, stdio: 'ignore' }).unref()
    ```
    Loop guard: only trigger on `origin === 'notion_sync'` and `nodeType === 'user_story'`

19. Planning skill (`thinkgraph-plan.md`) instructs Claude to:
    - Read epic brief + user story brief from context
    - Emit 3–8 draft task nodes via MCP
    - Each draft: title, brief, estimated scope, dependencies
    - Declare handoff as `human_review`

20. `PlanningReview.vue` — review draft task breakdown:
    - List of proposed tasks (dashed/draft visual)
    - Edit title or brief inline
    - Delete individual tasks
    - Add a task manually
    - Approve all → solidifies nodes → writes to Notion → arms for execution

**Milestone:** Drop a user story, AI proposes tasks, you approve, Notion is updated.

---

### Phase 6 — Execution (Claude Code sessions)

**Goal:** Task nodes spawn real Claude Code sessions in worktrees.

21. `useWorktree.ts`:
    ```typescript
    createWorktree(nodeId: string) // git worktree add ../thinkgraph-{nodeId} -b task/{nodeId}
    closeWorktree(nodeId: string)  // git worktree remove
    listWorktrees()                // git worktree list --porcelain
    ```

22. Execution handoff flow:
    - Human triggers "Start execution" on approved task node
    - Worktree created: `task/{nodeId}`
    - Claude Code spawned with: node brief + context chain + thinkgraph-skill.md
    - Node status → `working`

23. Structured event handling — Claude Code emits typed JSON, server parses:
    ```typescript
    { "type": "milestone", "title": "...", "summary": "..." }  // → new milestone node
    { "type": "question",  "text": "...", "options": [] }      // → new question node, status: needs_attention
    { "type": "decision",  "choice": "...", "rationale": "..." } // → new decision node
    { "type": "progress",  "message": "..." }                  // → suppressed, internal only
    ```

24. On session close:
    - Claude Code generates handoff brief (output artifact)
    - Stored as node `output`
    - Node status → `done`
    - Notion task status updated via MCP
    - Handoff type declared, downstream nodes armed

**Milestone:** Approve a task, Claude Code runs, nodes appear on canvas, Notion updates automatically.

---

### Phase 7 — Human collaboration

**Goal:** Team members inject, fork, and review in real time.

25. `InjectQueue.vue` — pending inject requests on a node:
    - Incoming remarks, questions, directions from teammates
    - Approve → feeds into running session
    - Reject → marks as rejected, stays on canvas as remark

26. Fork gesture:
    - Right-click any done node → "Fork from here"
    - New child node created (type: fork)
    - New worktree branched from parent worktree
    - Fresh Claude Code session with same parent context

27. Human review handoff:
    - Node status → `needs_attention`
    - Assigned user sees orange glow on their canvas
    - They respond via child node → parent session unblocks

28. Inject mode settings per canvas:
    - Direct / Queue / Fork — configurable in canvas settings

**Milestone:** Two people on the same canvas, both shaping the same execution trace.

---

### Phase 8 — Send nodes + multi-agent

**Goal:** Route work to any AI, not just Claude Code.

29. Send node execution:
    - Target: claude | gpt | gemini | flux | human:{userId}
    - Mode: block | async | fire_and_forget
    - Response → new child node on canvas
    - Block mode: parent session pauses, resumes on response arrival

30. Send node UI in `NodeDetail.vue`:
    - Target selector
    - Mode selector
    - Preview of context payload being sent

31. Response node visual — distinct from AI-generated, tagged with send target

**Milestone:** Route an image generation request to Flux, result appears as a node, injectable as context.

---

### Phase 9 — Epic overview + polish

**Goal:** Zoom out and understand the whole epic at a glance.

32. `EpicOverview.vue` — collapsible sidebar panel:
    - One row per user story path
    - Progress: tasks done / working / blocked / total
    - Click to jump to that path on canvas
    - Derived from node states, no extra sync

33. Canvas navigation:
    - Collapse/expand user story paths
    - Jump to node by step index
    - Filter canvas by status, origin, node type

34. Cost visibility:
    - Token counter per node (from Claude Code output)
    - Total per canvas
    - Shown in node detail + epic overview

35. Keyboard shortcuts:
    - `f` — fork from selected node
    - `r` — add remark
    - `i` — inject request
    - `c` — context mode toggle
    - `Esc` — deselect

---

## Key implementation patterns

### Loop guard (AI → MCP → AI prevention)
```typescript
// Only trigger Claude responder on human-originated nodes
if (node.origin !== 'ai' && node.origin !== 'notion_sync') {
  triggerClaudeResponder(node)
}
```

### Spawn pattern (Claude Code)
```typescript
spawn('claude', [
  '-p', prompt,
  '--no-session-persistence',
  '--permission-mode', 'bypassPermissions'
], {
  cwd: worktreePath,
  env: { ...process.env, CLAUDECODE: undefined }, // allow nested spawning
  stdio: ['pipe', 'pipe', 'ignore'],
  detached: true
}).unref()
```

### Context payload format
```markdown
## Epic
[epic brief]

## User Story
[user story brief]

## Ancestor decisions
Step 3 · milestone: [output brief]
Step 5 · decision: [output brief]

## Your node
Type: task
Brief: [node brief]
Worktree: task/{nodeId}

## Instructions
[thinkgraph-skill.md contents]
```

### Handoff brief schema (enforced by skill)
```markdown
## What was done
[1-3 sentences]

## Key decisions
- [decision + rationale]

## Output artifacts
- [file or conclusion + path]

## Open items
- [specific unresolved items]

## Suggested handoff
[type + meta]
```

---

## Notion integration surface

| Direction | Trigger | Operation |
|---|---|---|
| Notion → ThinkGraph | Canvas open with epicId | Sync epic + user stories as nodes |
| ThinkGraph → Notion | Task node approved | `create_task` with brief |
| ThinkGraph → Notion | Task node done | `update_status` |

Notion owns: epics, user stories, tasks, kanban, sprint planning.
ThinkGraph owns: execution trace, AI nodes, context chains, worktrees.

---

## Open questions (design decisions needed before build)

1. **Handoff approval** — which handoff types require human confirmation before firing?
   Suggestion: `claude_code` and `send` always confirm. `child_nodes` and `close` auto-fire.

2. **Summarisation trigger** — when does an ancestor chain get auto-summarised?
   Suggestion: when context payload exceeds 80% of model context window.

3. **Worktree cleanup** — who triggers it and when?
   Suggestion: explicit "close node" action, or canvas close for all open worktrees.

4. **Emergent tasks** — AI discovers a subtask mid-session. Push to Notion immediately or queue?
   Suggestion: queue as draft node, human approves before Notion write.

5. **Simultaneous forks** — two teammates fork same node. Both run immediately?
   Suggestion: both run. Yjs handles the node data. Worktrees are independent.

6. **Skill versioning** — store skill version on node. How to handle resume on old version?
   Suggestion: always resume with current skill, flag mismatch in node detail.
