# UI proposal — renderer-owned pane handles (#985)

Static mockup: `editable-renderer-pane-handles.html` → `.png`. Live deploy skipped — packages-only
change, no runnable app yet (#988 brings the consuming app). The running v52 POC is the visual ground
truth; this is an **architecture move, not a redesign**.

Inline-comment any line below to request a change. Reply `lgtm` / `approve` to unblock the build.

## What changes

- **The renderer gains an editable mode.** Each rendered pane carries its own grab-handle
  (wiggle / reorder / detach) and a stable `data-pane-id`; the consumer no longer paints a separate
  overlay layer over the card.
- **The overlay-drift bug class is gone.** Handles ride their panes through every reflow / `@container`
  stack / min-width clamp / responsive resize — so the POC's v49/v51 measure-and-clamp machinery is
  *deleted*, not ported. A `pointerdown` on a grip already knows its own `data-pane-id` / `NodePath`;
  no point→pane mapping, no clamp pass.
- **Detach uses a throwaway floating proxy** only during the pull (the one case a pane must leave its
  slot); reorder stays in-place (the green "Move here" slot).
- **The five `data-handoff` hooks are reproduced verbatim** so one exploratory agent runs identically
  on the POC and the graduated app:
  - `snap-guide` (+ `data-armed` — soft blue → dwell-armed green)
  - `ghost-pane` (the ease-apart placeholder matching the dragged footprint)
  - `page-badge` (the ★ node that is "the page")
  - `floor-readout` (+ `data-hard-floor` / `data-soft-floor` — the selected composite's derived floor)
  - `region-pill` (+ `data-region` — pinned top / bottom)
- **Look is the POC's proven look.** Resting panes stay node-draggable; the green primary stays the
  snap/reorder signal.

## Scope / non-goals

- This gate covers the **rendered-pane handles** (the visual core). The pure transforms it rides on
  (`insertAtPath` / `applyPaneDrop`) are already merged (test-first, #774, this branch).
- The renderer honouring `hug` **inside a split** is the separate UI half of #986 — proposed next.
- Multiplayer / collaborative undo (Yjs) stays deferred (HANDOFF graduation requirement, not #985).
