# semantic-zoom — one zoomable surface, four semantic levels

The first prototype built with the `/prototype` skill (hand-rolled tier, motion-first).
A **Zoomable UI (ZUI)** where zoom navigates the *abstraction ladder* — content changes
*meaning* at each depth (Figma/Miro-style semantic zoom), applied to the whole crouton builder.

Open `index.html` and click a node to fly in; **Esc** / scroll-up / a breadcrumb to fly out.

```
L0 · Site        pages wired into a sitemap/flow        → a whole website   (crouton-pages)
L1 · Page        the page's mini-apps, connected         → wire them         (Vue Flow / mock 15)
L2 · App         the app's layout tree of panes          → arrange/snap      (mock 15 / LayoutRenderer)
L3 · Breakpoints responsiveness: ruler · collapse · vars → author per size   (mock 19)
```

This is the proposed **unifying shell** for epic #855 — what makes the canvas, the layout
editor, and the breakpoint authoring *one product* instead of separate screens.

## Screenshot contract
`?level=0..3` renders a level statically (used for capture). The zoom transition is a
transform-based fly-in/out: the clicked node scales up + fades while the next level emerges
from the node's rect (and the reverse on zoom-out). Breadcrumb + Esc + scroll-up all zoom out.

## If this graduates
The zoom shell wraps the real renderers: L1 = `crouton-flow` (Vue Flow), L2 = `crouton-layout`
panes, L3 = the breakpoint/container model (mocks 17–19), L0 = `crouton-pages`. Each level is the
real surface, not a fake — the ZUI is the navigation layer on top.
