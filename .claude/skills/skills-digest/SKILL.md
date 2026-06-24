---
name: skills-digest
description: Generate a monthly digest of the skills in this repo's flow system — a render-only HTML + plain-text email listing every skill grouped by job, plus a "what was added / updated / removed since last digest" band computed from git history. Use when asked for a "skills digest", "what skills do we have", "skills report", "what skills changed", or to keep the skill surface from sprawling.
allowed-tools: Read, Write, Bash
---

# Skills Digest — the monthly "what skills do we have, and what changed" email

Turns `.claude/skills/` into a **skimmable monthly digest**: a **📋 What changed since last
digest** band up top (✨ added · ✏️ updated · 🗑️ removed, computed from `git` history), then
every skill **grouped by job** (Build / Plan / Commit gates / Review / Deploy / Verify / Meta)
with a trigger badge (`auto` / `on ask` / `in flow`) and its one-line description. The point is
**awareness**: catch sprawl, spot a skill that quietly rotted, notice overlap — once a month,
without digging.

**Single source of truth — no second list to drift.** The skill set, the grouping, and the
trigger map all come from `scripts/gen-skills-doc.mjs` (the same module that generates
`writeups/architecture/skills-and-triggers.html`). `gather.mjs` imports its `META` / `GROUPS` /
`discover()` exports rather than re-listing skills, so the digest and the doc can never disagree.
A skill missing from `META` lands under "⚠️ Uncategorised" — same contract as the doc.

**Interactively this is render-only.** A by-hand run *makes* the digest (HTML + plain text +
subject under `writeups/reports/`) and shows you where it landed. The **scheduled** job is what
delivers — by **email** via Resend (mirrors `epic-digest`; email-only, no standing-issue rail, to
avoid the duplicate GitHub-notification mail).

## Pipeline (mirrors epic-digest / housekeeping)

```
gather.mjs ──> skills.data.json ──> render.mjs ──> skills-digest-<date>.{html,txt,subject.txt}
   │                                    │
   reuses gen-skills-doc.mjs            email-safe HTML (inline styles, table layout) + text mirror
   (META + discover) + git delta
```

### By hand

```bash
# 1) gather — enumerate skills + compute the since-last-digest delta from git
DIGEST_SINCE=2026-06-01 node .claude/skills/skills-digest/gather.mjs > skills.data.json

# 2) render — email-safe HTML + plain text + subject
node .claude/skills/skills-digest/render.mjs skills.data.json --out-dir writeups/reports
```

`render.mjs` also runs straight off the committed `example.data.json` (offline, no git needed):

```bash
node .claude/skills/skills-digest/render.mjs .claude/skills/skills-digest/example.data.json --out-dir /tmp/sd
```

## The "since" window

`DIGEST_SINCE` (YYYY-MM-DD) is the **previous digest's send date** — the delta window starts
there. Unset → defaults to one month ago. The scheduled workflow passes the exact previous
send date.

The delta is computed by comparing the skill set at the `since`-date commit against HEAD:

| Bucket | Meaning |
|---|---|
| ✨ Added | exists at HEAD, absent at the `since` baseline |
| ✏️ Updated | exists in both, but a file under its skill dir changed in the window |
| 🗑️ Removed | existed at the baseline, gone at HEAD |

> **⚠️ Full history required.** The delta needs the `since`-date commit to be reachable. CI must
> check out with `fetch-depth: 0` — a shallow clone (the default) can't reach a month-ago commit,
> and `gather.mjs` will fall back to `firstRun: true` (no delta) rather than guess.

## Cadence + delivery (config-as-data)

Declared in `.github/digests.yml`, exactly like the other digests:

```yaml
skills-digest:
  schedule: monthly:1        # first of the month, UTC (monthly:<dom> added in #839)
  deliver: [email]           # email-only (Resend); no-op when RESEND_API_KEY unset
  to: [you@example.com]
```

`.claude/skills/housekeeping/schedule.mjs` gates a daily workflow cron — it sends only on the
configured day-of-month (clamped to the month's last day, so `monthly:31` still fires in
February). Delivered by `.github/workflows/skills-digest.yml`.

## When you add / rename / remove a skill

The digest follows automatically (it reads the live tree). Two housekeeping steps keep it tidy:

1. Add the skill to the `META` map in `scripts/gen-skills-doc.mjs` (group + triggers) — otherwise
   it shows under "⚠️ Uncategorised" in both the doc and this digest.
2. Run `node scripts/gen-skills-doc.mjs` so `skills-and-triggers.html` stays current (CI enforces
   this via `skills-doc.yml`; `sync-docs` does it before `/commit`).
