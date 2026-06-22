# UI proposal — mobile collection viewer: single header (#691)

Inline-comment any line below to request a change. Reply `lgtm` / `approve` when satisfied.

## What changes (and what doesn't)

- **One header on mobile.** The two stacked bars merge into a single row: collection name once, then the layout-switcher menu, Import, and Create as compact icon buttons.
- **Actions become icons.** "Importeren" / "Aanmaken" labels drop on phones (icon-only); they keep their labels on desktop.
- **Mechanism.** `CroutonTableHeader`'s navbar hides below `sm`; `CollectionViewer` renders the import/create icons in its own header row, beside the switcher menu, on mobile only.
- **Desktop untouched.** All changes are `sm`-gated — the two-bar layout, full labels, and inline switcher stay exactly as they are at `sm+`.

## Open question for the reviewer

- The single mobile bar shows **layout · import · create**. Is that the right set/order, or do you want **export** in there too (it's currently desktop-only and needs the row data)?
