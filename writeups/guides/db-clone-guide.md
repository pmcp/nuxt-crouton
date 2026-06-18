# db-clone — copy one D1 database into another

`scripts/db-clone.mjs` mirrors one of an app's Cloudflare D1 databases into
another of its environments: `prod → staging`, `staging → prod`,
`staging → preview`, etc. The target becomes an **exact copy** of the source
(full mirror — every table is dropped and re-imported).

It's generic across the monorepo: database **names** are discovered from each
app's `wrangler.jsonc` (`apps/<app>`, `pocs/<app>`, or `workers/<app>`), so the
same command works for velo, fanfare, triage, … without hardcoding ids.

## Usage

```bash
node scripts/db-clone.mjs --app <name> --from <env> --to <env> [--dry-run] [--yes]
# or: pnpm db:clone --app <name> --from <env> --to <env>
```

- `--from` / `--to` env is either `prod` (the wrangler.jsonc top level) or any
  key under `env.*` (`staging`, `preview`, …).
- `--dry-run` prints the planned `wrangler` commands and exits **without**
  touching anything — and needs **no** Cloudflare credentials.

### Examples

```bash
# Refresh staging from prod (common case)
node scripts/db-clone.mjs --app velo --from prod --to staging

# Push staging up to prod — guarded (see Safety)
node scripts/db-clone.mjs --app velo --from staging --to prod

# Preview the plan only
node scripts/db-clone.mjs --app velo --from prod --to staging --dry-run
```

## Run it from your phone (no Cloudflare site, no laptop)

There's a **`db-clone` GitHub Action** for mobile use: in the GitHub app go to
**Actions → "db-clone" → Run workflow**, pick *app / from / to*, and run. It uses
the `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` repo secrets the deploy
workflows already use, so there's nothing to set up on Cloudflare.

- Cloning **into prod** requires the `confirm_target_db` input to equal the exact
  target db name, or the run aborts (the workflow passes it as `--confirm`).
- The pre-clone prod backup is uploaded as a **downloadable artifact**
  (`db-clone-backup-<app>-<run_id>`).

Defined in `.github/workflows/db-clone.yml`.

### Check before you clone (read-only `db-counts`)

To *inspect* a database without changing it, use the **`db-counts`** button
(Actions → "db-counts" → app/env) or `pnpm db:counts --app <app> --env <env>`.
It prints the row count of every table (users, organizations, bookings, …) to
the run summary — SELECT only, nothing written. Use it to confirm whether data
is present before deciding to clone/restore. Defined in
`.github/workflows/db-counts.yml` / `scripts/db-counts.mjs`.

## Safety

Cloning **overwrites the target**, so the dangerous direction is writing *into*
production:

- **Reading from prod is free** (export is read-only).
- **When the target is prod**, the script:
  1. takes a **timestamped backup** of the prod db first → `.db-backups/<db>-<ts>.sql`
     (gitignored), then
  2. requires a **typed confirmation** — you retype the target db name — unless
     you pass `--yes`.
- Source and target resolving to the **same** database is refused.

## How it works

1. Resolve source/target db names from `wrangler.jsonc`.
2. (prod target only) back up the target.
3. `wrangler d1 export <source> --remote` → a SQL dump.
4. List the target's tables and `DROP` them all.
5. `wrangler d1 execute <target> --remote --file <dump>` to import.
6. Print a table-count summary and the backup path.

D1 databases are resolved by **name** at the account level, so the script runs
from the repo root and doesn't depend on a wrangler config in the cwd.

## Requirements

A real run (anything but `--dry-run`) needs Cloudflare credentials in the
environment: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (a token with
account D1 Edit). The `--dry-run` path needs neither.
