# Crouton Builder — handoff (living doc)

> **This is a LIVING handoff, curated to *current truth* — not a changelog.** Every time a design
> decision is **signed off** ("ok, this works"), capture it here. When we iterate *past* a decision,
> **edit/delete the superseded version** — this file should always read as *"this is how it should be
> built,"* never *"here's everything we tried."* It IS the brief the **`graduate`** skill consumes
> when this POC becomes a real package + app, so keeping it current means graduation starts written.
>
> Scope of this doc: the **Crouton Builder spike** (`/spike-app`, epic #907). (The app also hosts a
> throwaway `@fyit/crouton-three` demo at `/three` — see `README.md`; unrelated to the builder.)

## North Star — why this exists (the real goal)

**This builder is the human-in-the-loop surface of an AI app-generation pipeline.** The end state is:
an AI is asked for a specific app ("a football calendar dashboard"), and it builds the whole thing by
chaining the crouton pieces — *the builder is where a human and that agent meet on the same artifact.*

**Positioning: "Lovable, but opinionated."** Same one-prompt-to-app feel, except the output is *always* in
the house style — heavily **Nuxt UI 4 / crouton-opinionated**, not freeform generated markup. You don't get
a random UI, you get *your* system's UI, consistently. That consistency is exactly what makes the blocks
composable and the round-trip (below) safe to automate.

**The full lifecycle — close to end-to-end automation, with a human checkpoint:**

```
ask → collections → blocks → layout-engine assembles the app → you GET a working app
   → iterate by direct manipulation ("this, not that") → the edits SAVE (as a LayoutTree on the ticket)
   → GRADUATE pocs/ → apps/ (the deliberate test-first rebuild)
```

Each arrow is already a crouton piece; the remaining work is wiring them into one flow and persisting the
human's iteration back as spec (see round-trip below + Graduation requirements).

**Observability is the other half.** As this automates, you need to *keep an eye on what the skills/agents
are doing* — an observability layer over the pipeline (which skills ran, what they produced, where a human
intervened). The builder is the **visual** observability+control point for the layout step specifically;
the broader system needs the same for the generation steps.

The pipeline:

```
ask: "build a football calendar dashboard"
  → crouton CLI/MCP generates the COLLECTIONS (schemas, CRUD, API, migrations)
  → the graph/charts package generates BLOCKS for those collections (list, calendar, stat, chart, form…)
  → the LAYOUT ENGINE composes those blocks into PAGES — driven by an AGENT, or by a human in THIS builder
  → a full app
```

The two composer drivers — agent and human — operate on **one shared artifact: the `LayoutTree`** (the
tree of layouts → blocks, with their splits/sizes/breakpoints). That shared format is what makes the loop
close:

- **Agent → human.** The agent proposes a first-cut layout (already what `composeDefault` / the magic
  arrange does); it lands in the builder as a `LayoutTree`.
- **Human → agent (the iteration loop).** The human reiterates by direct manipulation — re-dragging
  blocks, snapping, reordering, resizing, changing the page flow — and the result **serialises back to the
  same `LayoutTree`** and is **fed back to the agent as the new spec**.

**The round-trip must be persistable to the GitHub ticket (planned).** A human's edited version should be
**saved back onto the tracking issue** — the serialised `LayoutTree` (layouts · blocks · sizes/breakpoints,
in a clean, diffable format) posted to the ticket as the **command/spec for the agent** to (re)build from.
So a "version" in the builder becomes a concrete instruction on the ticket: the agent reads the tree, the
human edits it visually, the edit goes back to the ticket, the agent acts on it. The builder is the visual
front-end to an issue-tracked, agent-executed layout spec. (See Graduation requirements.)

## Expressiveness boundary — the "artboard" question (design guardrail)

There's a real tension: the builder must produce **good-looking** layouts (you should be able to make
the review-flow-with-a-pinned-pill-top-and-bottom kind of thing), but it must NOT drift into a freeform
"make anything" design tool — because the **whole point is that an agent can also produce and re-read
the layout**, in the opinionated house style. A free-floating canvas (arbitrary x/y, per-pixel sizing)
breaks both: an agent can't reliably target it, and it breaks responsiveness.

**The rule that resolves it: every expressive control must be a BOUNDED, ENUMERATED, RESPONSIVE choice
that serialises into the `LayoutTree` — i.e. something an agent could equally have picked from a small
set.** If a control can only be expressed as a free value (drag to x=347px, float anywhere), it's "too
far". If it's an enum/role an agent could choose, it's in.

Concretely — what's IN vs OUT:

- ✅ **Regions/roles, not free floats.** The "artboard" instinct is right but should be a few *named
  regions* (e.g. `header`/top-pill · `main` · `footer`/bottom-pill · `aside`), not absolute-positioned
  elements. A pinned top/bottom pill is a **pinned region**, not a free-floating box. This gives the
  review-flow + pills look while staying tree-structured and agent-targetable.
- ✅ **Per-block sizing as ENUMS.** `full-width` / `full-height` / `fixed` / `auto`, `pin: top|bottom|
  left|right`, grow/shrink — bounded settings that stay responsive (mirrors the page model's existing
  `layout: default|full-height|full-screen` enum, pushed down to blocks).
- ✅ **Layout primitives** like the **Spacer** (#952) — a real, snappable block that holds space.
- ❌ **No free-floating absolute positioning** (arbitrary x/y), no per-pixel manual sizing outside the
  splitter/enum model, no "anything anywhere".

So the builder stays a *structured* editor (splits, regions, enum settings, primitives) that just
happens to feel direct-manipulation — the LayoutTree is always the truth, and an agent is a first-class
co-author of it. Add expressiveness by adding **bounded vocabulary**, never a blank canvas.

## What it is

Build an app by composing a collection's blocks into a `LayoutTree`, visually, on a Vue Flow canvas.

**Two levels, one screen** ("Decision B" — a *Site* level added **on top of** the polished board, not
by porting the board into the old zoom shell):

- **Site = the page flow.** A `CroutonFlow` canvas renders pages as a wireable sitemap (cards = pages,
  lines = `parentId`). The view you land on. Cards use a POC card (`SpikePageCard`, injected via
  `defaultNodeComponent`) instead of the package's `CroutonFlowPageNode`, so each card shows the page's
  settings **condensed** — live/draft **status** (coloured dot), **visibility/permissions** icon,
  **layout** and **in-nav** — the same chips the full page header carries, just shrunk. (We override
  the card POC-side rather than edit the package; on graduation this folds back into
  `CroutonFlowPageNode`.) Status/visibility/layout meta is shared with the board header via the
  auto-imported `app/utils/spike-page-meta.ts` so the condensed card and full header never drift.
- **Page = the board.** Tap a card (or ⤡ / double-click) → `enterPage()` loads that page's `LayoutTree`
  onto the Vue Flow board, where you compose blocks — "opening the full page". `Pages ←` returns.

## Signed-off design decisions (current truth)

### Page model — one node is *the* page (#942)

The board is a sandbox of layout candidates + loose draft blocks; **exactly one node is "the page"**
(the live layout a user would see), ★-badged. **Set as page** promotes a node; **Duplicate** clones one
as a free draft so you can rearrange a copy then promote it. Both are provided by the page and injected
by `SpikeBlockNode`, keyed by node **object identity** (Vue Flow doesn't forward the node id). A merge
that involves the page **always consumes** — the page badge survives, favourited never silently
becomes unfavourited.

### Focus / layout-edit view (#907)

Double-click a layout node → a **dedicated full-screen edit VIEW**, not a Vue Flow camera zoom.

- **Why a view, not a camera.** Zooming the camera onto a node made Vue Flow re-measure and fire its
  own viewport fit, racing the camera op → off-screen framing on some nodes (reliably the 2nd at a
  mobile viewport). A plain overlay has no camera and no re-measure race → every node frames cleanly.
- **One unified surface.** Hosts `CroutonLayoutBreakpointAuthor` (`@fyit/crouton-layout`) untouched —
  min-width ruler, device buttons, width slider, per-checkpoint collapse motion, per-block variants,
  splitter drags → keypoint sizes. The floating header sits in the author's reserved top band.
- **Persistence unchanged.** The node's layout rides the page's `zoomTree` `v-model`; `Done` returns.

### Page regions (#953 — the first "bounded vocabulary" expressiveness feature)

A node can be **pinned to the page's top/bottom edge** (a sticky pill/bar) from its action toolbar; the
badge shows "Pinned top/bottom". **▶ Preview** assembles the running page: pinned-top nodes in a sticky
top bar, pinned-bottom in a sticky bottom bar, everything else (or the ★ page node) in a scrolling main
area between — the review-flow + pill-top + pill-bottom shape, with NO free-floating positioning. Region
is a bounded enum (`top`|`bottom`|undefined=main) on the FlowNode data — agent-pickable, serialisable.
Composed POC-side (`SpikePagePreview` over `CroutonLayoutRenderer`). Next in this family: per-block
sizing enums (full-width/height, fit) so a pinned pill is short instead of as tall as its content.

### Board gestures (direct manipulation)

- **Snap = two-stage dwell-to-arm (#941, #948).** Near a snap point → **soft** (blue, wide, pulsing).
  Hold ~0.6 s → **armed** (green, release-to-snap). The arm timer is keyed on the **target only**
  (not the exact seam), so finger jitter that flips the nearest seam doesn't reset it; the seam keeps
  tracking your finger. (No "release to snap" text — the green ring + guide bar say it.)
- **Insert *between* panes (Phase A).** Over a combined (split) layout, a card inserts between panes,
  not just onto an outer edge. Triggers on **≥35 % overlap** with the split (not centre-strictly-inside
  — a big card overlapping heavily used to match neither insert nor edge); seam picked from the centre
  **clamped** into the target.
- **Single items are snap targets too.** Hovering a dragged card **over** a single block (a leaf, or a
  nested app — anything with no inner seams) snaps it **beside** that block into a new split; the edge is
  picked from which half of the target's centre you're over (right half → merge right, top half → top…).
  Before, only multi-pane splits armed on hover-over, so a lone block couldn't be built onto by dragging
  onto it (only by edge-snapping beside it). The drop reuses the existing `combineNodes` edge-merge.
- **Ghost mirrors the dragged item; panes ease apart to make room (#946/#947).** On an armed insert the
  target splices a **ghost skeleton with the dragged node's footprint** (every leaf → a dashed
  `__dropghost__` placeholder, splits/nested preserved) and renders that — a 2-row stack opens a *2-row*
  slot, growing the row to fit (not a flat 1×1 sliver). Real panes slide via the FLIP reflow; the card
  grows with a transition. Reverts on un-arm.
- **Detach / reorder** (board gesture): long-press a merged node → its panes **wiggle** (grabbable),
  then pull a pane — tracks your finger 1:1 (zoom-corrected). **Reorder is the default**: slide the pane
  across to another slot (green "Move here") and release to move it there. **Detach** needs a clear pull
  **OUT** of the card — the finger must pass a `DETACH_MARGIN` (~64px) beyond the card edge, so a small
  overshoot while reordering doesn't tip into a detach. Under the threshold it springs back. Cancel the
  wiggle by tapping outside / Esc / Done. Gating the gesture behind the hold stops a plain select-and-drag
  from detaching. **Both the slot detection (reorder) and the detach margin measure against the visible
  card (`.spike-block-node`), NOT `.vue-flow__node`** — see the gotcha below; getting that wrong is what
  made reorder silently impossible (#952).
- **Drag glow.** A dragged card carries a light-green halo (Vue Flow `dragging`, forwarded by
  `CroutonFlow`), fading on drop. Snap rings (emerald armed / sky soft) outrank the glow.

### Framing & camera

- **Enter a page → snap to fitted, instantly.** `fitPage()` frames the page node by its **known
  geometry** (`position` + footprint `sizeOf`), NOT Vue Flow's measured size (stale on fresh mount),
  with `duration: 0` (no zoom-out wobble). Retries (`nextTick` + 40/120/300 ms) ensure it lands once
  `flowRef` mounts.
- **Add a block → land clear, centred, green.** Placed in a **clear spot right of every node** (from
  real footprints — a fixed `count×300` stride dropped it *under* wide/moved layouts), camera **centres
  on it** at a moderate zoom, green "just added" glow fades after ~2.5 s.
- **Pinch-to-zoom over a layout (#948).** A 2-finger pinch starting on a node was swallowed by the
  node's drag. `SpikeBlockNode` catches a 2-finger gesture in the **capture phase** (before the drag);
  the page drives zoom via `setCenter`, keeping the pinched point under the fingers. One finger still
  drags/long-presses.
- **Page ⇄ Site transition.** **Simultaneous** cross-fade (both views stacked absolutely, one in as the
  other out) + subtle directional scale = a gentle zoom. NOT `mode="out-in"` (that flashed the dark bg
  and delayed the board mount so `fitPage` missed). **Stopgap** — see graduation requirement.

## Gotchas / limitations (known, accepted for the POC)

- **Vue Flow geometry gotchas (cost us v32 — found by reproducing headless).** Two traps, both "you're
  reading the wrong element":
  - **The node wrapper `.vue-flow__node` is SMALLER than our card.** Our card (`.spike-block-node`,
    sized `footprint × base`, `overflow-visible`) overflows its Vue Flow node wrapper — the wrapper's
    measured width can be a fraction of the card's. Any hit-testing of the panes (reorder slot detection,
    detach margin, the edit-open origin rect) MUST measure against `.spike-block-node`, not
    `.vue-flow__node`, or every in-card point reads as "outside". (They share the same LEFT edge, which is
    why detach still worked while reorder couldn't — reorder needs the WIDTH.)
  - **The zoom transform is on `.vue-flow__transformationpane`, not `.vue-flow__viewport`.**
    `.vue-flow__viewport` reads `transform: none` → identity → `z=1`. Pinch math read that and never
    actually zoomed. Read `.vue-flow__transformationpane` for the live `translate()…scale()`.
  - **Fit must use known geometry, not `fitView`.** `fitBoard`/`fitPage` frame via `fitBounds` over the
    union of each node's `position + sizeOf` — Vue Flow's own `fitView` (and its controls' ⛶) measure
    the small wrapper and zoom INTO the oversized card. (The Site flow's normal-sized cards are fine, so
    the VF ⛶ is left enabled there.)
- **Overlays must match the RENDERER's sizing (`defaultSize`), not footprint.** The wiggle/pull faces +
  reorder slot bounds (`panes` in SpikeBlockNode) are positioned along the split axis by each child's
  `defaultSize` % — the same value the renderer feeds reka's splitter panels. Footprint (cols/rows) was
  wrong: a spacer beside a dense grid renders 50/50 but footprint said ~1:4, so the faces drifted off
  the panes (#953, IMG_1061/1062). Any overlay drawn over the rendered layout has to use the renderer's
  own sizing source.
- **Hit-test the RENDERED panes, never the abstract tree.** Anything that maps a screen point to a pane
  (the edit view's block selection + dim overlay) must measure the real DOM (`.croutonpane` leaf
  elements), because the renderer reflows panes via CSS `@container` (a horizontal split STACKS
  vertically when narrow) — a reflow the `LayoutTree` never reflects. Tree-derived regions select the
  wrong pane at narrow widths. SpikeFocusShell reads the innermost `.croutonpane` els in document order
  and maps them to the tree's depth-first leaf order; falls back to tree regions when counts differ
  (panes collapsed into the gutter). Clean fix on graduation: have the renderer tag each leaf with
  `data-block-id` so the mapping is by id, not order. (#952, IMG_1059)
- **Pinch uses `setCenter`, not `setViewport`.** Vue Flow exposes `setCenter`/`fitBounds`/`fitView`
  here, not `setViewport`, so pinch is reconstructed from the live transform. Clean fix: expose
  `setViewport` from `crouton-flow`.
- **FLIP for structural reflow lives in the package** (`@fyit/crouton-layout`, `useLayoutFlip`, #943):
  panes are keyed by index so a count change rebuilds them — a CSS `flex-grow` transition can't fire.
  `useLayoutFlip` measures-before / tweens-from-old-box, purely additive (no key/size/reka change),
  survivors matched by a structure-derived `contentKey`.
- **`fitOverview` is dead code** — superseded by center-on-add; remove on next cleanup.
- **POC block components must be registered GLOBALLY.** `CroutonLayoutRenderer` resolves a leaf's block
  via `<component :is="block.component">` (a runtime string), which only resolves globally-registered
  components. Nuxt's per-file auto-import (`<SpikeSpacer/>`) does NOT make the name resolvable that way,
  so a POC block component renders as a dead `<spikespacer>` element. `app/plugins/spike-global-blocks.ts`
  registers `SpikeSpacer` + `SpikeGhostPane` on `vueApp` so the registry's `component:'…'` resolves.
  (Package block components like `CroutonLayoutSpikeStats` are already global.) Add any new POC block
  component there.
- **Spacer block (#952):** `spacer` → `SpikeSpacer`, a registered layout primitive that renders empty
  space (faint dashed hint in the builder). Add it from the palette; it snaps/reorders/resizes like any
  block to push neighbours around or hold a gap. Small `minWidth` (40) so it can be a thin gutter.

## Tooling — per-version preview URLs (#940)

Each iteration can get its OWN immutable Cloudflare Workers preview URL so versions can be opened
side-by-side, WITHOUT overwriting the live `crouton-builder-demo.pmcp.dev`. Run the **Deploy POCs**
workflow with `mode=version` (default `deploy` unchanged) → `pnpm run cf:version`
(`wrangler versions upload`) prints the preview URL (`<version-id>-crouton-builder-demo.<account>.workers.dev`)
into the run summary. Caveats: preview URLs are on `*.workers.dev` (not the custom domain); a version
**shares the same D1/KV** as the live Worker (same data, different code); needs a one-time Cloudflare
dashboard enable of the worker's **workers.dev subdomain + Preview URLs**. (Linking these URLs into the
in-app changelog so the `vNN` chip jumps between versions is a follow-up.)

## 🎓 Graduation requirements (must hold in the real package + app)

- **The agent ⇄ human round-trip (the North Star — see top).** The graduated builder is the visual
  front-end to an issue-tracked, agent-executed layout spec:
  - **Serialise the board to a clean, diffable `LayoutTree`** (layouts → blocks → splits/sizes/
    breakpoints) — the canonical interchange format both the agent and the builder read/write. (The model
    already exists; what's needed is a stable, human-readable serialisation + the page-flow tree around it.)
  - **Persist a version back to the GitHub ticket.** A human's edited layout saves onto the tracking
    issue as the **command/spec** for the agent to (re)build from — so "a version in the builder" becomes a
    concrete instruction on the ticket. Round it both ways: agent writes the tree → human edits visually →
    edit posts back → agent reads it. (Mirrors the existing `schema-review` / `ui-proposal` sign-off loops,
    but the artifact under review is the layout tree.)
  - This is the whole point of the builder — it's not a standalone design toy, it's the human's seat in an
    AI app-generation pipeline (crouton collections → graph/charts blocks → layout-engine pages → app).


- **Make page ⇄ flow REAL routing, not one view.** Today `/spike-app` is one route and `selectedPageId`
  `v-if`/`v-else`-swaps with a cross-fade — a *visual* transition pretending to be navigation. The real
  builder is **pages that link to each other** = a router. Graduated version:
  - **URL per view** — `/builder` = Site flow, `/builder/[pageId]` = that page's board (deep-linkable).
  - **Real history** — browser back/forward (back from a page → the flow).
  - **Inter-page linking** — page-to-page is a plain route link.
  - **Transition via the View Transitions API (shared-element morph)** — matching `view-transition-name`
    on the flow's page card and the page board so the card **grows into** the board and shrinks back.
    The current cross-fade is explicitly the stopgap.
  - Cost: lift the shared board state, move the board into `[pageId].vue`. Nothing in the spike is
    wasted (board, snapping, ghost/ease-apart, FLIP, pinch, add-block all carry over).
- **Backfill test-first coverage** for the genuine logic when it lands in `packages/*` (the #774 gate
  is off for `pocs/*`, on for `packages/*` — graduation is where the tests get written).
- **Multiplayer + collaborative undo via `crouton-collab` (Yjs).** `crouton-flow` already extends
  `crouton-collab`; the spike runs Vue Flow in *ephemeral, non-synced* mode. The graduated builder
  should be able to **"build together"** — sync the board through a `CollabRoom` (a `flowId` + the
  synced data mode + presence, all infra that already exists). When it does, **undo must switch to
  `Y.UndoManager`** (per-user transaction undo) — the POC's whole-board snapshot stack is a
  *single-user placeholder* that would clobber other people's edits in a shared session.
