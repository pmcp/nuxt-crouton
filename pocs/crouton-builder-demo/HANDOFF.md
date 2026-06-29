# Crouton Builder — handoff (living doc)

> **This is a LIVING handoff, curated to *current truth* — not a changelog.** Every time a design
> decision is **signed off** ("ok, this works"), capture it here. When we iterate *past* a decision,
> **edit/delete the superseded version** — this file should always read as *"this is how it should be
> built,"* never *"here's everything we tried."* It IS the brief the **`graduate`** skill consumes
> when this POC becomes a real package + app, so keeping it current means graduation starts written.
>
> Scope of this doc: the **Crouton Builder spike** (`/spike-app`, epic #907). (The app also hosts a
> throwaway `@fyit/crouton-three` demo at `/three` — see `README.md`; unrelated to the builder.)

## What it is

Build an app by composing a collection's blocks into a `LayoutTree`, visually, on a Vue Flow canvas.

**Two levels, one screen** ("Decision B" — a *Site* level added **on top of** the polished board, not
by porting the board into the old zoom shell):

- **Site = the page flow.** `CroutonFlowSiteFlow` renders pages as a wireable sitemap (cards = pages,
  lines = `parentId`). The view you land on.
- **Page = the board.** Double-click / ⤡ a page card → `enterPage()` loads that page's `LayoutTree`
  onto the Vue Flow board, where you compose blocks. `Pages ←` returns.

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

### Board gestures (direct manipulation)

- **Snap = two-stage dwell-to-arm (#941, #948).** Near a snap point → **soft** (blue, wide, pulsing).
  Hold ~0.6 s → **armed** (green, release-to-snap). The arm timer is keyed on the **target only**
  (not the exact seam), so finger jitter that flips the nearest seam doesn't reset it; the seam keeps
  tracking your finger. (No "release to snap" text — the green ring + guide bar say it.)
- **Insert *between* panes (Phase A).** Over a combined (split) layout, a card inserts between panes,
  not just onto an outer edge. Triggers on **≥35 % overlap** with the split (not centre-strictly-inside
  — a big card overlapping heavily used to match neither insert nor edge); seam picked from the centre
  **clamped** into the target.
- **Ghost mirrors the dragged item; panes ease apart to make room (#946/#947).** On an armed insert the
  target splices a **ghost skeleton with the dragged node's footprint** (every leaf → a dashed
  `__dropghost__` placeholder, splits/nested preserved) and renders that — a 2-row stack opens a *2-row*
  slot, growing the row to fit (not a flat 1×1 sliver). Real panes slide via the FLIP reflow; the card
  grows with a transition. Reverts on un-arm.
- **Detach** (board gesture): long-press a merged node → its panes **wiggle** (grabbable), then pull a
  pane — tracks your finger 1:1 (zoom-corrected), past a threshold detaches into its own node where you
  release, under it springs back. Cancel the wiggle by tapping outside / Esc / Done. Gating detach
  behind the hold is what stops a plain select-and-drag from detaching.
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

- **Pinch uses `setCenter`, not `setViewport`.** Vue Flow exposes `setCenter`/`fitBounds`/`fitView`
  here, not `setViewport`, so pinch is reconstructed from the live viewport transform. Clean fix:
  expose `setViewport` from `crouton-flow`.
- **FLIP for structural reflow lives in the package** (`@fyit/crouton-layout`, `useLayoutFlip`, #943):
  panes are keyed by index so a count change rebuilds them — a CSS `flex-grow` transition can't fire.
  `useLayoutFlip` measures-before / tweens-from-old-box, purely additive (no key/size/reka change),
  survivors matched by a structure-derived `contentKey`.
- **`fitOverview` is dead code** — superseded by center-on-add; remove on next cleanup.

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
