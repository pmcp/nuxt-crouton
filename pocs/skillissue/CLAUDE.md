# pocs/skillissue

The **marketing site for skill/issue** — the product story (skills + tickets + a reviewed
flow, sold) as a landing page. Epic [#917](https://github.com/FriendlyInternet/nuxt-crouton/issues/917).

Defer to the root `CLAUDE.md` for all workflow/commit/issue conventions — this file only
covers what's specific to this app.

## What's wired

- **Static marketing site** — no DB, no auth, no server routes. The page **prerenders to
  HTML** (`nitro.prerender`), so it deploys to Workers static assets with zero backend.
- **Bespoke design, not a crouton theme.** We extend NO `crouton-themes` layer on purpose
  (their global Nuxt-UI slot replacers fight the custom look). `@nuxt/ui` is kept only for
  Tailwind v4 + `UApp` plumbing; the visual language lives in `app/assets/css/main.css`
  (dark canvas, blueprint grid, violet→cyan→lime gradient, mono display type). Design #920.
- **Copy source of truth:** `writeups/briefings/skillissue-site-brief.md` (#918). Change copy
  there first, then mirror into the page.

## Two surfaces (kept in sync, by design)

| File | Purpose |
|------|---------|
| `preview/index.html` | **Standalone, zero-dependency HTML** of the landing — the fast-iteration surface. Renders anywhere (incl. `htmlpreview.github.io`) so design review needs no deploy. |
| `app/pages/index.vue` | The real Nuxt page for the eventual Workers build. Mirrors the HTML preview. |

When iterating design, edit the HTML for a quick render → screenshot, then port the agreed
changes into `index.vue`. Once design is approved (#920), `index.vue` is the production build.

## Commands

```bash
pnpm --filter pocs-skillissue dev          # local dev (port 3040)
pnpm --filter pocs-skillissue build        # prerender to .output/public
pnpm --filter pocs-skillissue cf:staging   # deploy a staging preview (see /poc-deploy)
```

## Render the standalone preview (no dev server)

```bash
# Opens preview/index.html in the pre-installed chromium and screenshots it.
# (Design review loop — see screenshots/ at the repo root.)
```

## Domains (#133)

- Production → `skillissue.friendlyinter.net` (launch workstream #922, via `/deploy-production`)
- Staging → `skillissue.pmcp.dev` (`/poc-deploy`)
