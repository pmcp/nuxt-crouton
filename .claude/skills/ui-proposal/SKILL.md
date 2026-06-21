---
name: ui-proposal
description: Generate a before/after UI mockup (pure HTML/CSS/SVG, offline) for a proposed UI change, render it to a PNG, and commit the source — so a human can sign off on the look-and-feel BEFORE the real component is built. Use when a task adds or changes UI (a .vue component, a layout, a screen), or when asked to "mock this up", "show me a proposal", "what would this look like".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# UI Proposal — mock it before you build it

Turns "I'm about to add/change this screen" into a **visual artifact a human can approve**: a self-contained before/after HTML mockup (pure CSS + inline SVG — **no JS, no CDN**, so it renders anywhere, including a phone file-preview), plus a rendered **PNG** that can be posted in a PR comment.

This is the foundation of the UI sign-off loop (epic #307): produce the mockup → it gets posted on the PR → iterate on feedback → only then build the real thing.

> **Why a PNG?** GitHub comments can't render raw HTML/CSS. The committed `.html` is the editable source; the `.png` is what gets posted.

## When to use
- A task's diff adds or changes a **visual surface**: a `.vue` component, a layout, a page, a theme.
- The user asks to "mock up", "propose", "show what it'd look like", or wants design sign-off.
- **Skip** for pure logic/types/server changes with no visible result.

## What it produces
| Artifact | Path | Committed? |
|----------|------|-----------|
| Mockup source | `writeups/ui-proposals/<slug>.html` | ✅ yes (editable source of truth) |
| Rendered image | `screenshots/ui-proposal-<slug>.png` | ❌ no — `screenshots/` is gitignored; it's posted to the PR, not committed |

`<slug>` = kebab of the surface, e.g. `mobile-collection-viewer`.

## Step 1 — Understand the surface
Read the component(s) you're about to change (and any real data/screenshots the user gave). The mockup must reflect the **actual** current UI for "before" and your **intended** design for "after". Use real labels/data where you have them — it makes the proposal trustworthy.

## Step 2 — Build the mockup from the template
Copy `template.html` (next to this skill) to `writeups/ui-proposals/<slug>.html` and fill the slots:
- **Frame**: use the **phone** frame for mobile surfaces, the **desktop** frame for wide ones (both are in the template).
- **Before**: mirror today's UI honestly (including the rough edges the change fixes).
- **After**: your proposed design.
- **"What changes"** list: 3–5 plain-language bullets.

Rules (keep it portable):
- **No JavaScript, no external/CDN assets.** Inline SVG icons only (the template ships a set). This is non-negotiable — the artifact must render offline.
- Match the app's look: dark Nuxt-UI palette, emerald primary, the variables already in the template.
- One file, self-contained.

`example.html` (next to this skill) is a complete worked reference — the mobile collection viewer before/after.

## Step 3 — Render to PNG
```bash
node .claude/skills/ui-proposal/render.mjs writeups/ui-proposals/<slug>.html screenshots/ui-proposal-<slug>.png
# optional: --width 1100   (default 1000)   --selector ".stage"   (crop to an element)
```
Uses the repo's Playwright (`@playwright/test`) headless Chromium — no network. Renders at 2× for a crisp image.

## Step 4 — Hand off (review happens on the DIFF)
**Commit a text artifact so feedback can be inline.** Alongside the `.html`, write a
`writeups/ui-proposals/<slug>.md` — the **"what changes"** list, one item per line. Committed,
it lands in the PR's "Files changed", so the reviewer can click any line and comment on that
specific change ("make this a switch", "drop this one") with no copying.

- **Commit** the `.html` + `.md` (via `/commit`, scope `docs`).
- The **PNG** is the at-a-glance visual to post as a PR comment (handled by the worker gate /
  revision-loop #309/#310); steer feedback to **inline comments on the committed `.md`**. When
  running this skill by hand, post the PNG and point the reviewer at the `.md` in the diff.

## Higher-fidelity option — sign off on a live preview (epic #488)

The static mockup above is the cheap default. When the design depends on **real rendering** the mockup can't fake — actual Nuxt UI styling, real data, spacing, responsive behaviour — build a rough real version and let the reviewer pin comments **directly on the running staging page**. Each pin becomes a PR comment you act on, and it ends at the **same** approval signal (👍 / `ui-approved`). It's cheap when the builder is an agent (you were going to build a draft anyway), so prefer it for fidelity; keep the static mockup for speed.

The loop (capture half provided by `@fyit/crouton-devtools` — see its CLAUDE.md):
1. Build a rough real version of the surface (into a `sandboxes/` app, or the feature app).
2. Deploy to staging with the review flag on (below); reuse the **`/poc-deploy`** skill for a sandbox. Post the **preview URL** on the draft PR next to the mockup.
3. Reviewer opens the URL → clicks an element → types a change. The in-page overlay POSTs to `/api/_review`, which posts a **`🎯 Preview feedback`** comment naming the **source file** (via the build-time `data-crouton-src` stamp).
4. You (subscribed via `subscribe_pr_activity`) wake on that comment, edit the **named file**, redeploy. Repeat until approved — the **same revision/approval loop** as the static mockup.

Enabling it (the env contract):
- Build with **`NUXT_PUBLIC_CROUTON_REVIEW=true`** so the overlay + `data-crouton-src` stamp + `/api/_review` endpoint are included — **staging only, never `cf:deploy`/production** (the flag is absent there, so zero footprint).
- Runtime GitHub-bridge env (a Worker **secret** + vars; the token never ships in the bundle):
  - `NUXT_CROUTON_REVIEW_GITHUB_TOKEN` — a token that can comment on the repo (secret)
  - `NUXT_CROUTON_REVIEW_REPOSITORY` — `owner/repo`
  - `NUXT_CROUTON_REVIEW_PR` — the PR this preview belongs to (from the deploy's CI context), or per-request `body.prNumber`

```jsonc
// app/sandbox package.json — staging carries the flag; production never does
"cf:staging": "NUXT_PUBLIC_CROUTON_REVIEW=true NITRO_PRESET=cloudflare_module nuxt build && wrangler deploy --env staging && …",
"cf:deploy":  "NITRO_PRESET=cloudflare_module nuxt build && …"
```

## Conventions
- Before **and** after side-by-side for a *change*; **after-only** for net-new UI (no "before" exists).
- Keep the mockup focused on the surface under discussion — don't redraw the whole app.
- Re-render after every edit so the PNG never drifts from the HTML.
