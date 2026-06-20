# Library Catalog POC — UI proposal

Issue #471 · Epic #453 · After-only (net-new UI over the bare generated scaffold)

## What changes

- Book browse replaces bare table. Card grid with cover placeholder (book-icon SVG, replaced by real `coverImage` when present), availability badge (green/amber/red by `copiesAvailable`), title search, genre filter chips.
- Book detail adds hero, richtext, author chip, availability boxes. Cover thumbnail, richtext description via `CroutonEditorPreview`, linked author section (avatar initials + name + year born + book count), 3-box availability summary, inline Borrow CTA.
- Author detail shows bio and books list. Avatar initials, bio text, born/died years, scrollable grid of that author's books with availability badges and View links.
- Loan form: borrow + return flows. Borrow: modal/slide with book summary, borrower name, borrowed-at + due-at date fields, confirm action. Return: active-loans list with overdue highlight (red), active (blue), returned (dimmed green) states; inline Return button sets `returnedAt`.
- Scope. All changes land in `pocs/library-catalog/app/`. Generated admin tables (`CroutonCollection`) remain unchanged — these are new browse/public-facing pages layered on top. No `packages/` changes.

## Surfaces

1. `/books` — card grid browse (title search + genre filter chips)
2. `/books/[id]` — book detail (hero, richtext, author chip, availability counters, Borrow CTA)
3. `/authors/[id]` — author detail (bio, initials avatar, books-by-author list)
4. `/loans` — active loans list with overdue/active/returned states + Return action
