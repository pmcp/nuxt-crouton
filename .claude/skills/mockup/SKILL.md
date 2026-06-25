---
name: mockup
description: Explore an interaction or screen idea as throwaway, CLICKABLE no-build mockups before there's a working prototype — the lighter, earlier-stage sibling of /ui-proposal. Scaffolds a mockups/<slug>/ folder of standalone HTML screens + a clickable index gallery, screenshots them with the pre-installed chromium, and iterates on feedback. Two tiers: fast hand-rolled HTML (default, for motion/interaction/layout), or --ui = real Nuxt UI v4 in Vue+Vite (for product-looking screens). Use for "mock up X", "prototype Y as clickable pages", "let's explore Z", or /mockup.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# /mockup — clickable mockups before a prototype

The **explore** step that comes *before* you build anything real. Throwaway, no-build,
**clickable** HTML you can play with and react to; the winners graduate into a real running
**prototype** (a `pocs/` app — being renamed to `prototypes/`, #866). Lighter and earlier than
`/ui-proposal` (which proposes *one specific change* for sign-off, often a live deploy).

```
/mockup           explore, throwaway, many fake screens   ← you are here
  → prototype     real build, real components, staging URL   (pocs/ → prototypes/, #866)
  → /ui-proposal  sign-off on a specific change
  → apps/         launch
```

Taxonomy: a **mockup** *looks* like it but is fake; a **prototype** actually *works*.

## When to use
- "mock up X", "prototype Y as clickable pages", "let's explore Z", "show me what it could look like".
- Before scaffolding a real app, when the interaction/screen is still fuzzy and you want to *feel* it.
- NOT for: a specific change to an existing surface that needs sign-off (→ `/ui-proposal`); real data/auth (→ a prototype app).

## Two fidelity tiers — pick by what you're exploring

| Tier | Use for | How |
|------|---------|-----|
| **default — hand-rolled HTML** | motion, novel interactions, layout/canvas, "what if it behaved like…" | standalone HTML + inline CSS/JS, no build, no deps |
| **`--ui` — real Nuxt UI v4** | a screen that should look like the actual product; ports to a prototype nearly verbatim | Vue 3 + Vite + real `@nuxt/ui@4.9`, `vite build` → static clickable `dist/` |

When unsure, start hand-rolled (faster); switch to `--ui` once the *structure* matters more than the *motion*.

## File layout (one folder per exploration)

```
mockups/<slug>/
  index.html        ← clickable gallery: live <iframe> tiles → open each screen
  01-<name>.html    ← one screen / interaction per file
  02-<name>.html
  README.md         ← what each screen explores + your top picks to graduate
```

`mockups/` is **outside the pnpm workspace** on purpose (throwaway, never deployed).

## The shared scaffold contract (keep every screen capturable)

Every screen MUST be screenshot-able as a **static frame** via a URL param, so the headless
chromium can capture it. Use the convention that fits the screen:
- `?t=0..1` — a `render(t)` timeline (`t=0` start … `t=1` end). Drive ALL motion from `render(t)` so any frame freezes. Add `?auto[=ms]` to loop it for gallery thumbnails.
- `?state=<name>` — discrete states (e.g. `composed`, `collapsed`).
- `?device=…` / `?w=…` / `?level=…` — sizes / zoom levels for responsive or multi-level screens.

Also: dark app tokens (`--bg --panel --panel2 --edge --ink --dim --accent --accent2 --gold --violet --blue --glow`), a top-left title chip, a bottom hint line, a faint scanline overlay. Reference the existing gallery for the exact scaffold: `writeups/ui-proposals/mocks/` (e.g. `01-hud-dock.html` for the `render(t)` pattern, `index.html` for the gallery), and `mockups/semantic-zoom/` for a multi-level example.

## The loop

1. **Scaffold** `mockups/<slug>/` + the first screen(s). Fake content only (colored boxes, glyphs, placeholder cards) — motion & structure, not data.
2. **Build** one screen per file. Keep each ~150–300 lines. Parallelise with the `Agent` tool when building several independent screens (give each the scaffold contract + a reference file).
3. **Gallery + screenshots**: write `index.html` (live `<iframe>` tiles, each linking to the full screen); capture frozen frames:
   ```bash
   cd mockups/<slug> && python3 -m http.server 8099 &
   node ../../scripts/app-shots.mjs http://localhost:8099 "/01-foo.html?t=1:01-foo" …
   ```
   (screenshots land in repo-root `screenshots/` — the HARD GATE; gitignored.)
4. **Show & iterate**: send the contact sheet / key frames, take feedback, revise. Don't ask permission between screens — build the set, then show it.
5. **Graduate**: pick winners → the `README.md` becomes the brief → scaffold a real **prototype** app (or run `/task-decompose`). For `--ui` screens the port is near-mechanical (same components).

## `--ui` tier — real Nuxt UI in Vue + Vite

Proven in-sandbox; **copy `mockups/ui-proof/` as the starter** and read its `README.md`. The
non-obvious bits the scaffold MUST get right:

- `vite.config.ts`: `import ui from '@nuxt/ui/vite'` → `plugins:[vue(), ui()]`, `base:'./'`.
- `src/main.ts`: `import ui from '@nuxt/ui/vue-plugin'` → `app.use(ui)` (runtime is resolved *virtually by the vite plugin* — only works with `ui()` active).
- `src/main.css`: `@import "tailwindcss";` **then** `@import "@nuxt/ui";` (Tailwind v4 — no config file).
- Wrap the app in `<UApp>` (provides overlay/toast/tooltip portals; modals need it).
- `<html class="dark">` for dark mode.
- Install isolated: `pnpm install --ignore-workspace` ; build: `pnpm build` → serve `dist/`.
- Use Nuxt UI **4** names + patterns (the v4 `UModal` `#content` slot, `UDropdownMenu`, etc. — see root CLAUDE.md).
- **Icon safelist (do this):** dynamically-bound `:name` icons don't paint under Tailwind v4's static scan. Safelist the icon set (or configure the iconify Tailwind v4 plugin) so `UIcon` renders.

## Conventions

Defers to the root `CLAUDE.md` for workflow/commit/issue conventions. Mockups are throwaway
artifacts, not products — but they're committed (small, valuable to click through). Track a
non-trivial exploration with a GitHub issue like anything else; trivial one-off sketches can skip
it. Never put live agent instructions in a mockup (it's not a brief — see #504/#506); a screen
that doubles as a spec must read unambiguously (e.g. a click shouldn't destroy state — see the
grip-threshold fix in the layout mocks).
