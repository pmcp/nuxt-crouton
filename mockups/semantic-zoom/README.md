# semantic-zoom — one zoomable surface, four semantic levels

The first mockup built with the `/mockup` skill (hand-rolled tier, motion-first).
A **Zoomable UI (ZUI)** where zoom navigates the *abstraction ladder* — content changes
*meaning* at each depth (Figma/Miro-style semantic zoom), applied to the whole crouton builder.

Open `index.html` and click a node to fly in; **Esc** / scroll-up / a breadcrumb to fly out.

```
L0 · Site        pages wired into a sitemap — a FLOW      → wire pages        (crouton-flow / Vue Flow)
L1 · Page        a LAYOUT of the page's apps (panes)       → arrange apps      (crouton-layout)
L2 · App         each app is ITSELF a layout (sub-panes)   → arrange the app   (crouton-layout, nested)
L3 · Breakpoints responsiveness: ruler · collapse · vars  → author per size   (mock 19)
```

**Key model (refined):** *floating* (a flow / Vue Flow) is only for **wiring the top** — pages
into a site. The moment you zoom **into** a page it's **layouts in layouts**: a page is a layout
of apps, and each app is itself a layout (recursive nested layout trees) — no more floating from
there down. This is the proposed **unifying shell** for epic #855 — what makes the flow canvas, the
layout editor, and the breakpoint authoring *one product* instead of separate screens.

## Screenshot contract
`?level=0..3` renders a level statically (used for capture). The zoom transition is a
transform-based fly-in/out: the clicked node scales up + fades while the next level emerges
from the node's rect (and the reverse on zoom-out). Breadcrumb + Esc + scroll-up all zoom out.

## If this graduates
The zoom shell wraps the real renderers: L0 = `crouton-flow` (Vue Flow — the only floating level,
where you'd actually drag + connect pages), L1/L2 = nested `crouton-layout` panes (a page-layout
whose panes are app-layouts), L3 = the breakpoint/container model (mocks 17–19). Each level is the
real surface, not a fake — the ZUI is the navigation layer on top. (Drag/add isn't wired in this
hand-rolled mock; that's Vue Flow + the layout engine in the real thing.)
