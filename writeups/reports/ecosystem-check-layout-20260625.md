# Ecosystem check — extracting the layout engine (epic #895, WS1 #896)

_2026-06-25 · build-vs-adopt for a standalone `crouton-layout` extraction._

## Question
Before extracting `crouton-layout`'s engine into a public package, is the capability
already solved by the Nuxt/UnJS/OSS ecosystem — and if we build, how does it differ?

## What we actually depend on today (checked the tree first)
Only **two** runtime libs back the engine — everything else is our own code:
- **reka-ui `2.9.10`** — the `Splitter` primitives (group/panel/resize-handle). The pane
  substrate. Already our dep; keep it.
- **@vueuse/core `14.3.0`** — `useElementSize` (container measurement) throughout.
- Native **CSS `@container`** queries for intrinsic reflow.

`splitpanes`, `vue-grid-layout`, `grid-layout-plus`, `dockview`, `golden-layout` are
**not** installed — nothing to reuse-by-accident.

## Prior art

| Library | Status | What it does | Overlap with us | Gap vs us |
|---|---|---|---|---|
| **Dockview** (`dockview` v7.0.2, `dockview-vue` v5.1.0, MIT, zero-dep, active) | The closest | IDE-style **docking**: tabs, groups, grids, splitviews, floating/popout, drag-drop, **`toJSON`/`fromJSON`** serialization | **layout-as-data + serialization + pane tree + DnD** — the substrate idea | Interaction model is *docking* (tabs/groups), **not** magnetic snap-to-compose on a free canvas; **no** responsiveness-by-demonstration / `@container`; no designed collapse motions; no viability metric |
| **grid-layout-plus** / **vue-grid-layout** (MIT, active fork) | Mature | Draggable/resizable **grid** dashboards with **responsive breakpoints** | drag/resize + responsive breakpoints | **Grid-cell** model, not a nested split tree; no snap-into-tree; no intrinsic `@container`; no collapse motion; breakpoints are config, not authored-by-demonstration |
| **splitpanes** (MIT) | Stable | Vue split/resize panes | pane splitting | A **subset of reka-ui Splitter** (which we already use). Not an engine |
| **golden-layout** (MIT) | Older, JS-first | Multi-window docking (finance-style) | serialization + panes | Not Vue-native; docking model; heavier; less maintained |
| **reka-ui Splitter** (MIT) | Our dep | Headless splitter primitives | the pane primitive itself | Just the primitive — no tree model, transforms, responsiveness, snap, or collapse |

## Constraints check (all candidates pass the hard gates)
OSS + self-hostable (no SaaS), permissive licenses (MIT across the board), Nuxt/Vue-
compatible. No blockers — this is a *differentiation* question, not a constraint one.

## What's genuinely ours (the differentiator)
No surveyed library does the **authoring model**, which is the novel surface:
1. **Magnetic snap-to-compose** — free pieces snap edge-to-edge into a *bound split tree*
   (+ dwell-to-nest). Dockview docks into tab-groups; grids snap to cells; neither
   composes a nested split tree by proximity.
2. **Responsiveness by demonstration** — authored min-width breakpoints (lock-upward,
   per-field last-wins) **composed with** intrinsic `@container` reflow. Grid libs have
   *config* breakpoints; none author by arranging at a width.
3. **Designed collapse motions** (spring-drawer / crt-power-down / iris-portal) as a
   first-class, size-proof enum — nobody ships this.
4. **Viability metric** — every block guaranteed ≥ its declared min-width in its pane.
5. **Pure, framework-free transforms** — the whole engine (`layout-edit/-responsive/
   -snap/-compose/-viability`) is dependency-light TS; the Vue components are a thin skin.

## Recommendation: **BUILD (extract) — but reuse the substrate**
- **Keep building on reka-ui Splitter** for the pane primitive — do NOT reinvent it.
- **Adopt Dockview's *lessons*, not Dockview** — its `toJSON/fromJSON` API ergonomics and
  multi-framework binding split are a good reference for our public API shape. (We could
  even document interop: import a Dockview-style JSON.) But its docking interaction model
  is a different product; it can't host snap-to-compose + responsiveness-by-demonstration.
- **The differentiator is the authoring model + responsiveness**, which is ours and
  unduplicated → extraction is justified, not redundant.

## Naming — ⚠️ avoid `nuxt-layout` / `vue-layout`
- Neither exists as a real package (good), BUT **`nuxt-layout` collides semantically with
  Nuxt's built-in `<NuxtLayout>` / `layouts/` concept** — it would read as "Nuxt's layout
  system," which it isn't. **`vue-layout`** is generic and forgettable.
- Pick a **distinctive** name evoking *panes / compose / zoom-canvas* (the differentiators),
  not the generic word "layout." Verify final choice on the npm registry before claiming.
  (Naming decision deferred to a WS2/packaging step — out of scope for WS1.)

## Verdict for the epic
Proceed with **#895** (extract). WS2 lifts the pure core; WS3 decouples the components
(injectable block-resolver + unstyled chrome) — *that* decoupling is the real work, since
the engine logic is already clean. Study Dockview's serialization API in WS4. Rename away
from `nuxt-layout`/`vue-layout`.

## Sources
- [Dockview](https://dockview.dev/) · [GitHub](https://github.com/mathuo/dockview) · [npm](https://www.npmjs.com/package/dockview)
- [Grid Layout Plus](https://grid-layout-plus.netlify.app/) · [vue-grid-layout](https://github.com/jbaysolutions/vue-grid-layout)
- [Awesome Vue — UI Layout](https://awesome-vue.js.org/components-and-libraries/ui-layout.html)
- [Nuxt `<NuxtLayout>`](https://nuxt.com/docs/4.x/api/components/nuxt-layout) (the naming-collision source)
