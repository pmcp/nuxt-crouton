# WS1 — Semantic-zoom shell (UI sign-off)

> **Interaction-design sign-off** for [#870](https://github.com/FriendlyInternet/nuxt-crouton/issues/870) (WS1 of epic [#868](https://github.com/FriendlyInternet/nuxt-crouton/issues/868)). Per the UI sign-off gate (#307): agree on **how the zoom shell behaves** before building it on the real renderers. Clickable mock: `mockups/semantic-zoom/index.html` (PNGs of each level posted on the issue). Leave inline comments on the decisions below; build starts on `lgtm`/`approve`.

## What this is

A single **Zoomable UI (ZUI)** where the one gesture *zoom in / zoom out* walks the abstraction ladder, and content changes **meaning** at each depth (Figma/Miro semantic zoom):

| Level | What you see | What you do | Real surface |
|---|---|---|---|
| **L0 · Site** | pages wired into a sitemap — **a flow** (the *only* floating level) | wire pages | `crouton-flow` (Vue Flow) — **WS3 #872** |
| **L1 · Page** | a **layout** of the page's apps (panes) | arrange apps | `crouton-layout` `CroutonLayoutRenderer` |
| **L2 · App** | each app is **itself a layout** (sub-panes) | arrange the app | `crouton-layout` recursing into a **`nested` node** — **WS2 #871 ✅ shipped** |
| **L3 · Breakpoints** | responsiveness: ruler · collapse · variants | author per size | the two-layer model — **WS5 #874** |

The refined model: *floating* is only for **wiring the top**. The moment you zoom into a page it's **layouts in layouts** all the way down (no more floating). The shell is the **navigation layer** that makes the flow canvas, the layout editor, and the breakpoint authoring feel like *one product* instead of separate screens.

## The interaction contract (what you're signing off)

- **Zoom in** — click a node (a page at L0, a pane/app at L1, an app's sub-pane at L2) → fly *into* it: the clicked node scales up + fades while the next level emerges from the node's rect. The reverse on the way out.
- **Zoom out** — **Esc**, scroll-up, or click a **breadcrumb** crumb (the bar shows `Site › Bookings › Calendar › …`). Each zooms out one level (a crumb jumps straight to that level).
- **Stepped, not continuous** — zoom snaps level-to-level (one fly per gesture), not a free pinch-zoom. (Open question #1 below.)
- **Depth** — the ladder is exactly the four levels above; L1↔L2 is *recursive* (an app can contain an app), so "App" can repeat as you go deeper before you hit L3.
- **Each level is the real surface**, not a fake — the ZUI only owns navigation + the fly transition; the panes/flow/breakpoint authoring are the existing engines.

## Build plan (once approved)

1. **`useSemanticZoom` composable** (`crouton-layout`) — the navigation state machine: a `level` + a `path` stack (which page → which nested node → …), `zoomInto(target)` / `zoomOut()` / `jumpTo(crumb)`, and the focused `LayoutTree` at the current level. Pure-ish, unit-testable (Test gate #774). This is the **logic core** and can land first.
2. **`CroutonZoomShell` component** (`crouton-layout`) — the fly-in/out transition + breadcrumb + Esc/scroll-out, wrapping whichever level surface is active. Renders L1/L2 by pointing `CroutonLayoutRenderer` at the focused (sub-)layout — and zooming into a pane that is a **`nested` node** descends into its `layout` (the WS2 recursion, already shipped).
3. **L0 hook** — render the site level via `crouton-flow` when present (full wiring is **WS3 #872**); until then L0 can be a static page picker so the shell is usable.
4. **L3 hook** — open the breakpoint authoring surface (**WS5 #874**) as the deepest level.
5. **Booted-fixture proof** — a fixture page with a `nested` app, navigated Site→Page→App by zoom alone (this also closes WS2's "render an N-level page" acceptance).

## Decisions needing a steer

1. **Stepped vs continuous zoom.** Recommend **stepped** (snap level-to-level) — it's legible, keeps each level a clean target, and matches the mock. Continuous pinch-zoom is flashier but muddies "which level am I editing?". *(Mobile/touch uses the same stepped taps + a back affordance.)*
2. **How deep does L1↔L2 recursion go in the UI?** The data allows arbitrary nesting (capped at `MAX_DEPTH`). Recommend the **breadcrumb is the depth guard** — you can keep diving, the crumb trail keeps you oriented — rather than a hard UI cap. Agree, or cap the *navigable* depth (e.g. 3, Site→Page→App)?
3. **Where the shell lives.** Recommend **`crouton-layout`** (it owns L1/L2 and the nested recursion); L0 calls into `crouton-flow` via the existing one-way contract, not a new dep. OK?
4. **L0 before WS3.** Recommend shipping the shell with a **static page-list L0** first so zoom navigation is real end-to-end, and swapping in the live Vue Flow canvas when WS3 lands. OK, or hold WS1 until WS3?

## Considered & rejected

- **Tabs / a level switcher instead of zoom** → ❌ kills the spatial "move through your product" feel that is the whole point of the builder; it's just the separate-screens status quo with nicer chrome.
- **One free-pan/zoom infinite canvas for *all* levels** (everything floats) → ❌ the refined model is explicit: floating is for *wiring pages only*; inside a page it's bounded layouts. A single floating canvas loses the layout structure (and the viability/responsive guarantees) the moment you zoom in.
- **Continuous pinch-zoom across levels** → ❌ see decision #1 — ambiguous "current level", harder to make each surface a crisp edit target.

## 🧪 We'll be right if

With zoom alone you move Site → Page → App → Breakpoints and back; content changes *meaning* (not just scale) at each depth; zooming into a pane that is a `nested` app descends into that app's own layout (the WS2 recursion); and the breadcrumb + Esc + scroll-up always get you back out.

---
*WS1 sign-off artifact for #870. Mock: `mockups/semantic-zoom/` (`?level=0..3`). Rests on WS2 (#871 / PR #877). L0 → WS3 (#872); L3 → WS5 (#874).*
