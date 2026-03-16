# ThinkGraph — Vision Brief

## What it is
A spatial, collaborative, multi-agent execution canvas built on Vue Flow + Yjs. ThinkGraph is
simultaneously the execution layer, the context manager, the version history, and the
branching mechanism for AI-driven development work. It sits on top of Notion as the source
of truth for planned work, and on top of git worktrees as the execution environment.

---

## Data hierarchy

```
Notion Epic
  └── User Story (Notion) → syncs to canvas as path root node
        └── Tasks (created by ThinkGraph AI, pushed to Notion)
              └── Execution nodes (decisions, questions, milestones) — canvas only
                    └── Human nodes (forks, remarks, inject requests) — canvas only
```

**Notion is the authority for planned work. ThinkGraph is the authority for execution.**

- Planned structure (epics, user stories, tasks) lives in Notion
- Execution trace (decisions, questions, milestones, AI output) lives on the canvas
- ThinkGraph writes back to Notion: task creation + status updates only
- The canvas never replicates a kanban — Notion owns that

---

## Node types

| Type | Origin | Behaviour |
|---|---|---|
| **Epic** | Notion sync | Root of the canvas. Sets the goal and brief for all downstream nodes. |
| **User Story** | Notion sync | Path root. AI does a planning pass to generate a draft task tree. |
| **Task** | ThinkGraph → Notion | AI-proposed, human-approved, written to Notion, armed for execution. |
| **Milestone** | AI-generated | Checkpoint with a handoff brief. Propagates context downstream. |
| **Question** | AI-generated | Blocks or awaits input before session continues. |
| **Decision** | AI-generated | Records a choice + rationale. Permanent artifact in the context chain. |
| **Remark** | Human | Annotation. No execution. |
| **Fork** | Human | New branch from any node. New worktree if task type. |
| **Send** | Human or AI | Fires a request to any external AI (Claude, GPT, Flux, etc.). |

---

## The planning pass

When a User Story node lands on the canvas, ThinkGraph performs a **planning pass** before
any execution:

1. Reads the user story + epic brief as context
2. Reads relevant sibling story nodes for cross-context
3. Proposes a task breakdown as draft child nodes on the canvas
4. Draft nodes appear in a visual "proposed" state — dashed border, no step number yet
5. Human reviews, edits, approves individual nodes or the full branch
6. On approval: nodes solidify, get written to Notion as tasks, become executable

This replaces the planning meeting. The AI does the breakdown, the human shapes it.

---

## Execution model

Each approved Task node:
- Spawns a git worktree: `task/{nodeId}`
- Runs a Claude Code session via MCP + skill
- Emits typed structured events (not raw stdout):

```json
{ "type": "milestone", "title": "...", "summary": "..." }
{ "type": "question", "text": "...", "options": [] }
{ "type": "decision", "choice": "...", "rationale": "..." }
{ "type": "progress", "message": "..." }
```

- `progress` events are suppressed from canvas (internal only)
- All other event types become nodes
- On session close, Claude Code generates a **handoff brief** stored as the node artifact
- The brief is the context payload that travels to child nodes — not raw output

---

## Context model

Each node has configurable context scope:

- **Full** — entire ancestor chain (all parent briefs)
- **Branch** — direct parent chain only
- **Manual** — cherry-pick any nodes from anywhere on the canvas

Context is always passed as **briefs**, not raw session output. Token usage stays bounded
regardless of tree depth. Deep chains can be compressed by a summarisation node.

---

## Send node

Fires a one-shot request to any AI endpoint. Execution modes:

- **Block** — parent session pauses until response arrives
- **Async** — parent continues, response arrives as a new node when ready
- **Fire & forget** — sends, documents, never formally awaits

Response becomes a new node on the canvas, injectable as context downstream.
Block + queue = human approval gate.

---

## Collaboration (Yjs)

The canvas is a Yjs document. Real-time multi-user by default.

Inject modes (configurable per canvas or per node):
- **Direct** — child node immediately feeds the running session
- **Queue** — stacks up, session owner approves before injection
- **Fork** — always starts a new branch, never touches parent session

Presence is free — teammates are visible hovering nodes before they act.

---

## Visual language

Node status is expressed through animation:

| Status | Animation |
|---|---|
| Thinking | Slow pulse |
| Working | Progress ring + animated bar |
| Blocked / awaiting | Dimmed, waiting indicator |
| Needs attention | Orange glow, subtle shake |
| Done | Settled, color shift |
| Error | Red, urgent pulse |
| Draft / proposed | Dashed border, reduced opacity |

Context visualisation when a node is selected:
- Non-context nodes dim
- Ancestor nodes highlight
- Edges between context nodes animate (flow direction = data direction)

---

## Version history

**The tree is the timeline.** No separate concept needed.

- Navigate to a parent node = go back in time
- Create a child branch from any node = fork from that point
- Nodes tagged with `created_at` + `step_index` for ordering within a branch
- AI-generated and human-authored nodes are visually distinct

---

## Scale strategy

- **One canvas per epic** — closes when epic is done, becomes a readable artifact
- User story paths collapse/expand — canvas never becomes a blob
- Cross-canvas context via manual node select + eventual RAG layer over canvas DB
- Epic overview panel: lightweight read-only progress per user story path (done / running / blocked)
  derived from canvas state, no extra sync needed

---

## Notion integration surface

| Direction | Operation |
|---|---|
| Notion → ThinkGraph | Sync epic + user stories on canvas open |
| ThinkGraph → Notion | `create_task` on planning pass approval |
| ThinkGraph → Notion | `update_status` on task node completion |

Notion owns: epics, user stories, tasks, kanban, sprint planning, backlog.
ThinkGraph owns: execution trace, AI nodes, context chains, worktrees.

---

## Known open questions

1. **Context window creep** — when to auto-trigger summarisation on deep chains
2. **Skill versioning** — which version ran affects resume/remix behaviour
3. **Worktree lifecycle** — close/merge/abandon state to trigger cleanup
4. **Cost visibility** — token counter per node and per run
5. **Simultaneous fork conflicts** — two teammates fork same node: both run? queue?
6. **Emergent task visibility** — AI-discovered subtasks: when/how to push back to Notion
