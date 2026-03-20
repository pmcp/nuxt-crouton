# ThinkGraph Pipeline Design

> Status: **MVP proven** (2026-03-20). Full pipeline ran end-to-end: Analyst → Builder → Reviewer → Merger. Real PR merged autonomously in ~3 minutes.

## Core Idea

A work item is not a single task — it's a **pipeline** that flows through stages. Each stage returns a traffic light signal that determines what happens next.

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Analyst  │──▶│ Builder  │──▶│ Launcher │──▶│ Reviewer  │──▶│  Merger  │
│  🟢🟠🔴  │   │  🟢🟠🔴  │   │  🟢🟠🔴  │   │  🟢🟠🔴  │   │  🟢🟠🔴  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## Signals

| Signal | Meaning | What happens |
|--------|---------|--------------|
| 🟢 Green | All good | Auto-advance to next stage |
| 🟠 Orange | Questions / needs input | Pause pipeline, surface to human |
| 🔴 Red | Fail / stop | Block the pipeline |

## Stages

### 1. Analyst

The gatekeeper. Before any work starts:

- **Is this still needed?** Check if the work is redundant, already done, or conflicts with something else.
- **Where does it belong?** Which package, which app, which layer.
- **What skills are needed?** Map the work to crouton skills (CLI generation, code composition, etc.)
- **Who does it?** Pi, human, or client.
- **Create the brief** — or stop the work entirely.

Evaluate only — no file modifications, no shell commands, no worktrees.

### 2. Builder

The executor. Uses the right skills based on what the analyst decided:

- Runs discover, architect, generate, compose as needed (routed by `nodeType`)
- Works in a worktree (isolated branch)
- Creates PR when done

### 3. Launcher

CI gate + optional human testing:

- Waits for GitHub Actions CI results (typecheck, tests, lint) via webhook
- CI green → auto-advance to reviewer
- CI red → auto-dispatch back to builder with failure details to fix
- **Optional**: deploys preview branch to Cloudflare Pages, sets orange signal with test script + preview URL for human testing
- Human tests, marks green → advances to reviewer
- Skippable for backend-only changes (no preview needed)

### 4. Reviewer

Quality gate:

- Code review (patterns, security, correctness)
- Screenshot / visual review (if configured)
- Can use code-smell-detector, proactive-reviewer subagents

### 5. Merger

Final step:

- Merges origin/main into branch (not rebase — no force push)
- Resolves conflicts if any (up to 3 attempts, then orange for human)
- Squash-merges PR via `gh pr merge --squash --delete-branch`
- Pulls main on Pi worker so it has latest code for next dispatch
- Closes the pipeline

## Node-Level Preferences

When creating a work item, you can configure which stages are active:

```
☑ Analyst review (default: on)
☐ Launcher/CI gate (default: off for backend, on for UI)
☐ Human testing with preview URL (default: off)
☐ Require human approval at reviewer stage (default: off)
☐ Auto-merge on green CI (default: off)
```

## One Node, Many Steps

One node progresses through stages (not separate nodes per step):

```
Node: "Add nodeId filter to chatconversations"
  Stage: analyst ✅ → builder ✅ → reviewer ✅ → merger ✅
  Signal: 🟢 (all green, PR merged)
```

The node card shows LED-style indicators for each stage. Physical device aesthetic — designed for future hardware-inspired UI.

## Stage Output History

Each stage's output is stored in the artifacts array (not overwriting `output`):

```json
[
  { "type": "stage-output", "stage": "analyst", "signal": "green", "output": "...", "timestamp": "..." },
  { "type": "stage-output", "stage": "builder", "signal": "green", "output": "...", "timestamp": "..." }
]
```

Rendered in the detail panel as an accordion — one section per completed stage.

## Implementation Status (MVP — 2026-03-20)

### What's built and proven

1. **`stage` and `signal` fields** on work items (schema, DB, API, composable)
2. **LED-style pipeline UI** — 4 dots (A B R M) on every card, physical device aesthetic
3. **Analyst gate** — evaluate-only, no file modifications, sets signal
4. **Builder routing** — delegates to existing type-specific instructions
5. **Reviewer stage** — code review and quality gate
6. **Merger stage** — merge into main, resolve conflicts, squash-merge PR, pull main
7. **Green auto-advance** — webhook reads signal from DB, advances stage, auto-dispatches to Pi
8. **Session cleanup before callback** — prevents race condition on re-dispatch
9. **Always-visible dispatch button** — disabled when active/done (for physical UI later)

### Proven flow (tested 2026-03-20)

```
Dispatch "Add nodeId filter to chatconversations GET endpoint"
  → Analyst (17s): green — clear brief, identified target files
  → Builder (72s): green — created branch, implemented nodeId filter, pushed PR
  → Reviewer (45s): green — code looks good, matches brief
  → Merger (35s): green — squash-merged PR #19, pulled main
  Total: ~3 minutes, fully autonomous
```

### Key files

| File | What it does |
|------|-------------|
| `collections/workitems/types.ts` | `stage` and `signal` fields |
| `collections/workitems/server/database/schema.ts` | DB columns |
| `ThinkgraphWorkitemsNode.vue` | LED strip UI, dispatch button |
| `session-manager.ts` | Stage routing, analyst/builder/reviewer/merger instructions |
| `pm-tools.ts` | update_workitem accepts stage/signal/assignee |
| `webhook.post.ts` | Reads signal from DB, stage progression, auto-dispatch |
| `work-item.post.ts` | Defaults stage to 'analyst', passes to Pi |

### Built in session 2 (2026-03-20)

1. **Orange response UI** — when analyst/reviewer signals orange, detail panel shows questions prominently with textarea + "Respond & Re-dispatch" button. Appends human answer to brief and re-runs same stage.
2. **Launcher stage** — inserted between builder and reviewer in STAGE_ORDER. CI webhook sets signal on work items at launcher stage: pass → green (auto-advance to reviewer), fail → reverts to builder with error details (auto-dispatches Pi to fix). LED strip updated to 5 dots (A B L R M).
3. **Stage output accordion** — webhook stores each stage's output as `{ type: 'stage-output', stage, signal, output, timestamp }` artifact before advancing. Detail panel renders pipeline history as UAccordion with signal icons.

### What's NOT built yet

- **Analyst screenshots** — analyst can take screenshot to verify UI state before evaluating
- **Launcher preview deploy** — optional Cloudflare Pages preview with test script + URL (orange signal for human testing)
- Node-level pipeline preferences (pipelineConfig)
- Group briefs
- Designer/prototyper stage

## Open Questions

- Should the pipeline be configurable per-project or per-node? (Probably per-node with project defaults)
- How does the human "answer" orange questions? Edit the brief? Chat reply? Child node?
- How do we handle pipeline loops? (Reviewer → Builder → Reviewer could cycle forever — need a max iterations cap)
- Stage order: should launcher always run, or be opt-in per work item?
