# CLAUDE.md — E2E Test Harness

End-to-end smoke tests that prove a **real generated crouton app** still boots,
authenticates, and does CRUD. Run them when bumping dependencies or changing
crouton packages — if a consuming app would break, this catches it.

## Layout

```
e2e/                         # the harness (Playwright) — NOT a workspace package
  playwright.config.ts       # config; targets a fixture, sets up projects + webServer
  helpers.ts                 # shared, non-test module (config, auth flow, manifest loader)
  auth.setup.ts              # 'setup' project: log in / register + create team, save state
  collection.smoke.spec.ts   # generic, manifest-driven list + CRUD checks
  .auth/                     # generated storageState + team slug (gitignored)

fixtures/                    # the apps under test — real crouton apps, one per config
  minimal/                   # core + auth + i18n, one 'items' collection
  with-pages/                # + @fyit/crouton-pages
  <name>/                    # add more here
    e2e.manifest.json        # declares what to smoke (collections, fields)
```

> ⚠️ Fixtures live in `fixtures/`, **not** `tests/`: pnpm hardcodes ignoring
> `test/` and `tests/` directories during workspace discovery, so a fixture app
> there would be silently invisible (`pnpm --filter` finds nothing).

## Running

```bash
pnpm test:e2e                      # default fixture (minimal)
E2E_FIXTURE=with-pages pnpm test:e2e
```

The config's `webServer` boots `pnpm --filter e2e-fixture-$E2E_FIXTURE dev` on
`:3000` (or reuses a server already running there). One fixture per run — they
all use port 3000. Each fixture has its own local sqlite DB under `.data/`.

## How it works

1. **setup** (`auth.setup.ts`) runs first: logs the test user in (registering on
   first run), ensures a team exists, saves `storageState` → `.auth/user.json`
   and the team slug → `.auth/team.json`.
2. **chromium** runs `*.smoke.spec.ts` with that storageState. The generic spec
   reads the active fixture's `e2e.manifest.json` and, for each collection, checks
   the list page loads and runs a create → see-in-list → delete cycle.

### crouton-auth realities the harness depends on
- Login/register happen in a **RouteModal overlay**, not a form page.
  `/auth/login` redirects to `/` and opens the modal (`useAuthModal`).
- **Signup creates no team.** We create one via the better-auth org API
  (`POST /api/auth/organization/create` + `/set-active`), which **requires an
  `Origin` header** (CSRF) — see `ensureTeam()`.
- Generated collections render at `/admin/{teamSlug}/crouton/{collectionKey}`
  (e.g. `mainItems`).

## Adding a new fixture

```bash
# 1. Scaffold (outside tests/!). Pick the packages to exercise.
node packages/crouton-cli/bin/crouton-generate.js init with-i18n --features i18n --noCf
#    add an items collection (copy fixtures/minimal/schemas + crouton.config.js), then:
cd apps/with-i18n && node ../../packages/crouton-cli/bin/crouton-generate.js config

# 2. Relocate + rename
mv apps/with-i18n fixtures/with-i18n
#    set package.json "name": "e2e-fixture-with-i18n"

# 3. Declare what to smoke
cat > fixtures/with-i18n/e2e.manifest.json <<'JSON'
{ "collections": [ { "key": "mainItems", "heading": "Main Items", "create": { "name": "e2e item" } } ] }
JSON

# 4. Register + run
pnpm install
E2E_FIXTURE=with-i18n pnpm test:e2e
```

`fixtures/*` is already a workspace glob, so step 4's install picks it up.
**No new test code** — the generic spec covers any fixture via its manifest.

### Manifest format
```jsonc
{
  "collections": [
    {
      "key": "mainItems",          // route segment + registered config key
      "heading": "Main Items",      // visible list heading to assert
      "create": { "name": "e2e item" }  // text field label/name -> value; omit to skip CRUD
    }
  ]
}
```

## Gotchas
- **Module format:** repo root is CommonJS, and Playwright 1.57 transpiles
  config/specs to CJS — use `__dirname`/`join`, **not** `import.meta.url`
  (it forces ESM output → "exports is not defined").
- **Specs can't import test files** (Playwright rule) — shared constants like
  `TEAM_FILE` live in `helpers.ts`, not `auth.setup.ts`.
- **Cold dev-server compile:** first hit on a route/modal compiles on demand, so
  auth + first navigation use generous (~30s) timeouts. Keep them.
- Fixtures are throwaway: `.data/`, `.auth/`, `playwright-report/`,
  `test-results/` are all gitignored.

## Scope / follow-ups
Current: list + CRUD per collection. Not yet: package-specific surfaces (e.g. the
pages package's own admin UI) — extend the manifest with a `surfaces` field when
needed. CI wiring is tracked separately (see the harness epic).
