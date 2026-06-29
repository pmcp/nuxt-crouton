---
name: a11y
layer: method
description: Accessibility review for Vue surfaces — the code-cleaning analog of /code-review and /simplify, pointed at WCAG/ARIA. Reviews just your diff (or a package/file), rates findings by severity, and either comments inline on the PR (--comment) or applies the safe fixes for you (--fix). Steers the depth-aware `a11y` subagent. Use when asked to "check accessibility", "a11y this", "audit ARIA/keyboard", or run /a11y.
argument-hint: "[quick|standard|deep] [last N | --scope <pkg> | --file <path>] [--comment] [--fix]"
allowed-tools: Bash, Read, Grep, Glob, Edit, Agent, mcp__github__add_comment_to_pending_review, mcp__github__pull_request_review_write, mcp__github__pull_request_read, mcp__github__add_issue_comment
---

# A11y Skill — the steering brain

You drive an accessibility review. The actual analysis lives in the **`a11y`
subagent** (`.claude/agents/a11y.md`) — this skill decides *what scope* and *how
deep*, *spawns* the agent (fanning out for 5+ files), *collates* findings into one
severity-rated report, and then offers to **comment** them on the PR or **fix** the
safe ones. Keep the analysis logic in the agent; keep orchestration here.

This is the accessibility member of the code-cleaning family. It deliberately
**mirrors `.claude/skills/review/SKILL.md`** (diff-scoped, 3-level severity, the same
report format, an offer-to-fix step) and the **`red-team` skill/agent split**
(depth ladder, spawn-and-collate) — just for a11y instead of bugs or exploits.

## Why a separate skill (not folded into /review)

a11y has its own **engines** (`eslint-plugin-vuejs-accessibility`, `@axe-core/playwright`),
its own **severity source** (axe `critical/serious/moderate/minor`), and its own
**`--fix` shape** (add `alt`/`aria-label`/label-for/`role`+`tabindex`). A dedicated,
composable skill keeps it clean — exactly like `red-team` sitting beside `/review`.

## 1. Resolve `{ depth, scope, comment, fix }` from the request

**Scope** (mirrors the review skill's modes):

| Invocation | What it reviews | scope passed to agent |
|------------|-----------------|-----------------------|
| `/a11y` | All uncommitted `.vue` changes (staged + unstaged) | `"diff"` |
| `/a11y last N` | `.vue` files in the last N commits | `"diff"` (vs `HEAD~N`) |
| `/a11y --scope <pkg>` | A whole package's `.vue` | `packages/<pkg>` (or `apps/<pkg>`) |
| `/a11y --file <path>` | A single `.vue` file | that path |

**Depth** (mirrors red-team's ladder):

| The user said… | depth |
|----------------|-------|
| `/a11y` (bare), a PR/diff context, `quick` | `quick` (static, diff-scoped) |
| `/a11y --scope <pkg>` / `standard` | `standard` (full static sweep of the scope) |
| `/a11y deep` / "boot it" / "run axe" | `deep` (static + `@axe-core/playwright` on a fixture) |

Defaults: a bare `/a11y` on a working tree → `quick` + `"diff"`. A `--scope`/`--file`
with no depth → `standard`. Only go `deep` when explicitly asked (it boots a fixture).

**Flags:** `--comment` → post findings as inline PR comments. `--fix` → apply safe
remediations to the working tree. Both can combine with any scope/depth.

## 2. Severity map (axe-aligned — reuse the review skill's 3 levels + format)

| Level | a11y meaning | Sources |
|-------|--------------|---------|
| 🔴 **Critical** | An AT user is **blocked** — can't perceive or operate it | axe `critical`/`serious`; missing `alt` on a meaningful image; an unlabeled control; a keyboard-unreachable interactive element; an input with no label |
| 🟡 **Warning** | Degrades the experience; a workaround exists | axe `moderate`; redundant/misapplied role; positive `tabindex`; heading-order break; missing media caption; `autofocus` |
| 🔵 **Note** | Polish | axe `minor`; decorative-image `alt` nit; `accesskey`; cosmetic ARIA redundancy |

Same emoji + report format as `/review`, so a mixed code-cleaning pass reads consistently.

## 3. Gather the scope

**Uncommitted** (`/a11y`, `--scope`, `--file`):
```bash
git diff --name-only --diff-filter=d | grep -E '\.vue$'          # unstaged
git diff --cached --name-only --diff-filter=d | grep -E '\.vue$' # staged
```
**Recent commits** (`/a11y last N`):
```bash
git diff --name-only HEAD~N..HEAD | grep -E '\.vue$'
```
If `--scope` is set, `Glob` `packages/<pkg>/**/*.vue` (or `apps/<pkg>/**/*.vue`).
If the diff has **no** `.vue` files, say so and stop — a11y only reviews templates.

> Note: `apps/`, `docs/`, `pocs/` are excluded from the **root** eslint config, so
> for an app scope the agent lints from inside the app / by file. It handles this;
> just pass the path.

## 4. Spawn the subagent

Spawn `a11y` via the `Agent` tool with `{ scope, depth, fix }` in the prompt.

- **< 5 files** → **one** subagent (or just do the static pass inline if it's a
  single small file — agent overhead isn't worth it for one `--file`).
- **5+ files** → **fan out**: split the files into groups (by directory —
  `components/`, `pages/`, `layouts/`), spawn one `a11y` subagent per group with its
  file subset as `scope`, and launch them **in parallel** (multiple `Agent` calls in
  one message). Same parallelization rule as `/review`. The agents are
  **synchronous** — you hold their results when they return; never report "running in
  the background".

Pass `fix` through only when the user asked for `--fix` (so a plain review run never
touches files).

## 5. Collate & report

Merge the agents' findings, de-dupe anything the same rule flagged twice, and print
the **review skill's report format**:

```
## A11y Review Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | X |
| 🟡 Warning | Y |
| 🔵 Note | Z |

### 🔴 Critical

#### [Short title]
**File:** `path/to/file.vue:42`
**Rule:** `vuejs-accessibility/alt-text` (or axe rule id)
**Issue:** [Who it hurts and how — "screen-reader users get no description of this image"]
**Fix:** [The exact attribute/element to add]

--- (repeat for 🟡 / 🔵)
```

If nothing found:
```
## A11y Review: clean ✅
Reviewed N templates, no accessibility issues found.
```

Mark each finding `confirmed` (an engine flagged it) vs `suspected` (smell only),
mirroring red-team — don't present a reasoned smell as a confirmed violation.

## 6. `--comment` — inline PR comments

When `--comment` is set and the work is on a PR, post each finding as an **inline
review comment** on the offending `file:line`, dovetailing with the existing
`🎯 Preview feedback` machinery (the reviewer sees a11y notes pinned to the exact
markup, same as design feedback):

1. `mcp__github__pull_request_read` to resolve the PR for the current branch and its
   head SHA.
2. For each finding, `mcp__github__add_comment_to_pending_review` with the file
   `path` and `line`, body = the finding (lead with the 🔴/🟡/🔵 + rule, then
   Issue/Fix). Prefix the body with a `♿ A11y` tag so it's distinguishable from
   `🎯 Preview feedback` and code-review comments.
3. `mcp__github__pull_request_review_write` to submit the pending review as
   `COMMENT` (never auto-`REQUEST_CHANGES` / `APPROVE`).

If there's no PR (local-only), skip inline comments and just print the report —
say so rather than erroring.

## 7. `--fix` — apply safe remediations

When `--fix` is set, the agent applies (or you apply, for a small inline run) **only**
the safe, mechanical fixes — the same set the agent doc lists:

- Missing `alt` → `alt=""` for decorative, a derived short `alt` for meaningful
  (leave genuinely ambiguous ones for the human).
- Icon-only control → `aria-label` describing the action.
- Input without a label → wrap in `UFormField label` / add `<label for>` / `aria-label`.
- Mouse-only interactive element → add `role` + `tabindex="0"` + a keyboard handler
  mirroring `@click` (preferred: convert `<div @click>` → `<button>` when drop-in).
- Positive `tabindex` → `tabindex="0"`.
- Redundant role → remove it.

Then **`pnpm typecheck`** the affected app(s)/package — never leave the tree red:
```bash
pnpm -r --filter './apps/*' typecheck   # or the specific package's typecheck
```
Anything needing real judgment (image *meaning*, heading restructure, colour
contrast, reworking an interaction) is **reported, not auto-fixed**.

## 8. Offer to fix (when not already `--fix`)

After printing the report (and any `--comment`s), close with the review skill's offer:

> Want me to fix any of these? (all / critical only / pick by number)

If the user says "all" or "critical only", apply the safe remediations directly — no
per-fix confirmation — then `pnpm typecheck`. Findings that aren't in the safe set get
called out as "needs a human decision" with the reason.

## Relationship to the other entry points

- **eslint-a11y** (`eslint.config.mjs`, #726/#727) runs the rules **warn-first** in
  `pnpm lint` — it's the always-on baseline. `/a11y` is the **on-demand, diff-scoped,
  severity-rated, fixable** layer on top (the rules are one of its engines).
- It sits beside **`/review`** (general code review), **`/code-review`** /
  **`/simplify`** (the code-cleaning family), and **`/red-team`** (security) — same
  spawn-and-collate shape, different lens. Reach for `/a11y` when you specifically want
  accessibility, with the option to comment or fix.
- **CI runs the same engines automatically** (#730, mirroring the red-team workflows):
  `.github/workflows/a11y.yml` runs the subagent at `depth=quick` on a PR diff — posts a
  sticky `<!-- a11y -->` comment and **fails the check on a 🔴 critical/serious finding**
  (diff-scoped, so never on the pre-existing backlog). `.github/workflows/a11y-daily.yml`
  runs `/a11y` at `depth=deep` daily — writes a report (`writeups/reports/a11y-repo-*.md`),
  updates a public standing issue, and files `a11y` issues for new confirmed criticals.
  `/a11y` is the **on-demand** brain and human entry point for the same machinery.
