---
name: task-decompose
description: Turn one task into a tree of GitHub issues worked by agents. Creates (or reuses) an epic issue, then launches the recursive orchestrator → decomposer → worker pipeline. Use when asked to "decompose a task", "break this down into issues and work it", "spawn agents to build X", or run via /task-decompose.
allowed-tools: mcp__github__issue_read, mcp__github__issue_write, mcp__github__sub_issue_write, mcp__github__list_issues, mcp__github__search_issues, mcp__github__get_label, Read, Grep, Bash, Agent
---

# Task Decompose

The single entry point for the **recursive task-decomposition agent pipeline**. One task
in → an epic with a tree of sub-issues, each leaf worked by an agent on its own branch.

```mermaid
flowchart TD
    U["/task-decompose '<task>'"] --> S[This skill: ensure epic exists]
    S --> O[task-orchestrator · depth 0]
    O -->|2–6 sub-issues| D[task-decomposer · depth 1+]
    D -->|leaf?| Q{LEAF TEST + depth < 3}
    Q -->|leaf / at cap| W[task-worker · worktree → PR Closes #N]
    Q -->|too big| D2[task-decomposer · depth+1]
    D2 --> Q
```

## The three agents

| Agent | Role | Recurses? | Spawns |
|-------|------|-----------|--------|
| `task-orchestrator` | reads the epic, makes 2–6 top-level sub-issues | no | a decomposer per child |
| `task-decomposer`   | LEAF TEST one issue: split or build | **yes** | decomposers (split) or a worker (leaf) |
| `task-worker`       | implements one leaf issue → PR | no | nothing (terminal) |

## Stop-conditions (so it can't run away)

- **MAX_DEPTH = 3** — at depth 3 the decomposer stops splitting and treats the issue as a
  leaf, however big it looks.
- **MAX_CHILDREN = 6** — at most 6 children per split (orchestrator and decomposer alike).
- **LEAF TEST (all four)** — single coherent change · bounded file set · clear/testable
  acceptance · doable in one focused worker run. All true ⇒ build it, don't split.

To tune the limits, edit the numbers in `.claude/agents/task-decomposer.md` (and the
orchestrator's MAX_CHILDREN).

## Integration-branch flow & safety (#348 hardening)

Learned from the #325 run, where parallel workers — branching off `main`, unable to see
each other's unmerged work — each re-created the same new package and a couple silently
chose a different design. Four rules now prevent that:

1. **Epic integration branch (#349).** The orchestrator creates `epic/<NN>-<slug>` off
   `main`. Every sub-issue branches off **that** branch and targets its PR **at** it (not
   `main`), so a later sub-issue sees what an earlier one built — no duplicate scaffolds.
   The whole feature gets **one** human review when `epic/<NN>` is PR'd into `main` at the
   end (the epic is "done" only then, not when its children merge into the epic branch).
   Dependency-ordered children are **wave-gated** (foundation merges first, then dependents
   on an idempotent re-run); independent ones still run in parallel.

2. **Epic-scoped package approval (#350).** A package-touching epic is approved **once**:
   the `packages/` gate honours the **`CROUTON_PACKAGE_EDIT_APPROVED`** env var (inherited
   by every spawned worker), so you don't unlock per-worker. **Never** commit the
   `.claude/.package-edit-approved` file — `guard-package-approval.yml` fails any PR to
   `main` that contains it (env can't leak; a committed file would disable the gate for all).

3. **Review dial (#351).** Risky epics (create a package / change schema / dependency
   chain, or labelled `review:plan`) **pause for human plan-approval before any worker
   runs** — the orchestrator posts the proposed tree, @mentions `@pmcp`, blocks. Plus the
   epic→`main` PR is the integration review. Low-risk epics (`review:auto`) skip the gate.

4. **Block, don't improvise (#352).** A worker that finds a prerequisite missing (a
   package/table/symbol a sibling owns, not yet merged) **stops and waits** — it never
   scaffolds the missing thing itself, and never silently diverges from the epic's stated
   design invariants. Missing prerequisite = blocker, not a DIY.

## Triggers (manual + automatic)

- **Manual:** run `/task-decompose "<task>"` or `/task-decompose #NN` in any Claude Code
  session (CLI, web, desktop, mobile app).
- **Automatic — issue opt-in:** add the **`auto-decompose`** label to any issue and
  `.github/workflows/decompose-on-issue.yml` runs `/task-decompose #NN` for you (no
  command needed). Gate is the label, so only opted-in issues fire.
- **Automatic — resume after a blocker:** when an agent @mentions you and sets
  `status:blocked`, just **reply on the issue** — `.github/workflows/resume-on-comment.yml`
  picks it back up, removes the block, and continues.

### Auth & billing (read before changing the workflows)

- **Interactive runs (you typing `/task-decompose` in a CLI / web / app session)** run on
  **whatever your session is logged into** — a **Claude Pro/Max subscription is fine**;
  this is ordinary interactive Claude Code use.
- **The automated workflows are headless/unattended, so they MUST use an
  `ANTHROPIC_API_KEY`** repo secret (same as `claude.yml`) — pay-per-token. **Do NOT wire
  them to a subscription `CLAUDE_CODE_OAUTH_TOKEN`.** Per Anthropic's Legal & Compliance
  terms, subscription OAuth is for *ordinary, individual, interactive* use of Claude Code,
  **not** CI / Agent-SDK / headless automation (which bills at standard API rates). Using a
  subscription token to drive these workflows would be against the terms.
- Cost is therefore a real factor on the automated path — see the model split in
  `.claude/agents/CLAUDE.md` (Sonnet for the issue-only agents, Opus only for the worker)
  and the `MAX_DEPTH`/`MAX_CHILDREN` caps that bound fan-out.

## How to run

`$ARGUMENTS` is either:
- **free text** — a task description → create a new epic, then orchestrate; or
- **`#NN` / a number** — an existing issue → reuse it as the epic, then orchestrate.

### Procedure

1. **Resolve the epic.**
   - If `$ARGUMENTS` is (or contains) an issue number: `issue_read` it; use it as the epic.
   - Else: **search first** (`search_issues`/`list_issues` by keywords + `epic` label) to
     avoid a duplicate. If a matching epic exists, reuse it. Otherwise create one with
     `issue_write` (method `create`):
     - title: plain human English (no jargon);
     - labels: `epic` + the component it primarily spans (`pkg:*`/`app:*`; never `root`).
       For dev-tooling/`.claude` work that serves the whole monorepo, use `meta:agents`;
     - body: `## 👤 For humans`, `## 🤖 For agents`, `## 🧪 How to test` per `github-tasks`.
2. **Launch the orchestrator.** Spawn it via the `Agent` tool:
   - `subagent_type: "task-orchestrator"`
   - prompt: `{ epic_issue_number: <epic number>, depth: 0 }` + a short restatement of the
     task so it doesn't need an extra read.
3. **Report** the epic url and that orchestration has started. The orchestrator creates the
   `epic/<NN>-<slug>` integration branch; the tree then builds itself onto it (decomposers
   recurse; workers open PRs into the epic branch with `Closes #NN`); a single epic→`main`
   PR lands the lot behind one review.

## Building an app? It's a POC by default — end at a preview URL

When the task is **"build an app / build X"** (a runnable app, not a package or tooling change), it is a **POC by default** — the user does **not** need to say "as a poc":

- **Default to POC.** In an *interactive* session you MAY ask once **"POC (preview) or launched app?"** — but the default is **POC**, and when running **headless you never ask** (the pipeline can't block): always POC. An app only starts in `apps/` if the user *explicitly* says it's a production launch.
- **Scaffold under `pocs/<name>`, NOT `apps/`** — the safe-to-break incubator (root `CLAUDE.md`). Label its issues `poc:<name>`. `apps/` is only for launched apps with a production counterpart.
- **The endpoint is a deployed, testable preview URL — not merged code.** The orchestrator MUST make the **last workstream a deploy-preview issue**: run `pnpm poc:scaffold-deploy <name>` and open the PR so CI deploys an isolated staging Worker and posts the **`https://<name>.pmcp.dev`** URL (auth-working). See the **`poc-deploy`** skill.
- **Testable with auth:** the POC's `seed` provisions a known admin; the epic's verify rollup hands back the URL **and** the login. Don't call an app build "done" until the preview URL is live.
- **Promotion is a separate, explicit step.** A POC graduates to production by being promoted **`pocs/<name>` → `apps/<name>`** (taking on `apps/` rigor, the `app:<name>` label, and a prod two-domain deploy). Never automatic — only on an explicit "launch/promote" request.

## Notifications & async Q&A (`NOTIFY_HANDLE = @pmcp`)

Headless/automation runs (a webhook- or Action-triggered session) have **no human
attached**, so agents must **never block-and-wait** on a question — `AskUserQuestion`
just times out there. Instead the pattern is **comment-and-stop**, and the comment
**@mentions the notify handle** so the owner gets a real GitHub notification (which
surfaces in the GitHub / Claude mobile app):

- **Small ambiguity** → decide with a sensible default, record the assumption in the
  issue body, keep going. *No mention* (don't spam).
- **Progress / status update** ("spawning the worker for #NN", "wave 2 of 4 starting",
  "preview deploying") → a plain `add_issue_comment` with **no @mention**. An @mention is
  a request for the human to *act*; an FYI is not. If nothing is required of the owner,
  do not ping them — post the update unmentioned (or skip it).
- **Real blocker / decision needed** → `add_issue_comment` on the issue with a tight
  question + options, **@mention `NOTIFY_HANDLE`**, apply the `status:blocked` label,
  then **stop** that branch. The owner replies on the issue; a resume trigger (or a
  human re-running `/task-decompose #NN`) picks the thread back up.
- **Epic done** → when the last child merges, the verify-rollup comment on the epic
  also @mentions `NOTIFY_HANDLE` (per `github-tasks`).

To change who gets pinged, edit `NOTIFY_HANDLE` here and in `.claude/agents/CLAUDE.md`.

## Notes

- Everything persists as real GitHub issues (epic → sub-issues → sub-sub-issues), so the
  tree survives across sessions and shows progress bars on each parent.
- Workers run in **git worktree isolation** — parallel leaves never collide; they branch
  off and PR into the **epic branch**, not `main` (see "Integration-branch flow").
- This plugs into the repo's ISSUE-FIRST + `github-tasks` + `/commit` + merge-policy
  workflow; the agents enforce those rules themselves.
- Sub-PRs may auto-merge into the **epic branch** (a staging area). The final
  **epic→`main`** PR is **not** auto-merged — that's the human review/merge gate.
