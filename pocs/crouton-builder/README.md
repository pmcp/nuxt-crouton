# crouton-builder

The graduated **Crouton Builder** (#988) — the consuming app for `@fyit/crouton-layout`'s
editable renderer, serialisation, and ticket codec. Rebuilt clean from
`pocs/crouton-builder-demo` (not ported), with **real routing** and the **View Transitions**
shared-element morph.

## Run

```bash
pnpm --filter crouton-builder dev   # http://localhost:3011
```

## Routes

- `/builder` — **Site flow**: the app's pages as a wireable sitemap; each card deep-links to its
  board and carries a `view-transition-name` matching it (the card grows into the board).
- `/builder/[pageId]` — **board**: compose the page's `LayoutTree`.
  - `CroutonLayoutEditableRenderer` owns the pane handles — drag a grip to **reorder**, or out to **detach** (#985).
  - The **palette** places a block beside the hovered pane via `applyPaneDrop` (#985).
  - **Preview** renders read-only, **hug-aware** (#986 — a Top bar / nav is a short bar inside the split).
  - **Post layout** round-trips the serialised `LayoutDocument` onto a GitHub issue (#974).

## The five `data-handoff` hooks (reproduced verbatim)

`page-badge` · `region-pill[data-region]` · `floor-readout[data-hard-floor/data-soft-floor]` ·
`snap-guide[data-armed]` · `ghost-pane` — so one exploratory agent runs identically on the POC and here.

## Round-trip (#974)

`POST /api/builder/post-layout { document, issue }` formats via the package's `formatLayoutComment`
and posts to GitHub when `NUXT_GITHUB_TOKEN` is set (repo = `NUXT_PUBLIC_BUILDER_REPO`); otherwise it
returns the comment body to paste by hand.

## Status / deferred

MVP slice of #988. **Deferred** (POC board gestures, follow-up): snap-to-merge dwell-arm, the
dwell-ghost ease-apart, pinch-zoom, the free Vue-Flow Site canvas, multiplayer (`crouton-collab` /
Yjs undo). The durable contract (the package) is the graduation win; this app proves it consumes
cleanly with zero POC shims.
