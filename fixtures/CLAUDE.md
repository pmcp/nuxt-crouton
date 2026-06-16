# CLAUDE.md — E2E Fixtures

**These are throwaway apps under test, not real products.** Each `fixtures/<name>/`
is a real, generated crouton app wired to a different set of packages, booted by
the Playwright harness in `e2e/` to prove a consuming app still **boots,
authenticates, and does CRUD** after a `packages/` change or dependency bump.

| Fixture | Exercises |
|---------|-----------|
| `minimal` | core + auth + i18n, one `items` collection (generic CRUD + locale-switch) |
| `with-pages` | + `@fyit/crouton-pages` → `@fyit/crouton-editor` (pages workspace surface) |
| `with-bookings` | + `@fyit/crouton-bookings` (bookings admin surface) |
| `with-assets` | + `@fyit/crouton-assets` (asserts the optional `CroutonAssetsPicker` mounts, not the core stub) |
| `with-collab` | + `@fyit/crouton-collab` (spike: asserts the realtime collab UI mounts single-client) |

## What you need to know

- **Don't deploy these** and don't treat them as examples to copy — they exist
  only to be booted by the e2e harness. They're throwaway: each fixture's
  `.data/`, `.auth/`, `playwright-report/`, `test-results/` are gitignored.
- **To change what gets smoked, edit the fixture's `e2e.manifest.json`** — it
  declares the collections to CRUD and any package `surfaces` to assert. The
  shared specs in `e2e/` read it; you almost never write test code per fixture.
- **They live in `fixtures/`, not `tests/`**, on purpose: pnpm ignores `test*/`
  during workspace discovery, so a fixture there would be invisible to
  `pnpm --filter`.
- **They're kept out of `apps/`** so they're never deployed or swept by app
  typecheck.

## Where the real docs are

The harness, the manifest format, the crouton-auth realities the smoke depends
on, the recipe for **adding a new fixture**, and the gotchas all live in
**`e2e/CLAUDE.md`** — read that before editing a manifest or adding a fixture.
To *run* the smoke, use the **`e2e-smoke` skill** (`.claude/skills/e2e-smoke/`).
