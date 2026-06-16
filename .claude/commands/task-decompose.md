---
description: Decompose a task into a tree of GitHub issues and spawn agents to work them
---

Run the **task-decompose** skill with the following input.

**Task (free text, or an existing issue number like `#249`):**
$ARGUMENTS

## Instructions

1. Invoke the `task-decompose` skill (`.claude/skills/task-decompose/SKILL.md`) — do not
   reimplement its logic here; the skill is the source of truth.
2. Pass `$ARGUMENTS` through as the task: free text → create a new epic; a number/`#NN` →
   reuse that issue as the epic.
3. The skill resolves/creates the epic, then spawns the `task-orchestrator` agent, which
   fans out into `task-decomposer` (recursive) → `task-worker` agents.
4. Report back the epic URL and that orchestration has started.

Stop-conditions are enforced by the agents themselves (MAX_DEPTH = 3, MAX_CHILDREN = 6,
the four-part LEAF TEST). See the skill for how to tune them.
