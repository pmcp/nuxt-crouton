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

## How to test (REQUIRED on every closeable issue/PR — written for a human)

Every issue that changes observable behaviour, and every PR, MUST carry a **`## 🧪 How to test`** section written for someone who knows the *app concept* but not the code. It is not "run the unit tests" — it is *where a person clicks and what they should see*. Treat it as the acceptance check: if a non-developer can't follow it to confirm the change, it's not done.

Write it as:
- **What changed** — one or two plain sentences: what's different now vs. before.
- **Where you'll see it** — the concrete surface: the URL/page, the button, the screen. Name it the way a user would ("the top-right log-out button", "the access-code screen"), not by file or component.
- **Steps** — a short numbered walk-through, each step an action + the expected result. Include the **before/after contrast** where it matters ("previously the kassa still showed; now you land on the access-code screen").
- **Test data** — any PINs, logins, or seed URLs needed to reproduce (e.g. `/test1/nl/vlaamsekermis`, helper PIN `1234`).

Keep it tight and skimmable. A `mermaid` flow is welcome when the steps branch or the state change is the point — never for decoration.

### Epic acceptance rollup (the epic is the verification unit)

Sub-issues are the **work** unit; the **epic** is the **verification** unit. When all of an epic's sub-issues have merged (the feature has "landed in the app"), post a single **`## 🧪 Verify the whole thing`** comment on the epic *before closing it* — so the owner does **one** QA pass instead of hunting across sub-issues:

- **What landed** — one plain line per merged sub-issue/PR (what's now different).
- **Where to test** — the **one** link: the deployed preview or production URL, plus any test data (PINs/logins/seed URLs) needed.
- **Walkthrough** — the per-issue "How to test" steps **stitched into one ordered pass** a human runs end-to-end, with the before/after where it matters.

Close the epic **only after that pass passes** (or the owner confirms). This turns "a bunch of merged PRs" into a single "now go click these and confirm it all works" checklist for a non-technical owner. If a sub-issue couldn't be auto-verified (e.g. needs a device), say so explicitly in the rollup rather than implying it's confirmed.

### Preview links rollup (the epic aggregates its sub-issues' previews)

The per-PR preview deploy (`.github/workflows/deploy-fanfare-preview.yml`, and the same pattern for other apps) posts a `<branch>.<app>.pages.dev` URL as a bot comment on each PR. **Don't leave those links stranded on individual PRs — roll them up into the parent epic** so the epic itself answers "what changed, and where do I click to try it?" at a glance.

Maintain a **`## 🔗 Preview links`** table in the **epic body** — create it when the first sub-issue PR deploys a preview, and keep it current as more land:

| Sub-issue | What changed | Preview |
|-----------|--------------|---------|
| #105 Orders block | standalone Orders CMS block | https://…fanfare.pages.dev |
| #106 Clients block | standalone Clients CMS block | https://…fanfare.pages.dev |
| **Whole epic** | integrated build | https://…fanfare.pages.dev |

Rules:
- **Copy the URL from the preview bot comment** — never hand-construct it (Cloudflare truncates the branch slug unpredictably).
- **One row per sub-issue**, updated *in place* when the PR is re-pushed — never append duplicates. If several sub-issues ship in one PR (one branch), they share one preview URL: give each its own row pointing at the same link.
- **Overall epic preview** = the preview of the PR that integrates the epic (often a single feature PR, or the last sub-issue PR). Record it as a **Whole epic** row so there's one "try the whole thing" link.
- Update the table on the **same beat as setting `status:in-progress`** — i.e. right after you open/refresh a sub-issue PR and the bot comments. That keeps the epic the single live verification surface.
- **Branch previews are ephemeral** (retired/overwritten once the branch is gone or rebuilt). When the epic merges, fold the table into the `## 🧪 Verify the whole thing` rollup and **replace per-branch URLs with the canonical staging/production URL**.

**Titles are human-first too.** Issue/PR titles read like plain English that anyone grasps at a glance ("Run the whole app on a Raspberry Pi and print directly"), not jargon ("node-server preset + in-process TCP drainer"). Keep the technical specifics in the 🤖 body, never the title.

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
- Keep issue bodies tight: scope, acceptance criteria, links to `docs/`, and the required **`## 🧪 How to test`** section (above).

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

1. **Check for existing work FIRST, then pick / open an issue** — the issue is the unit of work. Because sessions are ephemeral and a teammate (or a past you) may already have opened the epic/tasks, **always search before creating**: `mcp__github__search_issues` / `mcp__github__list_issues` (e.g. by `epic` label and by keywords for the feature). If a matching epic or task already exists, continue *that* one (assign yourself, set `status:in-progress`) instead of opening a duplicate. Only when nothing matches do you open a new epic + sub-issues for a multi-step initiative.
2. **Mark in progress — do this the moment you START, not after.** Apply the `status:in-progress` label and assign yourself; swap to `status:blocked` when waiting; remove the status label on close. **Tooling caveat:** the GitHub Project board's columns are driven by its own *Status field*, which these tools **cannot write** (Projects v2 fields aren't exposed — `list_issue_fields` is empty). So the label + assignment are the signals the agent sets; the board reflects *In Progress / In Review* via the **Project's built-in workflows** (enable "PR opened → In review", "reopened → In progress"; "merged/closed → Done" is default) or a manual card move. Don't claim the board moved — it won't from here.
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
