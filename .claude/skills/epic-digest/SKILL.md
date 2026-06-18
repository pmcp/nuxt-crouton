---
name: epic-digest
description: Generate a daily "where are we?" digest from this repo's GitHub epics — a render-only HTML + plain-text email summarising the last 24h of activity plus a progress snapshot of every open epic. Use when asked for a "daily digest", "epic report", "status rapport", "what moved this week", or "where are we on the epics".
allowed-tools: mcp__github__search_issues, mcp__github__list_issues, mcp__github__issue_read, Read, Write, Bash
---

# Epic Digest — the daily "where are we?" email

Turns the GitHub issue tree (`pmcp/nuxt-crouton`) into a **skimmable digest**: a short
"since yesterday" activity band, then one card per open **epic** with a progress
bar and a one-line status — the sub-issue breakdown tucked into a collapsible
section so the overview stays clean. Built to be **read at a glance, drilled into
if needed**.

**This is render-only.** It *makes* the digest (HTML + plain text under
`writeups/reports/`) and shows you where it landed — it does **not** send email
yet. Forwarding/sending and scheduling are follow-up sub-issues of epic #357.

## When to use
- A daily/weekly "where are we?" check, a status rapport, or "what moved".
- Before a planning session, to see which epics are close to done or blocked.
- **Skip** if you just need one issue's detail — open the issue directly.

## What it produces
| Artifact | Path |
|----------|------|
| HTML digest (forward / view in browser) | `writeups/reports/epic-digest-<YYYYMMDD>.html` |
| Plain-text digest (terminal / paste into email) | `writeups/reports/epic-digest-<YYYYMMDD>.txt` |

These are **generated artifacts** — render them on demand; don't commit them.

## Step 1 — Pick the window
Default is the **last 24h**. For a Monday digest covering the weekend, or a weekly,
widen it: compute the cutoff date (e.g. `2026-06-17`) and use it in the searches
below. Set `windowHours` in the data accordingly (24 / 72 / 168).

## Step 2 — Gather the data (GitHub MCP, read-only)
Build the JSON object described in **Step 3** using these calls (all `owner: pmcp`,
`repo: nuxt-crouton`):

1. **Open epics** — `search_issues`, query `repo:pmcp/nuxt-crouton is:issue is:open label:epic`.
2. **Each epic's children** — `issue_read` with `method: get_sub_issues`. Count
   `done` = children with `state: "closed"`, `total` = all children. Read each
   child's labels (or the `get_sub_issues` state) to set its `status`
   (`in-progress` / `blocked` from the `status:*` label) and `state`.
   Mark the epic `blocked` if it carries `status:blocked` or any child is blocked.
3. **Activity in the window** (the "since yesterday" band) — use date-filtered search,
   substituting `<cutoff>` (YYYY-MM-DD):
   - Closed: `search_issues` → `repo:pmcp/nuxt-crouton is:issue is:closed closed:>=<cutoff>`
   - Opened: `search_issues` → `repo:pmcp/nuxt-crouton is:issue created:>=<cutoff>`
   - Merged PRs: `search_issues` → `repo:pmcp/nuxt-crouton is:pr is:merged merged:>=<cutoff>`
     (note: `search_issues` is scoped to issues; for PRs use `mcp__github__search_pull_requests`
     if available, else `list_pull_requests` filtered client-side.)
4. Set `recentActivity` per epic to a **one-line, human** summary of what moved in
   the window (a closed child, a merged PR, "no movement", "blocked on X"). This is
   the line a busy person reads — keep it plain, no file paths.

Keep it lean: titles, numbers, URLs, states. Don't fetch comment bodies.

## Step 3 — Write the data file
Write the gathered object to a temp path (e.g. `writeups/reports/.epic-digest.data.json`).
Shape (`example.data.json` next to this skill is a complete, renderable sample):

```jsonc
{
  "generatedAt": "<ISO now>",
  "windowHours": 24,
  "repo": "pmcp/nuxt-crouton",
  "activity": {
    "opened":    [{ "number": 358, "title": "...", "url": "https://github.com/...", "kind": "issue" }],
    "closed":    [{ "number": 351, "title": "...", "url": "...", "kind": "issue" }],
    "mergedPRs": [{ "number": 352, "title": "...", "url": "...", "kind": "pr" }]
  },
  "epics": [
    {
      "number": 249, "title": "...", "url": "https://github.com/...",
      "status": "in-progress",          // in-progress | blocked | open | done
      "blocked": false,
      "total": 5, "done": 4,            // sub-issue counts → drives the progress bar
      "recentActivity": "One plain line about what moved.",
      "children": [
        { "number": 254, "title": "...", "url": "...", "state": "open", "status": "in-progress" },
        { "number": 253, "title": "...", "url": "...", "state": "closed" }
      ]
    }
  ]
}
```

## Step 4 — Render
```bash
node .claude/skills/epic-digest/render.mjs writeups/reports/.epic-digest.data.json
# options: --out-dir writeups/reports   --date 20260618   (default: out-dir=writeups/reports, date=today)
```
Dependency-free (no npm deps, no network). Writes the `.html` + `.txt` and prints
their paths.

## Step 5 — Hand off
- Show the user where the files landed and a short text summary of the headline
  numbers (epics, closed, PRs merged).
- HTML is for forwarding / browser viewing; text is for pasting into an email or
  reading in a terminal. (Optional: render the HTML to a PNG with
  `.claude/skills/ui-proposal/render.mjs <html> screenshots/epic-digest.png` to
  preview it inline.)

## Conventions & gotchas
- **Epics are the unit.** Lead with epics + progress, not a flat issue list — that's
  the whole point ("focus on epics").
- **Render-only.** Don't try to send mail; that's a separate follow-up (#357).
- **`<details>` in email:** the collapsible sub-issue section renders expanded in
  mail clients that strip `<details>` — that's fine, it degrades gracefully.
- The renderer sorts **blocked epics first**, then by % complete, so attention
  lands where it's needed.
