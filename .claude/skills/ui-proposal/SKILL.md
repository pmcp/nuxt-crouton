---
name: ui-proposal
description: Propose a UI change for human sign-off before building it. The default path deploys a rough live staging preview (with NUXT_PUBLIC_CROUTON_REVIEW=true) so the reviewer pins comments on the real running page. Use --static for the offline HTML/CSS mockup fallback (no deploy available, or speed over fidelity). Invoke for any task that adds/changes a .vue component, a layout, a page, or a theme.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# UI Proposal — sign off on a live preview before you build it

The UI sign-off loop (epic #307) requires human approval **before** you build/finalise a
visual surface. The **default path deploys a rough real build** to a staging preview with
the review overlay on, so the reviewer clicks the running page rather than reading a static
PNG. A `--static` fallback (offline HTML/CSS mockup + PNG) is available when a live deploy
isn't practical.

Either way the outcome is identical: a draft PR is posted, the reviewer gives feedback,
you iterate, and an `approve`/`lgtm` comment unblocks the build.

## When to use
- A task's diff adds or changes a **visual surface**: a `.vue` component, a layout, a page,
  a theme (`crouton-themes`, a `ui:` block in `app.config.ts`), or app CSS/theme tokens.
- The user asks to "mock up", "propose", "show what it'd look like", or wants design sign-off.
- **Skip** for pure `<script>`/composables/types, `server/**`, config, tests, and docs — no
  visible result, no gate.

## Which path to choose

| | Default (live preview) | Fallback (`--static`) |
|---|---|---|
| **When** | App can be deployed to staging | Deploy is unavailable, broken, or would take too long |
| **Fidelity** | Real Nuxt UI styling, real data, real responsive behaviour | Offline HTML/CSS approximation |
| **Reviewer UX** | Click the running page, pin a comment | Read a PNG, comment inline on the `.md` diff |
| **Approval signal** | Reply `approve` / `lgtm` — same loop | Reply `approve` / `lgtm` — same loop |

---

## Default path — live preview with review overlay

The loop (capture tooling provided by `@fyit/crouton-devtools`):

1. **Build a rough real version** of the surface. You don't need a polished feature — a
   scaffold that renders the changed component is enough. Commit and push the branch.
2. **Deploy to staging with the review flag** using the **`/poc-deploy`** skill (for POC
   apps) or `pnpm cf:staging` (for `apps/`). The flag must be on:
   ```bash
   NUXT_PUBLIC_CROUTON_REVIEW=true pnpm cf:staging
   ```
   Do **not** set this flag on production deploys (`cf:deploy`) — it is staging-only.
3. **Post the preview URL** on the draft PR. Example comment:
   ```
   🔍 Live preview ready: https://<name>.pmcp.dev
   Reviewer: open the link, click any element, and type your change in the overlay.
   Each pin posts a 🎯 Preview feedback comment here naming the source file.
   Reply `lgtm` or `approve` when satisfied.
   ```
4. **Apply `status:blocked`**, @mention `@pmcp`, and **stop**. Do not build further until
   approved.
5. **On each `🎯 Preview feedback` comment:** read the named source file, make the change,
   commit, redeploy. Reply to the comment when done.
6. **On `approve` / `lgtm` reply:** remove `status:blocked`, drop a short note on the PR,
   and resume building/generating (step 6 of `task-worker`).

### Env contract (already wired by WS2 of epic #590)

The staging deploy script in `pocs/<name>/package.json` carries the flag; the Worker secret
(`NUXT_CROUTON_REVIEW_GITHUB_TOKEN`) + vars (`NUXT_CROUTON_REVIEW_REPOSITORY`,
`NUXT_CROUTON_REVIEW_PR`) are set by `scripts/inject-review-env.mjs` during `cf:staging`.
You don't need to set these by hand — use the `/poc-deploy` skill or the app's `cf:staging`
script and they're handled automatically.

---

## Fallback path — static mockup (`--static`)

Use when a live deploy is not available (e.g. packages-only change with no runnable app, or
the deploy pipeline is broken and speed matters more than fidelity). Pass `--static` when
invoking this skill, or when the `task-worker` agent determines staging isn't reachable.

### What it produces
| Artifact | Path | Committed? |
|----------|------|-----------|
| Mockup source | `writeups/ui-proposals/<slug>.html` | yes (editable source of truth) |
| "What changes" list | `writeups/ui-proposals/<slug>.md` | yes (inline-commentable diff surface) |
| Rendered image | `screenshots/ui-proposal-<slug>.png` | no — gitignored; posted to the PR |

`<slug>` = kebab of the surface, e.g. `mobile-collection-viewer`.

### Step 1 — Understand the surface
Read the component(s) you're about to change. The mockup must reflect the **actual** current
UI for "before" and your **intended** design for "after". Use real labels/data where you
have them.

### Step 2 — Build the mockup from the template
Copy `template.html` (next to this skill) to `writeups/ui-proposals/<slug>.html` and fill
the slots:
- **Frame**: phone frame for mobile surfaces, desktop frame for wide ones (both in the template).
- **Before**: mirror today's UI honestly (including rough edges the change fixes).
- **After**: your proposed design.
- **"What changes"** list: 3–5 plain-language bullets.

Rules (keep it portable):
- **No JavaScript, no external/CDN assets.** Inline SVG icons only (template ships a set).
  Non-negotiable — the artifact must render offline.
- Match the app's look: dark Nuxt-UI palette, emerald primary, template variables.
- One file, self-contained.

`example.html` (next to this skill) is a complete worked reference.

### Step 3 — Render to PNG
```bash
node .claude/skills/ui-proposal/render.mjs writeups/ui-proposals/<slug>.html screenshots/ui-proposal-<slug>.png
# optional: --width 1100   (default 1000)   --selector ".stage"   (crop to element)
```
Uses the repo's Playwright (`@playwright/test`) headless Chromium — no network, 2× for crisp
image.

### Step 4 — Hand off (review happens on the DIFF)
**Commit a text artifact so feedback can be inline.** Alongside the `.html`, write the
`writeups/ui-proposals/<slug>.md` — the "what changes" list, one item per line. Committed,
it lands in "Files changed" so the reviewer can inline-comment a specific change.

- **Commit** the `.html` + `.md` (via `/commit`, scope `docs`).
- **Post the PNG** as a sticky `<!-- ui-proposal:<slug> -->` PR comment (at-a-glance visual).
- **Steer feedback to the `.md`** — inline comments in the diff, not the image.
- Apply `status:blocked`, @mention `@pmcp`, and **stop**.

### Step 5 — Revision loop (both paths share this)
On each change request: revise the proposal (mockup files for `--static`, source file for
live-preview), re-render / redeploy, **edit the sticky comment in place** (never post a new
one), and reply to/resolve each inline thread you addressed. Commit and push.

On `approve` / `lgtm` reply: remove `status:blocked`, note "approved → building" on the
sticky comment, and resume.

---

## Conventions
- Before **and** after side-by-side for a *change*; **after-only** for net-new UI (no "before" exists).
- Keep the proposal focused on the surface under discussion — don't redraw the whole app.
- Re-render / redeploy after every revision so the proposal never drifts.
- **One sticky comment per proposal.** Never post a new comment per revision — edit in place.
