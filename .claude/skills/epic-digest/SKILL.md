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
4. Write the **human lines** per epic — these are the heart of the digest, the part a
   busy person actually reads. We write issues as **bets** (see the `github-tasks` skill),
   so the digest surfaces the bet and its signal. Keep them plain English, no file paths,
   no jargon:
   - `theBet` — the epic's bet, pulled from its "## 🎯 The bet" / "We think that…" line:
     *if we do X, then Y will happen — and Y is what we want*. This is the lead line.
   - `weWillKnowBy` — the bet's signal, from the epic's "We'll know by…": how we'll know
     the assumption paid off (a measurable/checkable outcome).
   - `whereWeAre` — the **current status in plain words**: what's done, what's next, any
     blocker. This is where the last-24h movement gets folded in.
   - `whatItIs` (optional) / `recentActivity` (optional) — back-compat fallbacks: `theBet`
     falls back to `whatItIs`, `whereWeAre` falls back to `recentActivity`. Prefer the
     bet-framed fields.

5. **Loose tickets** (the "no epic" band) — open issues tracked under *no* epic, so
   they don't vanish from the roundup. `search_issues` →
   `repo:pmcp/nuxt-crouton is:issue is:open -label:epic`, then **drop anything with a
   `parent_issue_url`** (those already roll up under an epic). For each survivor keep
   `number`, `title`, `url`, and its `type:*` label (as `type`). The renderer groups
   them by type so a pile of chores reads as one block. Omit the section entirely when
   there are none — re-parent strays into epics first; this only catches the genuinely
   standalone.

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
      "theBet": "We think that if we do X, then Y will happen — and Y is what we want.",
      "weWillKnowBy": "The signal that tells us the bet paid off.",
      "whereWeAre": "Plain status: what's done, what's next, any blocker.",
      "whatItIs": "(optional, back-compat) → theBet falls back to this.",
      "recentActivity": "(optional, back-compat) → whereWeAre falls back to this.",
      "children": [
        { "number": 254, "title": "...", "url": "...", "state": "open", "status": "in-progress" },
        { "number": 253, "title": "...", "url": "...", "state": "closed" }
      ]
    }
  ],
  "loose": [                            // optional — open issues under no epic, grouped by type
    { "number": 322, "title": "...", "url": "https://github.com/...", "type": "chore" }
  ]
}
```

## Step 4 — Render
```bash
node .claude/skills/epic-digest/render.mjs writeups/reports/.epic-digest.data.json
# options: --out-dir DIR   --date 20260618   --format md   (default: out-dir=writeups/reports, date=today, format=all)
```
Dependency-free (no npm deps, no network). Default writes the `.html` + `.txt`;
`--format md` writes a GitHub-flavoured `.md` instead (used by the daily job).

## Automated daily run (no LLM, no secrets)
The interactive flow above gathers via GitHub MCP. The **scheduled** daily digest
runs entirely deterministically — `.github/workflows/epic-digest.yml` (cron
`0 5 * * *`, ~06:00 Europe/Brussels) does:
```bash
GITHUB_TOKEN=… node .claude/skills/epic-digest/gather.mjs > digest.data.json   # API → same JSON shape
node .claude/skills/epic-digest/render.mjs digest.data.json --format md --out-dir .
GH_TOKEN=… DIGEST_BODY_FILE=epic-digest-<date>.md bash .claude/skills/epic-digest/post-comment.sh
```
- **`gather.mjs`** parses `The bet` / `We'll know by` from each epic body and
  **computes** `whereWeAre` from child counts — no model in the loop.
- **`post-comment.sh`** posts the Markdown as a comment on the single standing
  **"📊 Daily epic digest"** issue (creating it if missing) via `gh` + the built-in
  `GITHUB_TOKEN`. No email provider, no secret to provision (#408).
- The render is the same `render.mjs`, so the hand-run and the cron stay in lockstep.

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
- **Interactive = render-only.** A by-hand run just writes files and shows them; the
  *scheduled* job is what delivers (posts to the standing issue, see above).
- **`<details>` in email:** the collapsible sub-issue section renders expanded in
  mail clients that strip `<details>` — that's fine, it degrades gracefully.
- The renderer sorts **blocked epics first**, then by % complete, so attention
  lands where it's needed.
