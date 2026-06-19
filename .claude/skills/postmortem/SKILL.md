---
name: postmortem
description: At the close of an epic (or a difficult issue), post a postmortem roundup comment — what went well, what was hard (backed by evidence), and 1–3 concrete proposals to improve the skills/flows — then offer to turn accepted proposals into their own `workflow`-labeled tasks. Use at epic close, after the "verify the whole thing" rollup, or when asked to "do a retro", "postmortem this epic", "what did we learn", "how do we improve the workflow".
allowed-tools: mcp__github__issue_read, mcp__github__add_issue_comment, mcp__github__issue_write, mcp__github__sub_issue_write, mcp__github__list_issues, mcp__github__search_issues, Read, Bash
---

# Postmortem — learn from the epic, tighten the loop

Turns a just-finished epic (or a difficult issue) into a short, honest **retro
comment on the epic**, plus an offer to spin the good ideas into tracked
`workflow` tasks. The point isn't ceremony — it's that **the loop only gets
tighter if we feed each run's friction back into the skills and flows**. See
epic #403.

This runs **after** the `github-tasks` "## 🧪 Verify the whole thing" rollup
(verify = *does it work?*) and **before** the epic is closed (postmortem =
*how did building it go, and how do we improve?*).

## When to use
- **Default:** at epic close, once all sub-issues have merged.
- A single **difficult issue** worth a retro on its own (lots of blocks, re-work).
- On ask: "do a retro / postmortem on #NN", "what did we learn".
- **Skip** for a trivial chore — not every issue needs a retro.

## What it produces
A single **comment on the epic** (`add_issue_comment`) with three sections, and
— on your go-ahead — one or more new issues labelled `workflow`.

## Step 1 — Resolve scope
- Input is an **epic number** (default) or a single issue number.
- Read it + its children: `issue_read` (`get`, `get_sub_issues`). Note which
  children merged cleanly vs. needed re-work.

## Step 2 — Gather the difficulty signals (evidence, not vibes)
Pull what's available so "what was hard" is backed by facts. (Deeper mining is
tracked in #406; until then, best-effort from labels/timeline + the PRs.)
- **Blocked time** — how long any child carried `status:blocked`.
- **Sign-off rounds** — revision iterations on UI/schema gates (sticky-comment
  edits / review threads on the draft PR).
- **Fix-bot attempts** — `claude/issue-*` retries before green (when #336 is live).
- **Reopens** — issues/PRs reopened after close.
- **Time-in-progress** — `status:in-progress` → closed duration per child.
**Be honest:** where a signal isn't available, say so — never imply a measurement
you didn't make.

## Step 3 — Write the roundup comment
Keep it terse and human-first (the `github-tasks` two-audience convention). Three
sections:

- **✅ What went well** — what was smooth / worth keeping. Name it concretely.
- **⚠️ What was hard** — the friction, each line tied to a signal or a specific
  issue (e.g. *"#NN sat blocked 3 days waiting on a sibling; the schema gate took
  2 revision rounds"*).
- **🔧 Proposals (1–3)** — concrete, actionable changes to a **skill / agent /
  flow** that would remove that friction next time. Each proposal = a candidate
  `workflow` task with a one-line "why".

Post it with `add_issue_comment` on the epic.

## Step 4 — Offer to turn proposals into work
Ask the human (plain): *"Open these as `workflow` tasks?"* On a yes, for each
accepted proposal create an issue with `issue_write`:
- Labels: **`workflow`** + **`meta:agents`** + one `type:*` (usually `type:chore`
  or `type:feat`).
- Body: the proposal as a small **bet** (what we change, why, how we'll know it
  helped). Reference the source epic.
- If several relate, group them under a small tracking parent via `sub_issue_write`.

Don't open issues the human didn't accept; don't pad with filler proposals — 1–3
real ones beat ten generic ones.

## Step 5 — Hand off
Report: the epic comment URL, and the list of `workflow` issues opened (with URLs).
This closes the learning loop — the proposals are now on the board, ready to be
picked up like any other work.

## Conventions & gotchas
- **After verify, before close.** Don't close the epic until the postmortem is
  posted (the `github-tasks` epic-close walk-up sequences this).
- **Headless = no dialogs.** If running unattended, post the roundup + proposals
  and @mention the owner rather than blocking on a prompt; the owner converts
  proposals to issues by replying.
- **Bot-comment filter.** The roundup is informational; it should not itself
  trip the agent-resume triggers (`resume-on-comment.yml` ignores bot authors).
- **Signals are best-effort.** Prefer a smaller, true set of evidence over a
  complete-looking but guessed one.
