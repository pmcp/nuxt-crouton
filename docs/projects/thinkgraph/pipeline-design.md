# ThinkGraph Pipeline Design

> Status: **MVP implemented** (2026-03-20). Analyst → Builder → Reviewer → Merger stages with traffic light signals. Launcher stage is parked.

## Core Idea

A work item is not a single task — it's a **pipeline** that flows through stages. Each stage returns a traffic light signal that determines what happens next.

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Analyst  │──▶│ Builder  │──▶│ Reviewer  │──▶│ Launcher │──▶│  Merger  │
│  🟢🟠🔴  │   │  🟢🟠🔴  │   │  🟢🟠🔴  │   │  🟢🟠🔴  │   │  🟢🟠🔴  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## Signals

| Signal | Meaning | What happens |
|--------|---------|--------------|
| 🟢 Green | All good | Auto-advance to next stage |
| 🟠 Orange | Questions / needs input | Pause pipeline, surface to human. May spawn child nodes. |
| 🔴 Red | Fail / stop | Block the pipeline. Requires human intervention to unblock or kill. |

## Stages

### 1. Analyst

The gatekeeper. Before any work starts:

- **Is this still needed?** Check if the work is redundant, already done, or conflicts with something else.
- **Where does it belong?** Which package, which app, which layer.
- **What skills are needed?** Map the work to crouton skills (CLI generation, code composition, etc.)
- **Who does it?** Pi, human, or client.
- **Create the brief** — or stop the work entirely.

Analyst can return:
- 🟢 Brief is clear, proceed to builder
- 🟠 Questions for the human before proceeding
- 🔴 This shouldn't be done (duplicate, out of scope, blocked by something else)

### 2. Builder

The executor. Uses the right skills based on what the analyst decided:

- Runs `/discover`, `/architect`, `/generate`, `/compose` as needed
- Can use subagents (test-fixer, code-smell-detector, etc.)
- Works in a worktree (isolated branch)

Builder can return:
- 🟢 Work complete, passing to reviewer
- 🟠 Hit a blocker, needs human input (API key missing, schema ambiguity, etc.)
- 🔴 Failed (build errors, can't proceed)

### 3. Reviewer

Quality gate:

- Code review (patterns, security, correctness)
- Screenshot / visual review (if configured on node)
- Test results
- Can use code-smell-detector, proactive-reviewer subagents

Reviewer can return:
- 🟢 Looks good, proceed to launch
- 🟠 Needs changes (sends back to builder with feedback)
- 🔴 Reject (fundamental issues, needs re-architecting → back to analyst)

### 4. Launcher

CI and preview:

- Triggers GitHub Actions (build, test, lint, typecheck)
- Deploys preview branch to Cloudflare Pages
- Waits for CI callback via deploy webhook
- Reports test results, build status, preview URL

Launcher can return:
- 🟢 CI green, preview live, proceed to merge
- 🟠 Tests failing, needs fixes (back to builder)
- 🔴 Build broken, infra issues

### 5. Merger

Final step:

- Creates PR (or updates existing)
- Waits for approval (if configured)
- Merges to main
- Triggers production deploy
- Closes the pipeline

## Node-Level Preferences

When creating a work item, you can configure which stages are active and what checks to require:

```
☑ Analyst review (default: on)
☑ Prototype first (designer stage before builder)
☑ Branch preview required before merge
☑ Screenshot review before push
☐ Auto-merge on green CI (default: off)
☑ Require human approval at reviewer stage
```

These become flags on the work item that the pipeline respects.

## One Node, Many Steps

The current model creates separate nodes per step (discover node, architect node, generate node). The new model keeps everything on **one node** that progresses through stages:

```
Node: "Add products collection to Velo"
  Stage: analyst ✅ → builder 🔄 → reviewer ⏳ → launcher ⏳ → merger ⏳
  Signal: 🟢
```

The node card shows the current stage and signal. History of all stages is preserved in the node's artifacts.

## Child Nodes and Groups

- **Orange signals spawn child nodes** — Questions, blockers, feedback items become child nodes connected to the parent. The human triages them.
- **Groups as composite briefs** — Drag multiple related cards into a group. The group gets a name and becomes a single brief. Starting the group starts the pipeline for all cards as one unit.
- **Context flows down** — Child nodes inherit parent context. Group context is available to all cards in the group.

## The Assistant's Role

The ProjectAssistant chat panel is the **human interface** to the pipeline:

- Gatekeeper: stops you before creating work that shouldn't exist
- Shows orange signals front-and-center (not buried as child nodes)
- Has full context of the crouton setup (CLAUDE.md, schemas, packages)
- Can dispatch, pause, resume, and kill pipelines
- Surfaces CI results, preview URLs, PR links

## Data Model Changes

Current work item fields stay, with additions:

```typescript
interface WorkItem {
  // Existing
  id, projectId, parentId, title, type, status, assignee, brief, output, ...

  // New
  stage: 'analyst' | 'builder' | 'reviewer' | 'launcher' | 'merger'
  signal: 'green' | 'orange' | 'red' | null
  pipelineConfig: {
    requireAnalyst?: boolean
    requirePrototype?: boolean
    requireScreenshot?: boolean
    requireBranchPreview?: boolean
    autoMerge?: boolean
    requireHumanReview?: boolean
  }
  stageHistory: Array<{
    stage: string
    signal: string
    timestamp: string
    summary: string
  }>
}
```

## Implementation Status (MVP — 2026-03-20)

### What's built

1. **`stage` and `signal` fields** on work items (schema, types, composable, PATCH endpoint, DB migration)
2. **Traffic light UI** — node cards show current stage label + colored signal dot (green/amber/red)
3. **Analyst gate** — session-manager routes by `stage` (not just `nodeType`), runs `analystInstructions()` first
4. **Green auto-advance** — webhook detects `signal: 'green'` + `nextStage`, re-queues same item at next stage
5. **Orange pause** — analyst sets `status: 'waiting'`, `assignee: 'human'`, questions in `output`
6. **Red block** — analyst sets `status: 'blocked'`, reason in `output`
7. **Builder routing** — delegates to existing type-specific instructions (discover/architect/generate/etc.)
8. **Reviewer stage** — code review and quality gate with signal output
9. **Merger stage** — merges branch into main (merge origin/main into branch, resolve conflicts, squash-merge PR, pull main)
10. **pm-tools** — `update_workitem` tool accepts `stage`, `signal`, `assignee` params

### Flow

```
Dispatch work item (no stage set)
  → work-item.post.ts defaults stage to 'analyst'
  → Pi worker receives stage in payload
  → session-manager.buildPMPrompt() routes by stage
  → Analyst runs, sets signal via update_workitem tool
  → Session completes → sendCallback reads work item state
  → Webhook receives signal + nextStage
  → If green: re-queue same item at next stage (stage='builder', status='queued')
  → If orange: item stays at 'waiting' (no re-dispatch)
  → If red: item stays at 'blocked'
```

### Key files

| File | What changed |
|------|-------------|
| `collections/workitems/types.ts` | Added `stage` and `signal` fields |
| `collections/workitems/server/database/schema.ts` | Added `stage` and `signal` columns |
| `collections/workitems/app/composables/useThinkgraphWorkItems.ts` | Schema, defaults, fields, columns |
| `collections/workitems/server/api/.../[workitemId].patch.ts` | Added to ALLOWED_FIELDS |
| `ThinkgraphWorkitemsNode.vue` | Traffic light dot + stage label |
| `session-manager.ts` | Pipeline routing, analyst/builder/reviewer instructions, sendCallback reads signal |
| `pm-tools.ts` | update_workitem accepts stage/signal/assignee |
| `webhook.post.ts` | Stage progression on green signal |
| `work-item.post.ts` | Defaults stage to 'analyst', passes through to Pi |
| `index.ts` (worker) | Passes stage in dispatch payload |

### What's NOT built yet

- Launcher stage (CI integration) — parked
- Node-level pipeline preferences (pipelineConfig) — parked
- Stage history tracking (stageHistory array) — parked
- Group briefs — parked
- Designer/prototyper stage — parked
- Configurable auto-advance speed — parked

## Open Questions

- Should the pipeline be configurable per-project or per-node? (Probably per-node with project defaults)
- How does the human "answer" orange questions? Edit the brief? Chat reply? Child node?
- Should green auto-advance be configurable speed? (Immediate vs. "show me first")
- How do we handle pipeline loops? (Reviewer → Builder → Reviewer could cycle forever)
- Do we need a "designer/prototyper" stage between analyst and builder?