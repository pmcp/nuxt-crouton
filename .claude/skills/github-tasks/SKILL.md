---
name: github-tasks
description: Track work as GitHub issues in this monorepo — create epics + child/sub-issues, label them consistently by package/app, and tie them into the commit workflow. Use when planning a feature, breaking work into tasks, or asked to "track this in GitHub", "make issues", "set up tracking".
allowed-tools: mcp__github__issue_write, mcp__github__sub_issue_write, mcp__github__issue_read, mcp__github__list_issues, mcp__github__search_issues, mcp__github__get_label, Bash, Read, Grep
---

# GitHub Task Tracking

The canonical task tracker for this repo is **GitHub Issues** (`pmcp/nuxt-crouton`). This skill defines how to create and label them consistently so every task maps to a real part of the monorepo.

## Writing for two audiences (REQUIRED — applies to issues, PRs, and commits)

Everything that lands in GitHub is written for **two readers**, in this order:

### 👤 For humans (first — and it must be genuinely easy to read)
Lead with this. Plain language a busy person skims in seconds: *what changed, why it matters, what to expect* — impact over mechanics. Short sentences, no unexplained jargon, no raw file paths unless they're the point. Use a **diagram only when it makes the change easier to understand** (a flow, a before/after, an architecture or state change). Mermaid renders in issue/PR bodies — use it there. **Never add a diagram for decoration**; if it doesn't earn its space, leave it out.

### 🤖 For agents
A precise, structured block an AI can act on without guessing: scope, exact files/paths and symbols, behaviour changes, acceptance criteria, follow-ups, links to issues/docs.

Use explicit headings (`## 👤 For humans` / `## 🤖 For agents`) so both are obvious. Scale to the change — a one-line human summary is fine for something small — but **always include both**.

## Core rules

1. **Every issue maps to a package or an app — never "root".** If it feels like root-level work (CI, deploy, ops), label it with the **app it serves** (e.g. CI that builds fanfare → `app:fanfare`). There is deliberately no `root` label.
2. **Exactly one `type:*` label** per issue — except an **epic**, which carries `epic` instead of a type.
3. **Component label = where the source actually changes** (mirrors the commit-scope convention):
   - `pkg:<name>` for package source (`packages/*`, e.g. `pkg:crouton-sales`)
   - `app:<name>` for app/deployment/ops work (`apps/*`, e.g. `app:fanfare`)
   - `worker:<name>` for `workers/*`
   - Package work that also lands a schema/config change in an app gets **both** (e.g. `pkg:crouton-sales` + `app:fanfare`).
4. Use meta labels where they apply: `epic`, `spike`, `needs-triage`.

## Structure

- **Epic** — one tracking issue per initiative. Body: goals, a checklist of workstreams, links to design docs. Labels: `epic` + the primary `pkg:`/`app:` it spans.
- **Child issues** — one per workstream, each linked as a **sub-issue** of the epic so GitHub shows a progress bar.
- Keep issue bodies tight: scope, acceptance criteria, links to `docs/`.

## How to create them (tools)

Issues, sub-issues, and labels are managed through the GitHub MCP tools:

- Create / update: `mcp__github__issue_write` (`method: create|update`, pass `labels: [...]`).
- Link a child under a parent: `mcp__github__sub_issue_write` (`method: add`, `issue_number` = parent, `sub_issue_id` = the child's **id** from its create response — not its number).
- Read / list: `mcp__github__issue_read`, `mcp__github__list_issues`, `mcp__github__search_issues`.

**Labels must already exist** before you can apply them — applying an unknown label errors. New labels are added via labels-as-code (below), not by the API.

**Projects v2 boards can't be created or managed via these tools** (UI-only). Tell the user to create the board in the web/iOS app; if they enable the project's "Auto-add" workflow, issues you create land on the board automatically.

## Labels-as-code

The label taxonomy lives in **`.github/labels.yml`** and mirrors the workspace: `pkg:*` for every `packages/*`, `app:*` for every `apps/*`, `worker:*` for `workers/*`, plus `type:*` and meta labels. It's synced **non-destructively** by `.github/workflows/labels.yml` (`skip_delete`) on changes to `main` or via `workflow_dispatch`.

To add or change a label: edit `.github/labels.yml`, commit, and let the workflow sync it on merge to `main`. When a new package or app is added, add its `pkg:`/`app:` label here too.

## Fit into the task workflow

GitHub issues slot into the repo's task-execution flow (see `CLAUDE.md`):

1. **Pick / open an issue** — the issue is the unit of work. For a multi-step initiative, open an epic + sub-issues first.
2. **Mark in progress** — assign yourself / set the Project Status to In Progress (if a board exists).
3. **Branch + do the work** — work on a feature branch; follow `CLAUDE.md` patterns; run `pnpm typecheck`.
4. **Commit** — use the `/commit` skill, referencing the issue in the body (e.g. `(#NN)`).
5. **Open a PR** — early is fine. Put `Closes #NN` in the body so the issue auto-closes on merge. Let CI run and fix failures (the PR can be watched/autofixed).
6. **Squash-merge** → the issue closes automatically and the branch is deleted. Don't push feature work straight to `main`.

Work lands via **PRs**, not direct pushes to `main`. Issues are the source of truth for *what* to do; `docs/PROGRESS_TRACKER.md` (if used) becomes an optional phase-level rollup, not the per-task tracker.

## Quick reference

| Want | Label(s) |
|------|----------|
| New feature in a package | `type:feat` `pkg:<name>` |
| Feature touching a package + app schema/config | `type:feat` `pkg:<name>` `app:<name>` |
| App/deployment/ops/CI work | `type:chore`/`type:docs` `app:<name>` |
| Cross-cutting initiative | `epic` `pkg:<name>` (+ `app:<name>`) |
| Time-boxed proof-of-concept | `spike` `type:feat` `<component>` |
