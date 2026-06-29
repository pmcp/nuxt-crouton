# UI proposal — hug inside a split (#986 UI half)

Static mockup: `hug-inside-a-split.html` → `.png`. The pure sizing contract (`sizingResolver` /
`deriveSizing` / the typed `sizing` field) is already merged (#986 pure half); this is the renderer
honouring it. Inline-comment any line below. Reply `lgtm` / `approve` to unblock the build.

## What changes

- **A pane hugs inside a split.** When a child's resolved sizing **along the split axis** is `hug`
  (vertical split → height, horizontal split → width), `CroutonLayoutRenderer` sizes it to content
  (`flex: 0 0 auto`) and lets the `fill` siblings share the remaining space — the POC's region-level
  hug (a short Top bar), now one level deeper, *inside* a composed split.
- **It reads the typed contract** already merged: `sizingResolver` / `deriveSizing` on
  `CroutonLayoutBlockDefinition` — the block decides, no per-instance control.
- **No drag handle between a hug pane and its neighbour** — you don't resize a bar that sizes to its
  content; the `fill` panes keep their splitter.
- **All-`fill` layouts are byte-for-byte unchanged.** The new path engages *only* when a split
  actually contains a hug pane along its axis; otherwise the existing reka `SplitterGroup` renders
  exactly as before (the 266-test surface is untouched).

## Implementation note (for the build, after sign-off)

- The split branch gains a `hasHugAlongAxis` check. False ⇒ the current reka `SplitterGroup` path,
  unchanged. True ⇒ a plain flex layout (mirroring the existing `shouldStack` fallback) where hug
  children are `flex: 0 0 auto` and fill children `flex: 1 1 0`, recursing through
  `CroutonLayoutRenderer`. The `@container` panes (`.croutonpane`) and min-width stacking are preserved.

## Non-goals

- Manual per-composite min/max override stays deferred (HANDOFF) unless derived floors prove
  insufficient.
- This is the last package piece of #986; **#988** (the consuming builder app) follows.
