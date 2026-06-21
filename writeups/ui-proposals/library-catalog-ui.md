# UI Proposal: Library Catalog browse/search/detail polish

Changes proposed for issue #569 — refine the generated scaffold UI for the library-catalog POC.

## What changes

- **Books list header.** Title changes from `LibraryCatalogBooks` to `Books`; ISBN column removed; title+author merged into one cell with cover thumbnail; `copiesAvailable/copiesTotal` shown as an availability badge (green = available, red = none available).
- **Books search bar.** A text filter input added above the table; filters by title or author name client-side using existing composable data, no new API endpoint.
- **Book detail page.** Cover image rendered (CroutonImage); author name as a navigable link (not raw CroutonItemCardMini); genre tag badge; richtext description via CroutonEditorPreview; inline loan history section showing all loans for this book.
- **Loans list — computed status.** A new computed `status` column: `returned` when `returnedAt` is set, `overdue` when `dueAt` < today and not returned, `active` otherwise. Badge coloured green/red/muted. Due date cell highlighted red for overdue rows.
- **Authors list.** Initial avatar (first letter of name), birth year subline, book count badge. Bio column replaced by avatar+meta row layout; bio visible in the detail slide-over.
- **Genres grid.** Two-column card grid replaces the plain table; each card shows name + book count. Genre detail navigates to a filtered books view for that genre.

## What stays the same

- All changes are in `pocs/library-catalog/layers/library-catalog/collections/*/app/components/` only.
- No schema changes, no new API routes, no `packages/` edits.
- Auth and CRUD forms (the `_Form.vue` files) are untouched.
- The crouton scaffold structure and composables are preserved; only List.vue components are refined.
