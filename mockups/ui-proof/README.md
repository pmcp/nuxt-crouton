# ui-proof — real Nuxt UI v4 in plain Vue + Vite (no Nuxt)

Proof that a **high-fidelity mockup** can use the *real* `@nuxt/ui@4.9` components
(not an approximation) in a standalone Vue 3 + Vite app, then `vite build` to a
static, clickable `dist/` you can serve & screenshot like any other prototype.

This is the reference scaffold for the `--ui` tier of the (proposed) `/mockup` skill.

## Run

```bash
cd mockups/ui-proof
pnpm install --ignore-workspace   # mockups/ is NOT a workspace member — isolate it
pnpm build                        # → dist/  (static, base:'./' so it serves from file:// or a subpath)
python3 -m http.server 8190 --directory dist
# screenshot: node ../../scripts/app-shots.mjs http://localhost:8190 "/index.html:ui-proof"
```

## The gotchas a `--ui` scaffold must encode

1. **Vite plugin:** `import ui from '@nuxt/ui/vite'` → `plugins: [vue(), ui()]`.
2. **Vue plugin:** `import ui from '@nuxt/ui/vue-plugin'` → `app.use(ui)`.
   `./vue-plugin` ships **types only**; the runtime is resolved *virtually by the vite
   plugin*, so it only works with `ui()` active — don't point it at a dist file.
3. **CSS order matters:** in `src/main.css`, `@import "tailwindcss";` **then**
   `@import "@nuxt/ui";`. Tailwind v4 — no `tailwind.config.js`/PostCSS needed.
4. **`<UApp>` wrapper is required** — provides the overlay/toast/tooltip portals
   (modals won't mount correctly without it).
5. **`base: './'`** in `vite.config.ts` so `dist/` works from `file://` / a subpath.
6. **Dark mode:** `<html class="dark">` (or toggle on mount).
7. **Install isolation:** `pnpm install --ignore-workspace` (mockups/ isn't a
   workspace member; without it pnpm tries to hoist into the monorepo).
8. The `ui()` plugin auto-generates `components.d.ts` + `auto-imports.d.ts`, so
   `UCard`/`UButton`/etc. resolve with **zero manual imports**.

## Known follow-up (not a blocker)

`UIcon` glyphs render as empty squares: Nuxt UI v4 paints icons via Tailwind v4
CSS-mask utilities that the static scanner must emit, but dynamically-bound `:name`
icons aren't in the scan set. Fix = safelist the icon set / configure the iconify
Tailwind v4 plugin. Components themselves are pixel-real.

## Build facts (this sandbox)

`pnpm install --ignore-workspace` → 268 pkgs ~6s · `vite build` → 701 modules ~4.6s ·
CSS 182kB (24kB gz, full Tailwind v4 + Nuxt UI theme), JS 476kB (140kB gz).
