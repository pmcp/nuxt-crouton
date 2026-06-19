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

| Agent | File | Recurses? | Writes code? | Model |
|-------|------|-----------|--------------|-------|
| `task-orchestrator` | `task-orchestrator.md` | no | no | `sonnet` |
| `task-decomposer`   | `task-decomposer.md`   | **yes** | no | `sonnet` |
| `task-worker`       | `task-worker.md`       | no | **yes** (one leaf → one PR) | `opus` |

**Model split (cost):** orchestrator + decomposer only read/write GitHub issues, so they
run on **Sonnet**; only `task-worker` writes real code, so it runs on **Opus**. Each
spawned agent re-pays the base context (system prompt + this repo's large `CLAUDE.md` +
tool defs), so fan-out is the dominant cost — drop the issue-only agents to `haiku` for a
cheaper (slightly blunter) split, or raise them to `opus` if decomposition quality slips.

### The agent contract

- **Input is passed in the prompt** as a small JSON-ish object — e.g.
  `{ issue_number, depth, epic }`. Each agent documents the exact shape it expects at the
  top of its body. Always pass `depth` and `epic` down the chain.
- **GitHub is the source of truth.** Every level is a real issue (epic → sub-issues),
  linked via `sub_issue_write`, labelled per the `github-tasks` skill (one `type:*` +
  one `pkg:*`/`app:*`; `epic` carries no type; never `root`).
- **Idempotency.** Agents may be re-run (sessions are ephemeral). Before creating
  children, check `get_sub_issues` and don't duplicate — re-spawn for unworked children.
- **Verify, don't narrate (artifact-gate, #461).** NEVER report a step done from *intent*.
  Re-read the issue/PR and confirm the artifact actually exists — the comment posted, the PR
  opened, the file written — before you say it's done or end your turn. Describing the plan
  ("the worker is now creating the schemas…") is **not** doing it: that exact no-op (a run
  that exits `success` having produced nothing) is what the **artifact-gate** in
  `decompose-on-issue.yml` now turns into a **red** run. Do the work, then prove it landed.
- **Spawned agents are SYNCHRONOUS — there is NO "background" execution (the #455 root cause).**
  The `Agent`/Task tool runs a sub-agent **to completion and returns its result within your
  turn**. Nothing keeps running after you stop: when your turn ends, the GitHub Action **job
  ends and all work halts**. So you must **NEVER** end your turn saying *"the worker is running
  in the background — watch for the PR"* — that belief is **false** and is exactly how the #455
  build burned `$0.52` at `num_turns: 1` and produced nothing. After you spawn a worker you
  **already hold its result** — read it, confirm the PR/comment actually exists, and only then
  report. If the spawn didn't deliver, you are **not done**: spawn again (and wait), or do the
  work yourself. There is no fire-and-forget.
- **Stop-conditions live in `task-decomposer.md`:** `MAX_DEPTH = 3`, `MAX_CHILDREN = 6`,
  and the four-part LEAF TEST. Tune them there (+ orchestrator's MAX_CHILDREN).
- **Async human-in-the-loop (`NOTIFY_HANDLE = @pmcp`).** Agents may run headless, so they
  **never block on `AskUserQuestion`** (it times out). On a real blocker they
  `add_issue_comment` with the question, **@mention `NOTIFY_HANDLE`** (so the owner gets a
  GitHub/app notification), apply `status:blocked`, and stop — the human answers by
  replying on the issue. Small ambiguities are decided with a default + a noted
  assumption (no ping). Change the handle in this file and in the task-decompose skill.
- **An @mention is a request for action, not a broadcast.** Only @mention `NOTIFY_HANDLE`
  when you need the human to *do* something: answer a blocking question, give a sign-off,
  or unblock you. **Pure progress/status updates** ("spawning the worker for #NN", "wave 2
  of 4 starting", "preview deploying") are posted as **plain comments with no @mention** —
  they're FYIs, not asks. If nothing is required of the human, do not ping them.
- **Workers are isolated.** The decomposer spawns workers with `isolation: "worktree"`
  so parallel leaves never collide on branches/files. One issue → one branch → one PR
  with `Closes #NN`. Workers obey the `packages/` HARD GATE and the `/commit` + no-squash
  merge policy.

### Integration-branch flow & safety (#348)

Hardening from the #325 post-mortem (parallel workers off `main` re-created the same
package). Threaded through `epic_branch` in the agent contract:

- **Epic integration branch (#349).** The orchestrator creates `epic/<NN>-<slug>` off
  `main` and passes `epic_branch` down to every decomposer/worker. Workers branch off it
  and target their PRs **at it**, not `main` — so later sub-issues see earlier ones' merged
  work. One **epic→`main`** PR at the end is the single human review; the epic isn't "done"
  until that lands. Dependency-ordered children are **wave-gated** (foundation first).
- **Epic-scoped approval (#350).** The `packages/` gate also honours the
  `CROUTON_PACKAGE_EDIT_APPROVED` env var (inherited by spawned workers) — approve a
  package-touching epic once, not per worker. The `.package-edit-approved` file must never
  be committed (`guard-package-approval.yml` enforces it).
- **Block, don't improvise (#352).** A worker missing a prerequisite a sibling owns
  **stops** (blocker) — it never scaffolds the missing thing or silently diverges from the
  epic's stated design invariants (which the decomposer passes into the worker prompt).

### Claude-action workflow standard (any `anthropics/claude-code-action` workflow)

When you add or copy a workflow that runs `anthropics/claude-code-action` (the event→agent
glue like `claude.yml` / `decompose-on-issue.yml` / `resume-on-comment.yml`), it MUST carry
all of these by **default** — they're not optional extras; each one has burned us:

- **`id-token: write` at the JOB level.** Job-level `permissions` *fully overrides* (does
  not merge with) the workflow-level block, so a workflow-level `id-token` is silently
  shadowed and the action's OIDC request fails (`Could not fetch an OIDC token`). #284 fixed
  one workflow; the identical bug survived in two siblings until #429. Put it in the job.
- **`anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}`** — a real API key, NEVER a
  subscription `CLAUDE_CODE_OAUTH_TOKEN` (subscription OAuth is interactive-only and
  disallowed for CI — Anthropic Legal & Compliance).
- **`show_full_output: true`** — the full agent log prints inline; debugging a run must not
  require a debug re-run.
- **Pin the action to a SHA, kept in sync** across these workflows (bump them together).

A new claude-action workflow that omits any of these is treated like a failing build.

### Adding a new agent

Create `<name>.md` with frontmatter + body, keep `tools` minimal (grant `Agent` only to
agents that must spawn others), and register it in this table. If it's part of a tracked
initiative, open the issue first (ISSUE-FIRST).
