# Briefing — The Crouton Builder (semantic-zoom · layouts-in-layouts)

> Internal design brief (descriptive, not agent instructions — per #504/#506). Captures the
> vision crystallized through the layout/collapse exploration on branch
> `claude/crouton-collapse-concepts-wmbapy` (19 collapse mocks + the canvas/responsive/zoom
> mockups + the real-Nuxt-UI proof). Tracking epic: #868; mechanics in #855.

## One line

A single **zoomable canvas** where you build a whole product by *zooming through* it — wire
**pages** into a site at the top, then zoom **into** a page and it's **layouts inside layouts**
all the way down (a page is a layout of apps; each app is itself a layout), composed by
**magnetic snap**, made responsive by **container queries + authored breakpoints**, and
collapsed with **game-feel motion**.

## Why

Today a crouton admin surface is one fixed, generated dashboard. The builder turns it into a
*spatial* workspace of composable **mini-apps** (the existing `croutonLayoutBlocks`): you don't
"configure a layout", you *play with your apps in space* — drag them together, zoom in to refine,
zoom out to see the whole site. The goal is that building a responsive multi-page product *feels*
like a game board, not a settings form.

## The mental model — semantic zoom (a ZUI)

Zoom navigates the **abstraction ladder**; content changes *meaning* at each depth (Figma/Miro
semantic zoom). The single gesture *zoom in / zoom out* drills the whole ladder:

```
 zoom OUT ▲                                                              detail ▼ zoom IN
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ L0 · Site        pages wired into a sitemap — a FLOW   → wire pages   crouton-flow (Vue Flow) │
 │  └ L1 · Page     a LAYOUT of the page's apps (panes)   → arrange apps crouton-layout          │
 │     └ L2 · App   each app is ITSELF a layout (sub-panes)→ arrange app crouton-layout (nested)  │
 │        └ L3 · Breakpoints   responsiveness of a layout → author/size  the responsive model     │
 └──────────────────────────────────────────────────────────────────────────────────────┘
```

**The key refinement (owner, this session):** *floating* (a flow / Vue Flow) is **only** for
**wiring the top** — pages into a site. The moment you zoom **into** a page it is **layouts in
layouts**: a page is a layout of apps, each app a layout — recursive nested layout trees, no more
floating from there down.

## The concepts that crystallized (with mock evidence)

All clickable; gallery at `writeups/ui-proposals/mocks/index.html`, plus `mockups/`.

1. **Mini-apps = blocks.** The unit placed at every layout level is a `croutonLayoutBlocks` entry
   (collection-list / form / stats / calendar …). One block must render unchanged in a pane, a
   canvas node, and a 3D panel — the `@container` block-authoring rule already buys this.
2. **Recursive nested layouts ("layouts in layouts").** A layout is a tree of panes; a leaf can
   host a *sub-layout* (an app that is itself a layout). The renderer recurses. *Mock:*
   `mockups/semantic-zoom/` (L1 page-layout → L2 app-layout).
3. **Compose by magnetic snap** + rearrange + resize + detach + **dwell-to-drop-inside**. Loose
   apps click together into a bound layout; the same tree edit `crouton-layout/layout-edit.ts`
   already does. *Mocks:* `13-snap-compose`, `14-rearrange`, `15-canvas-playground`.
4. **Responsiveness, two complementary layers:**
   - *Intrinsic* — **container queries**: every region reflows to *its own* width, recursively
     (the block-authoring rule made recursive). *Mock:* `18-container-context`.
   - *Explicit* — **breakpoint authoring by demonstration**: at a width you arrange/resize and it
     **locks from that width up** (a min-width checkpoint on a ruler); per-breakpoint you can also
     **collapse a pane** (→ gutter tab) and **switch a widget's variant** (list↔cards↔table).
     *Mock:* `19-breakpoint-authoring`. Per-device presets/quick-jump: `17-responsive-devices`.
5. **Collapse with game-feel.** How a pane disappears/returns is a designed motion. 12 concepts in
   `writeups/ui-proposals/layout-collapse-concepts.md`; the closed `LayoutCollapseStyle` enum
   (`crouton-core/app/types/layout.ts`) should grow to the top picks: **spring-drawer, crt-power-down,
   iris-portal** (in-place, size-proof); plus per-breakpoint collapse + a tabs/rail style.
6. **Three renderers, one tree.** `LayoutTree.renderer` is already a discriminator (`'panes'`);
   it generalizes to `'panes' | 'canvas' | 'spatial'` over the same blocks. Canvas = `crouton-flow`
   (Vue Flow); spatial = `crouton-three` (TresJS) + WebXR for VR. *Mock:* `16-spatial` (CSS-3D,
   `?view=stereo` headset split).

## Architecture mapping (what already exists)

| Concept | Package / file | Status |
|---|---|---|
| mini-apps (blocks) | `croutonLayoutBlocks` registry | exists |
| layout tree + renderer discriminator | `crouton-core/app/types/layout.ts` (`LayoutTree`, `renderer`) | exists (`panes`) |
| pane renderer + tree edits + viability | `crouton-layout` (`LayoutRenderer`, `layout-edit.ts`, `layout-viability.ts`) | exists |
| collapse styles enum | `LayoutCollapseStyle` (closed enum) | `gutter-tabs` shipped; rest reserved |
| site flow / canvas | `crouton-flow` (Vue Flow, node positions, multiplayer) | exists |
| 3D / VR | `crouton-three` (TresJS) | exists; WebXR = new |
| pages | `crouton-pages` | exists |

So most of this is **integration**, not greenfield (see #855's table). The new dimensions are the
**semantic-zoom shell**, **recursive nested layouts**, and the **two-layer responsiveness model**.

## Method — how this was built

The **`/mockup`** skill (#863): throwaway, clickable, no-build HTML for exploration. Two tiers —
hand-rolled (motion/interaction) and `--ui` = **real Nuxt UI v4 in Vue+Vite** (proven in
`mockups/ui-proof/`). Taxonomy: **mockup** (fake/clickable) → **prototype** (real/running;
`pocs/` → `prototypes/`, #866) → `/ui-proposal` → `apps/`.

## Open questions / risks

- **Persistence shape.** A node now carries: tree + per-split sizes + **per-breakpoint** overrides
  (arrangement, collapsed set, collapse-style, widget variant) + (for canvas) positions + (for
  spatial) transforms. Needs a clean schema (Schema sign-off, #314). How do nested layouts + the
  site flow persist together?
- **Container queries × authored breakpoints.** Intrinsic (per-container) is the default; authored
  breakpoints are explicit overrides — precedence + authoring UX need defining.
- **Recursion depth / performance** of nested container-queried layouts.
- **WebXR** feasibility/ergonomics (the one genuinely new capability).
- **Zoom shell**: continuous vs stepped zoom; how deep does it go; mobile/touch.

## Path forward (workstreams — see the epic for tracked sub-issues)

1. Semantic-zoom **shell** (ZUI navigation across levels).
2. **Recursive nested layouts** in `crouton-layout` (a leaf hosts a sub-layout).
3. **Site flow** level on `crouton-flow` (wire pages).
4. **Compose** gestures (snap/rearrange/detach/dwell) on the real tree — #855 WS3/WS4.
5. **Responsiveness**: container-query renderer + breakpoint authoring + per-bp collapse/variant.
6. **Collapse styles** → promote top-3 into `LayoutCollapseStyle`.
7. **Spatial/VR** renderer — #855 WS6/WS7 (later).

## Links
- Epic: #868 · renderer mechanics & compose: #855 · `/mockup` skill: #863 · `pocs/→prototypes/`: #866.
- Gallery: `writeups/ui-proposals/mocks/index.html` · collapse writeup: `writeups/ui-proposals/layout-collapse-concepts.md` · zoom: `mockups/semantic-zoom/` · Nuxt-UI proof: `mockups/ui-proof/`.
- Branch: `claude/crouton-collapse-concepts-wmbapy`.
