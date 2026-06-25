# Layout-collapse concept gallery — *think game UX, not SaaS*

A gallery of **wild** pane collapse / switch concepts for the `crouton-layout`
engine. The shipped style is `gutter-tabs` (#852): a collapsed pane leaves the
splitter and hangs as a vertical tab in a right gutter. `LayoutCollapseStyle`
(`packages/crouton-core/app/types/layout.ts`) reserves two more undesigned slots
(`header-toggle`, `icon-rail`). This is the dream-pile we pick the *real* next
styles from.

Each concept is a standalone, throwaway HTML mock in
[`mocks/`](./mocks/) — open any one and **click** to play the motion. Every mock
is driven by a single `render(t)` timeline (`t=0` expanded → `t=1` collapsed),
so you can freeze any frame with `?t=0.4` (that's how the screenshots below were
captured). Images live in the gitignored `screenshots/` dir at the repo root.

> **The lens for "fit":** a pane is a box of arbitrary size in a *tree* of splits.
> The two questions that matter for promotion are **(a) does it survive in a
> narrow pane?** (the `@container` hard rule) and **(b) does it map to a *node in
> a tree*, or only to the whole screen?** A concept that needs the full viewport
> is a fun toy; a concept that works on *any leaf at any size* is shippable.

---

## 1 · HUD Dock
**Metaphor:** collapsed panes fly to the screen edges and become a health / ammo
/ radar HUD.
**Motion:** satellite panes slide flush to the left/right walls and the floor,
narrowing into glowing status bars; the main canvas brightens so the HUD pops.
Restore peels them back off the wall into full cards.

| Expanded | Collapsed |
|---|---|
| ![](../../screenshots/01-hud-dock-expanded.png) | ![](../../screenshots/01-hud-dock-collapsed.png) |

**Fit:** *Screen-level.* The "edges" are the viewport's, not a pane's — it frames
the whole layout, not a node in a tree. Gorgeous for a top-level dashboard shell,
but it doesn't generalize to an arbitrary leaf. Narrow-pane viable (bars are
tiny), but the metaphor wants the whole screen. **Toy / shell, not a tree style.**

## 2 · Weapon Wheel
**Metaphor:** a radial weapon wheel — closed panes orbit a hub; flick one out to
deploy it full-size.
**Motion:** panes collapse *inward*, shrinking into wedges that orbit a central
"Panes" hub with a sweeping conic glow. Restore flings the chosen wedge back out
into a full card.

| Expanded | Collapsed (orbiting) |
|---|---|
| ![](../../screenshots/02-weapon-wheel-expanded.png) | ![](../../screenshots/02-weapon-wheel-collapsed.png) |

**Fit:** *Screen-level switcher.* Brilliant as a global "jump to pane" overlay
(hold a key → wheel → flick), but it's a launcher, not a per-node collapse. Doesn't
nest. **Keep as a command-palette-style overlay, not an enum collapse style.**

## 3 · CRT Power-Down  ⭐
**Metaphor:** an old CRT TV switching off — picture snaps to a white-hot line,
then pinches to a dot.
**Motion:** in a 2×2 tree, **one** leaf powers down in place: `scaleY` crushes it
to a blazing phosphor line, then `scaleX` pinches the line to a dot that fades to
a clickable standby `●`. Restore blooms the dot back into a line and boots the
picture open. The other three panes stay lit — it's clearly a *per-pane* action.

| Expanded | Mid (phosphor line) | Collapsed (standby dot) |
|---|---|---|
| ![](../../screenshots/03-crt-power-down-expanded.png) | ![](../../screenshots/03-crt-power-down-mid.png) | ![](../../screenshots/03-crt-power-down-collapsed.png) |

**Fit:** *Tree-native & size-agnostic.* Collapses to a **dot** regardless of pane
size, so it survives in the narrowest pane trivially. The standby dot is the
restore affordance, in place. Pure node-in-a-tree behaviour. **Top pick.**

## 4 · Card Deck
**Metaphor:** a hand of playing cards — collapse shuffles the panes into a fanned
stack at the bottom edge.
**Motion:** big face-up cards sweep down, shrink, and gather into an overlapping
fanned hand; a `rotateY` flip shows the card edges mid-deal. Restore deals them
back out face-up.

| Expanded | Collapsed (fanned hand) |
|---|---|
| ![](../../screenshots/04-card-deck-expanded.png) | ![](../../screenshots/04-card-deck-collapsed.png) |

**Fit:** *Screen-level.* The fanned hand wants the bottom of the whole screen and
gets cramped/small at pane scale. Delightful as a "minimized panes tray" for a
top-level workspace; weak as a per-leaf style. **Tray, not tree.**

## 5 · Inventory Grid
**Metaphor:** a Diablo/Tetris backpack — panes shrink and snap into footprint-sized
slots (1×1, 2×1, 2×2) on a pixel grid, with rarity-colored borders.
**Motion:** each pane flies into the bag and snaps onto its grid cells with a tiny
settle; an always-docked inventory panel shows them packing in.

| Expanded | Collapsed (packed bag) |
|---|---|
| ![](../../screenshots/05-inventory-grid-expanded.png) | ![](../../screenshots/05-inventory-grid-collapsed.png) |

**Fit:** *Semi screen-level.* The shrink-to-slot is per-pane, but it needs a
persistent inventory panel to hold the slots (real estate cost). Wonderful for a
"stash" of many minimized panes; the rarity border is a free way to encode pane
type. **Great minimized-tray variant; the bag itself is screen furniture.**

## 6 · Iris Portal  ⭐
**Metaphor:** a camera shutter / sci-fi portal — the pane is swallowed by an iris
of angular blades closing to a glowing seed.
**Motion:** content clips from `circle(150%)` → `circle(0%)` while 8 mechanical
blades rotate and converge inward and a core seed intensifies. Restore irises it
back open. Sits on the primary pane of a small tree; the side panes hold steady.

| Expanded | Mid (half-iris) | Collapsed (seed) |
|---|---|---|
| ![](../../screenshots/06-iris-portal-expanded.png) | ![](../../screenshots/06-iris-portal-mid.png) | ![](../../screenshots/06-iris-portal-collapsed.png) |

**Fit:** *Tree-native & size-agnostic.* The iris closes to the pane's own center,
so it works at any size and leaves a tiny portal seed as the restore handle. The
most *cinematic* of the in-place collapses. **Top pick.**

## 7 · Spring Drawer  ⭐
**Metaphor:** a physics-y spring-loaded loot drawer that overshoots and settles.
**Motion:** a side pane *slams* shut into a thin labeled spine flush with the
edge, overshooting past closed then ringing back to rest; restore springs open
past its target width and settles (damped sine, computed inside `render(t)`, with
a speed-keyed squash/blur). The overshoot is the juice.

| Expanded | Mid (overshoot) | Collapsed (drawer spine) |
|---|---|---|
| ![](../../screenshots/07-spring-drawer-expanded.png) | ![](../../screenshots/07-spring-drawer-mid.png) | ![](../../screenshots/07-spring-drawer-collapsed.png) |

**Fit:** *Tree-native & the most directly shippable.* This is `gutter-tabs`' grown-up
sibling: any split child collapses to a thin edge **spine** — viable in any narrow
pane (a spine is ~28px) and maps to a tree without an overlay. All it adds over
today's shipped style is *physics*. **Top pick (lowest-risk to promote).**

## 8 · Fog of War
**Metaphor:** RTS fog-of-war — the pane gets re-shrouded; a roiling fog conceals
it, leaving a ghost silhouette and a `?`.
**Motion:** a radial `mask-image` reveal drives two drifting cloud layers from
"fully explored" (t=0) to "full shroud" (t=1); a scout flare pulses at the reveal
origin as it burns away.

| Expanded | Mid (burning away) | Collapsed (shrouded) |
|---|---|---|
| ![](../../screenshots/08-fog-of-war-expanded.png) | ![](../../screenshots/08-fog-of-war-mid.png) | ![](../../screenshots/08-fog-of-war-collapsed.png) |

**Fit:** *Conceals but doesn't reclaim space.* It's a stunning *reveal*
transition, but a fogged pane still occupies its slot — collapse usually means
"give the space back." Best repurposed as the **restore/reveal** animation (fog
burning off when a pane re-opens) rather than the collapse itself. **A
transition, not a collapse.**

## 9 · Cartridge Deck
**Metaphor:** retro game cartridges — a pane ejects as a chunky labeled cart and
drops into a rack of other carts; slam one back in to re-load.
**Motion:** the active pane pops out of a ridged console slot, tumbles, and parks
as a tactile spine in a side rack (notches, label, ribbing). Restore yanks a cart
and slots it back.

| Expanded (loaded) | Collapsed (ejected to rack) |
|---|---|
| ![](../../screenshots/09-cartridge-deck-expanded.png) | ![](../../screenshots/09-cartridge-deck-collapsed.png) |

**Fit:** *Rack is screen furniture.* The eject motion is fantastic and very
tactile, but it needs a persistent rack + a "console" framing. Closest cousin to
`gutter-tabs` (the rack *is* a gutter) with way more personality — but heavier.
**A juicier gutter, at the cost of a permanent rack.**

## 10 · Magnetic Snap  ⭐ (runner-up)
**Metaphor:** the pane is magnetically *yanked* to a docking rail with an elastic
recoil.
**Motion:** the pane accelerates toward a glowing +/- dock socket, stretches along
the travel axis (squash/stretch keyed to speed), then snaps flush with a small
recoil and condenses into a dock chip; field lines intensify as it locks in.
Restore un-sticks and rubber-bands back out.

| Expanded | Mid (pulled, field lines) | Collapsed (docked chip) |
|---|---|---|
| ![](../../screenshots/10-magnetic-snap-expanded.png) | ![](../../screenshots/10-magnetic-snap-mid.png) | ![](../../screenshots/10-magnetic-snap-collapsed.png) |

**Fit:** *Tree-native, same structural model as the shipped gutter.* It's
`gutter-tabs` reframed as a magnetic dock rail — collapsed panes become chips on a
rail, exactly like today, but with snap physics + field-line feedback. **Strong,
low-risk; nearly a drop-in juice upgrade for the existing gutter.**

## 11 · Rolodex Spin
**Metaphor:** a Rolodex / 3D card drum — panes mounted on a rotating cylinder;
only the front one faces you.
**Motion:** the drum rolls the front pane up-and-back on a `perspective` cylinder
and brings the next one forward; side panes are foreshortened and dim, the front
one big and bright.

| Front pane (t=0) | Mid-roll (drum turning) |
|---|---|
| ![](../../screenshots/11-rolodex-spin-expanded.png) | ![](../../screenshots/11-rolodex-spin-mid.png) |

**Fit:** *A switcher for a tabbed leaf, not a collapse.* This is the best answer to
"one pane slot holds several blocks, switch between them" — a 3D tab. Self-contained,
narrow-pane viable. Doesn't free space (it's a switch, not a collapse). **Promote
as a *tab/switch* style, parallel to the collapse enum.**

## 12 · Minimap Zoom
**Metaphor:** an RTS minimap — the map pane shrinks into a live thumbnail pinned in
a corner; neighbors reflow to claim the freed space; zoom back on demand.
**Motion:** the primary pane scales down to a rounded corner minimap (viewport
rect, blips, `▲N` marker) while the side panes expand to fill the gap.

| Expanded (full map) | Collapsed (corner minimap) |
|---|---|
| ![](../../screenshots/12-minimap-zoom-expanded.png) | ![](../../screenshots/12-minimap-zoom-collapsed.png) |

**Fit:** *Per-pane shrink, but the destination is a screen corner.* The "stays
**live** while tiny" idea is special — unlike every other collapse, the content
keeps rendering. Best for a *map/canvas* block specifically. Narrow viable, but the
corner is screen-level. **Niche-but-magic for spatial/canvas panes.**

---

## Top 3 to promote into `LayoutCollapseStyle`

The enum is about *collapsing a node in a tree*, so I weighted **tree-native +
narrow-pane-viable** over spectacle. The three below are each a **distinct motion
family** (shrink-to-dot · edge-spring · center-iris), so they don't overlap, and
all three work on *any leaf at any size* with no full-viewport overlay.

1. **`spring-drawer` (#7) — promote first; lowest risk.**
   It's literally `gutter-tabs` with physics: a split child collapses to a thin
   edge spine, no overlay, maps to the tree we already render, and the spine is
   trivially `@container`-safe in a narrow pane. We get a huge juice win for
   almost no structural change — the overshoot/settle lives entirely in the
   easing. This is the one to ship next.

2. **`crt-power-down` (#3) — the in-place, size-proof collapse.**
   Collapses to a **dot** no matter how small the pane is, which makes it the
   single most robust option for deep/narrow trees where even a spine is tight.
   The standby `●` is a self-evident restore handle, in place, no gutter needed.
   The boot-up restore is pure delight and screenshots beautifully.

3. **`iris-portal` (#6) — the cinematic in-place collapse.**
   Same tree-native, size-agnostic profile as CRT (closes to the pane's own
   center → a seed) but a completely different, *mechanical* motion. Gives us a
   "premium" feel option distinct from the utilitarian spring-drawer. Pairs
   naturally with **Fog of War (#8) as the *restore* reveal** if we want an
   even richer open.

**Honorable mentions / parallel tracks**
- **`magnetic-snap` (#10)** is the strongest runner-up — structurally identical to
  the shipped gutter (chips on a rail) but with snap physics. If we'd rather
  *upgrade the existing gutter* than add an in-place style, promote this instead
  of (or alongside) spring-drawer.
- **`rolodex-spin` (#11)** belongs to a *different* enum — a **tab/switch** style
  for a leaf that hosts multiple blocks, not a collapse. Worth its own
  `LayoutSwitchStyle`.
- **`minimap-zoom` (#12)** is niche-magic: the only "stays live while collapsed"
  option. Reserve it for *canvas/map* blocks specifically.

*Mocks: [`writeups/ui-proposals/mocks/`](./mocks/) — click to play. Frames frozen
via `?t=0..1`. Screenshots in the repo-root `screenshots/` dir.*
