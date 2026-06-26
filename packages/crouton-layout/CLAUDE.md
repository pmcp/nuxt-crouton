# CLAUDE.md - @fyit/crouton-layout

## Package Purpose

The **deterministic layout engine** for Nuxt Crouton, extracted from `crouton-core`
(epic #751, follow-up to #736/#709). It owns everything that arranges a team's
collections into a laid-out admin surface — the editor, the renderer, the
deterministic default-layout pass, the placeable blocks, and the `layout_configs`
storage.

It is **default-on**: `@fyit/crouton` (the meta-layer) extends this layer, exactly
the way `crouton-core` auto-includes `crouton-i18n` / `crouton-auth` / `crouton-admin`.
A fresh `crouton init` app gets the layout engine with zero extra wiring; an app can
opt out by disabling the module from a layer.

## Dependency direction (HARD RULE)

**One-way: `crouton-layout → crouton-core`.** This layer extends core and may import
from it; core must never depend on `crouton-layout`. Feature packages
(`crouton-bookings`, …) contribute their own blocks through the
`croutonLayoutBlocks` **app.config registry** (e.g. bookings registers
`bookings-calendar`). So:

- `crouton-layout` needs **no** knowledge of bookings/sales/etc.
- bookings/sales/etc. need **no** dependency on `crouton-layout`.

Never make a feature package depend on this one — wire blocks via the registry.

## Status (extraction in progress — #751)

This package is being populated workstream-by-workstream. The scaffold (#753) is the
empty layer; subsequent PRs move the code in:

| Workstream | Moves in |
|------------|----------|
| #753 scaffold ✅ | package.json · nuxt.config.ts · this CLAUDE.md · `pkg:crouton-layout` label · package-catalog entry |
| #757 default-on ✅ (pulled early) | `crouton.manifest.ts` (`bundled: true`) · `layout` feature flag in `CroutonOptions` · `@fyit/crouton-layout` added to every app/fixture/poc `extends` + deps. **Empty layer wired into the graph first** so the code-moves below stay clean one-way + green. |
| #754 + #755 utils + components + composables ✅ | `app/utils/layout-{compose,viability,edit}.ts` + `app/composables/useCroutonLayout{Blocks,Edit,Store}.ts` + the `Layout*` components + the `croutonLayoutBlocks` defaults (`app/app.config.ts`) (+ tests). CLI repointed to `@fyit/crouton-layout/app/utils/layout-compose`. **Combined** (the relative `../utils/layout-*` imports make them inseparable without a backward shim). |
| #756 server side | `layout_configs` schema + `crouton-layouts/[layoutId].{get,put}` API + `/admin/[team]/layout` page + `app/utils/layout-tree.ts` (migration continuity) |
| #758 prove it | full boot + e2e proof; doc sweep (core CLAUDE.md row surgery, skills); port the mobile slideover (#749) + loading-state UX fixes into the core page |

**Types stay in `crouton-core`.** `app/types/layout.ts` (`LayoutTree`/`LayoutNode`) and `app/types/layout-block.ts` (`CroutonLayoutBlock*`) — plus `app/utils/layout-tree.ts` (`sanitizeLayoutTree`, the sanitizer paired with the type, used by core's server until #756) — **remain in core** as the shared contract, so `crouton-bookings` / `crouton-pages` keep importing them from core and need **no** dep on this package. This layer's files import those types from `@fyit/crouton-core/app/types/...`.

**Why #757 is first:** apps `extends: ['@fyit/crouton-core', …]` directly and core can't extend this layer (circular). So this layer only becomes active once it's in each app's `extends`. Wiring it (empty) up front means the code-moves land in an already-active layer — clean cross-layer auto-imports, no backward `core → layout` shims, one-way deps preserved at every PR.

## Key Files

| File | Purpose |
|------|---------|
| `app/utils/layout-compose.ts` | **Deterministic default-layout pass** (#709) — `composeDefaultLayout({ collections, registry, … })` arranges generated collections into a viable default (calendar-primary / master-detail / form-centric). Pure; the SAME rules run in the CLI generate→POC pipeline (`@fyit/crouton-layout/app/utils/layout-compose`) and in-app via `useCroutonLayoutBlocks().composeDefault(...)`. |
| `app/utils/layout-viability.ts` | **Viability metric** (#710) — `checkLayoutViability` / `checkTreeViability` → every placed block gets ≥ its `minWidth` in its pane. `minWidthResolver` / `panelMinSizePct` (runtime min-size enforcement). |
| `app/utils/layout-edit.ts` | Pure layout-tree edit transforms (#706) — `dropBlock` / `splitLeaf` / `removeNode` / `applySizes` / `setConfig`, addressed by a `NodePath`. Immutable. **Recursive nested layouts (WS2 #871):** `makeNested` / `getNestedLayout` / `replaceNestedLayout` — a `nested` node is *opaque* to its parent's `NodePath` (it isn't a `split`), so each layout edits in its OWN path space scoped to the focused zoom level; you pull a sub-layout out, transform its root with the same functions, write it back. `findNestedNodes` lists the nested apps (paths + labels) reachable in one layout's path space — the zoom targets for the WS1 shell. **Compose gestures (WS4 #873):** `dropNode` (insert a whole node — the snap/rearrange primitive, vs `dropBlock`'s fresh leaf) · `detachNode` (pop a node out to a free card) · `moveNode` (rearrange — marker-based re-locate, robust to the detach collapsing a 2-child parent) · `nestInside` (dwell-to-drop → wrap target + node into a `nested` app, or append into an existing one) · `findNodePath`. |
| `app/utils/layout-snap.ts` | **Edge-proximity geometry** for compose gestures (WS4 #873) — pure, tree-agnostic. `snapEdge(drag, target, {gap,align})` → which edge of a pane a dragged rect snaps to (smallest in-range gap wins; horizontal snaps need vertical alignment & vice-versa); `closestSnap(drag, targets, {excludePath})` → best snap across candidates; `rectsOverlapFrac` / `isOverPane` → the dwell-to-nest signal. The `where`; `layout-edit` applies the `what`. |
| `app/composables/useCroutonSemanticZoom.ts` | **Semantic-zoom navigation state machine** (WS1 #870) — a breadcrumb stack of frames; `zoomIntoPage` / `zoomIntoNested(path)` (descends into a WS2 `nested` node's own sub-layout) / `zoomIntoBreakpoints` / `zoomOut` / `jumpTo` / `reset`. Walks Site → Page → App → Breakpoints; pure `vue` reactivity so it's unit-testable without Nuxt. |
| `app/utils/layout-responsive.ts` | **Responsiveness — explicit layer** (WS5 #874). Pure precedence logic for authored breakpoints (the *intrinsic* layer is the renderer's recursive `@container` CSS). `resolveLayoutAtWidth(tree, width)` → the effective `{ root, collapsed, variants, collapseStyle, activeBreakpoint }` via **min-width-locks-upward, per-field last-wins** (the Test-sign-off contract, #774). `partitionCollapsed(root, ids)` splits the visible tree from the collapsed gutter panes. Authoring transforms: `patchBreakpoint` / `removeBreakpoint` / `toggleCollapsed` / `setVariant` / `listBlocks`. **WS6 #875:** `normalizeCollapseStyle(value)` (→ a known `LayoutCollapseStyle`, default `gutter-tabs`), `isSubtreeCollapsed(node, set)` (a splitter panel hands space back only when ALL its leaves are collapsed), `setCollapseStyle(tree, minWidth, style)` (author the motion at a checkpoint). |
| `app/composables/useCroutonLayoutResponsive.ts` | Reactive glue over `layout-responsive` — `useCroutonLayoutResponsive(tree, width)` resolves + partitions reactively; `LAYOUT_VARIANTS_KEY` provides the active breakpoint's per-block widget variants down to `CroutonLayoutRenderer` (which merges a leaf's variant into its config). **WS6 #875:** `LAYOUT_COLLAPSE_KEY` provides the in-place collapse context (`{ collapsedSet, style, expand }`) — present only when an in-place style is active, so the gutter-tabs path is untouched. |
| `app/components/LayoutResponsiveRenderer.vue` | `CroutonLayoutResponsiveRenderer` — renders a tree **with breakpoints applied**: resolves at the measured (or simulated `width`) container width, provides variants. **Branches on the resolved collapse style (WS6 #875):** `gutter-tabs` → draws the visible tree minus collapsed panes + a right gutter rail; an *in-place* style → renders the FULL resolved tree (collapsed panes stay in their slots as handles) and provides `LAYOUT_COLLAPSE_KEY`. **Tapping a collapsed pane peeks it as an overlay drawer** that slides in from the *side that pane lives on* (a left pane → from the left) and shows the block's real content (rendered directly, bypassing the collapse context so it doesn't redraw the handle). The explicit layer atop `CroutonLayoutRenderer`. **Bubbles `layoutChange` (#874 follow-up):** when a splitter is dragged, it resolves the resized split *node* → its `NodePath` within the resolved root and emits `(path, sizes)`, so an author resolving the same tree at the same width can apply the sizes onto a structurally-identical root. |
| `app/components/LayoutCollapseHandle.vue` | `CroutonLayoutCollapseHandle` (WS6 #875) — the resting handle a pane collapses *into* for an in-place style + its signature CSS motion (`spring-drawer` spine · `crt-power-down` standby dot · `iris-portal` seed). Replaces a collapsed leaf's block in its own pane slot; click to `expand`. Presentational + `prefers-reduced-motion`-aware. |
| `app/components/LayoutBreakpointAuthor.vue` | `CroutonLayoutBreakpointAuthor` — the **Breakpoints zoom level (L3)**: author responsiveness *by demonstration* (ruler of min-width checkpoints · device presets · scaled device frame · per-checkpoint collapse + widget variant). **Auto-breakpoint:** changing anything at a width auto-creates/updates a checkpoint *there* (snapshotting the resolved state) — no explicit "Add" step; **this includes dragging a splitter** (handles the renderer's `layoutChange` → `applySizes` onto the resolved root → snapshots it as the checkpoint's `root` override, #874 follow-up). **Delete:** click a ruler marker to arm it (red ✕), click again to remove. `v-model` = `LayoutTree`; edits are pure `layout-responsive` transforms. Mocks 17/18/19. |
| `app/components/LayoutZoomShell.vue` | `CroutonLayoutZoomShell` — the **zoom shell** UI over `useCroutonSemanticZoom`: breadcrumb + Esc/scroll-out, renders the focused frame (site → `CroutonLayoutRenderer` for layouts, with a toolbar to zoom into each nested app or breakpoints). **L0 is a `#site` slot** (WS3 #872) exposing `{ pages, zoomIntoPage }` — a host fills it with `CroutonFlowSiteFlow` (the live Vue Flow canvas) so the shell stays free of any crouton-flow coupling; the default slot content is the static page grid (shell still works standalone). **L3 Breakpoints** renders `CroutonLayoutBreakpointAuthor` (WS5 #874); edits emit up as `layoutChange` (host owns persistence). pane-click-to-zoom + game-feel motion + deep page round-tripping are follow-up polish. |
| `app/composables/useCroutonLayoutBlocks.ts` | **Layout block registry** reader — `app.config.croutonLayoutBlocks`; `getBlock`/`resolveComponentName`/`sanitizeConfig` + `checkViability` + `composeDefault` (bound to the live registry). |
| `app/composables/useCroutonLayoutEdit.ts` | `LayoutEditApi` + `LAYOUT_EDIT_KEY` — the provide/inject edit contract for editor panes. |
| `app/composables/useCroutonComposeGestures.ts` | **Compose-gesture controller** (WS4 #873) — reactive drag state over a list of free `ComposePiece`s; `start`/`move`/`end`/`cancel` + a `preview` (snap edge / dwell-nest / free) the canvas draws. Delegates decisions to the pure tested `closestSnap` / `isOverPane` + `dropNode` / `nestInside`; owns only the drag state + dwell timer. |
| `app/components/LayoutComposeCanvas.vue` | `CroutonLayoutComposeCanvas` (WS4 #873) — the direct-manipulation playground: free pieces float; drag one near another → magnetic snap into a bound split (guide line); hold OVER one → dwell ring → drop inside (nested app). `v-model` = `ComposePiece[]`; owns pointer events + world↔client math; each piece renders through `CroutonLayoutRenderer`. Pieces are **clamped to the canvas** (drag + on resize/commit) so one can never be stranded off the clipped edge; a snap **grows the combined group** along the snap axis so the joined pane keeps its size. A corner **resize handle** resizes a piece; grouped pieces render via `CroutonLayoutComposePane` so each leaf can **detach** back out or be removed. Mocks 13/15. |
| `app/components/LayoutComposePane.vue` | `CroutonLayoutComposePane` (WS4 #873) — an *editable* recursive pane for the canvas (mirrors `CroutonLayoutRenderer`'s split/leaf/nested recursion via reka-ui Splitter) where every leaf carries a hover handle: **detach** (pop the pane out of its group into a free piece) + **remove**. Emits `detach`/`remove` with the leaf's `NodePath`; the canvas applies `detachNode`/`removeNode`. Keeps the read-only renderer chrome-free. |
| `app/composables/useCroutonLayoutStore.ts` | Load/save a `LayoutTree` to the team-scoped `layout_configs` table (re-sanitizes via core's `sanitizeLayoutTree`; debounced save). |
| `app/components/Layout.vue` | `CroutonLayout` — the **editable** panes surface (palette + canvas + per-block config + viability badge). `v-model` = `LayoutTree`. |
| `app/components/LayoutRenderer.vue` | `CroutonLayoutRenderer` — recursive **read-only** renderer into reka-ui Splitter panes; resolves each leaf `blockId` via the registry. A `nested` node recurses into its sub-layout's root (WS2 #871); the editor pane renders nested **read-only** for now — the nested *authoring* UX (drop-in / zoom) is WS1/WS4 (UI sign-off #307). Each pane is a CSS `@container` (`.croutonpane`) so blocks reflow to their own pane width recursively — the **intrinsic** responsiveness layer (WS5 #874); injects `LAYOUT_VARIANTS_KEY` to merge an authored widget variant into a leaf's config. **WS6 #875:** when an in-place collapse context (`LAYOUT_COLLAPSE_KEY`) is present, a collapsed leaf renders `CroutonLayoutCollapseHandle` instead of its block, and split panels become reka-ui `collapsible` (driven imperatively from `isSubtreeCollapsed`) so siblings reflow into the freed space. **The pane's own shrink animates per style (#875 follow-up):** reka-ui sizes a panel via inline `flex-grow`, so a per-style CSS transition on `flex-grow` (`mq-co-{style}`, present whenever an in-place style is active) tweens the collapse **both ways** while siblings reflow in — `spring-drawer` overshoots, `crt-power-down` snaps, `iris-portal` glides. (Collapse is still driven imperatively via the panels' `collapse()`/`expand()`; the always-present transition is what tweens the resulting flex-grow change.) Absent context ⇒ byte-for-byte the old behaviour. |
| `app/components/LayoutEditorPane.vue` | `CroutonLayoutEditorPane` — recursive **editable** pane (drop zones, per-pane toolbar, selection). |
| `app/components/LayoutCollection.vue` + `LayoutCollectionData.vue` | `CroutonLayoutCollection` — real data-bound **list** block (renders a generated collection by name). |
| `app/components/LayoutForm.vue` | `CroutonLayoutForm` — real data-bound **form** block (inline create form for a collection). |
| `app/components/LayoutSpikeStats.vue` | `CroutonLayoutSpikeStats` — generic KPI demo block, registered as `stats`. |
| `app/app.config.ts` | The default `croutonLayoutBlocks` registry (collection-list / entity-form / stats), defu-merged across layers (packages add their own, e.g. bookings' `bookings-calendar`). |
| `crouton.manifest.ts` | `bundled: true` → default-on via `getCroutonLayers()`. |

## Key Files

_Populated as the extraction lands (#754+)._ Until then this layer is an empty
shell that extends `crouton-core`.

## Conventions

Defers to the **root `CLAUDE.md`** for all workflow/commit/issue conventions
(GitHub-issue tracking, `/commit`, no-squash merges, the `packages/` edit gate).
This file covers only what is specific to `crouton-layout`.
