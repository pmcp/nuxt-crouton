# Agents

Custom Claude Code sub-agent definitions for this repo. Each `*.md` file is one agent:
YAML frontmatter (`name`, `description`, `tools`, `model`) + a system prompt body.
Spawn them with the `Agent` tool (`subagent_type: "<name>"`); the harness matches by
the `name` field.

## The task-decomposition pipeline

A recursive "one task → tree of GitHub issues → agents" system. Entry point is the
`/task-decompose` skill (`.claude/skills/task-decompose/`). See epic **#249**.

```
/task-decompose '<task>'
  └─ task-orchestrator (depth 0)      reads epic → 2–6 sub-issues → spawns a decomposer per child
       └─ task-decomposer (depth 1+)  LEAF TEST one issue:
            ├─ leaf / depth==MAX  →   spawn task-worker (worktree) → PR (Closes #N)
            └─ too big           →    create sub-issues → spawn a decomposer per child (RECURSE)
```

| Agent | File | Recurses? | Writes code? |
|-------|------|-----------|--------------|
| `task-orchestrator` | `task-orchestrator.md` | no | no |
| `task-decomposer`   | `task-decomposer.md`   | **yes** | no |
| `task-worker`       | `task-worker.md`       | no | **yes** (one leaf → one PR) |

### The agent contract

- **Input is passed in the prompt** as a small JSON-ish object — e.g.
  `{ issue_number, depth, epic }`. Each agent documents the exact shape it expects at the
  top of its body. Always pass `depth` and `epic` down the chain.
- **GitHub is the source of truth.** Every level is a real issue (epic → sub-issues),
  linked via `sub_issue_write`, labelled per the `github-tasks` skill (one `type:*` +
  one `pkg:*`/`app:*`; `epic` carries no type; never `root`).
- **Idempotency.** Agents may be re-run (sessions are ephemeral). Before creating
  children, check `get_sub_issues` and don't duplicate — re-spawn for unworked children.
- **Stop-conditions live in `task-decomposer.md`:** `MAX_DEPTH = 3`, `MAX_CHILDREN = 6`,
  and the four-part LEAF TEST. Tune them there (+ orchestrator's MAX_CHILDREN).
- **Async human-in-the-loop (`NOTIFY_HANDLE = @pmcp`).** Agents may run headless, so they
  **never block on `AskUserQuestion`** (it times out). On a real blocker they
  `add_issue_comment` with the question, **@mention `NOTIFY_HANDLE`** (so the owner gets a
  GitHub/app notification), apply `status:blocked`, and stop — the human answers by
  replying on the issue. Small ambiguities are decided with a default + a noted
  assumption (no ping). Change the handle in this file and in the task-decompose skill.
- **Workers are isolated.** The decomposer spawns workers with `isolation: "worktree"`
  so parallel leaves never collide on branches/files. One issue → one branch → one PR
  with `Closes #NN`. Workers obey the `packages/` HARD GATE and the `/commit` + no-squash
  merge policy.

### Adding a new agent

Create `<name>.md` with frontmatter + body, keep `tools` minimal (grant `Agent` only to
agents that must spawn others), and register it in this table. If it's part of a tracked
initiative, open the issue first (ISSUE-FIRST).
