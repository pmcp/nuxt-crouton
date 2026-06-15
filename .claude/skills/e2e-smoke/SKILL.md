---
name: e2e-smoke
description: Run the Playwright fixture smoke harness to prove a real generated crouton app still boots, authenticates, and does CRUD after a dependency bump or package change. Use when asked to "smoke test", "run e2e", "verify against a fixture", or to check that a packages/ change doesn't break consuming apps.
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion
---

# E2E Smoke — fixture harness runner

Boots a **real generated crouton app** (`fixtures/<name>`) and runs the
Playwright smoke (login/register → create team → per-collection CRUD → optional
package surfaces). This is the "did a packages/ change or dep bump break a
consuming app" check.

> **Reference, not this file:** the harness internals (manifest format, auth
> realities, adding a fixture, gotchas) live in **`e2e/CLAUDE.md`**. This skill
> is only about *running* it and reading the result. Read `e2e/CLAUDE.md` before
> editing the harness or a manifest.

## When to use
- After changing anything in `packages/` (especially `crouton-core`, `crouton-cli`, `crouton-pages`, `crouton-bookings`, `crouton-auth`).
- After a dependency bump / `pnpm.overrides` change (this is exactly what it's for — e.g. the tiptap 3.20 bump).
- When the user says "smoke test", "run the e2e", "check the fixtures", "verify nothing broke".

## Step 1 — Pick the fixture that exercises the change

One fixture per run (they all use port 3000). Match the change to the fixture
whose packages actually mount the affected code — booting `minimal` won't touch
pages/editor code.

| Fixture | Exercises | Use when you changed… |
|---------|-----------|------------------------|
| `minimal` | core + auth + i18n, one `items` collection | crouton-core, crouton-auth, crouton-i18n, generator core, generic CRUD |
| `with-pages` | + `@fyit/crouton-pages` → transitively `@fyit/crouton-editor`; surface = pages workspace (mounts `CroutonEditorBlocks` → the real tiptap editor) | crouton-pages, **crouton-editor**, tiptap deps |
| `with-bookings` | + `@fyit/crouton-bookings` (locations/settings/slots); surface = bookings admin | crouton-bookings, heavy domain-package scaffolding |

If unsure which fixture covers the change, grep the fixtures for the affected
component/package (`grep -rl '<Component>' fixtures/`) before guessing. If none
cover it, say so — the honest answer may be "no fixture exercises this; add one
(see `e2e/CLAUDE.md` → Adding a new fixture) or smoke a real app instead."

Use `AskUserQuestion` to confirm the fixture only if the change spans several or
the mapping is ambiguous; otherwise pick the obvious one and state it.

## Step 2 — Build the fixture's workspace deps (fresh checkout/worktree only)

The dev server loads the dist-consumed `@fyit/*` packages; on a clean tree they
aren't built yet. Build the fixture's transitive deps first (the `^...` excludes
the fixture app itself):

```bash
pnpm --filter "e2e-fixture-<name>^..." build
```

Skip this if you've been building/typechecking these packages this session and
they're already current. If the dev server errors with `Could not load '@fyit/crouton'`, this build is the fix.

## Step 3 — Run

**`BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are required** — without the secret,
crouton-auth refuses to mint sessions and `auth.setup.ts` fails with "Could not
authenticate test user." Any value works locally.

```bash
E2E_FIXTURE=<name> \
BETTER_AUTH_SECRET=dev \
BETTER_AUTH_URL=http://localhost:3000 \
pnpm test:e2e
```

- The config's `webServer` boots `pnpm --filter e2e-fixture-<name> dev` on `:3000`, or **reuses a server already running there** (so if a dev server is up on 3000, kill it or expect it to be reused).
- First run is slow: cold `nuxt dev` compiles routes/auth-modal on demand (timeouts are deliberately ~30s). Don't lower them; give the run up to ~3 min before suspecting a hang.
- Run in the background if it's long, and report when it returns.

## Step 4 — Read the result

- **Pass:** all `setup` + `*.smoke.spec.ts` projects green. Report which fixture, which collections/surfaces ran.
- **Fail:** Playwright writes a report to `playwright-report/` and traces/screenshots to `test-results/` (both gitignored). Open the report or read the failing spec's error. Distinguish:
  - *Auth/setup failure* → usually missing `BETTER_AUTH_SECRET`, or a stale `e2e/.auth/` (delete it and rerun).
  - *List/CRUD failure* → the generated collection or a package surface regressed — that's a real signal, investigate the app, not the harness.
  - *Boot failure* (`Could not load '@fyit/...'`) → Step 2 build was skipped/stale.
- If you captured any screenshot manually, it goes in `screenshots/` (repo root), never the app or root dir.

## Scope notes (set expectations honestly)
- The smoke proves **boot + auth + CRUD + surface render**. It does **not** deeply
  drive package UIs — e.g. `with-pages` confirms the editor *workspace mounts*
  under the current tiptap, but doesn't type into the editor. Say what a pass does
  and doesn't prove.
- A **type-only** fix (e.g. `ref`→`shallowRef`) is validated by `pnpm typecheck`,
  not by this smoke — don't claim the smoke covers it. The smoke's value for that
  PR is catching **runtime** fallout from the accompanying dep bump.
- To drive a surface deeper (type a block, assert content), extend the fixture's
  `e2e.manifest.json` `surfaces` or add a fixture — see `e2e/CLAUDE.md`. Editing
  the manifest/fixture is fine (they're in `fixtures/`, not `packages/`); editing
  the harness specs in `e2e/` is also outside the packages gate.
