# retired/ -- archived app graveyard

Reference-only archived apps and POCs. Code here is **not built, deployed, linted, typechecked, or edited**. It got here via `remove-app --archive` (the `/remove-app` skill with the `--archive` flag).

## Convention

- **`retired/apps/`** -- former launched apps (were in `apps/`).
- **`retired/pocs/`** -- former proof-of-concept apps (were in `pocs/`).

The subdirectory mirrors where the app lived before retirement, so you can tell what it was.

## Rules

- **Do not add `retired/` to `pnpm-workspace.yaml`** -- these are not workspace packages.
- **Do not add `retired/` paths to CI deploy workflows** -- nothing here deploys.
- **Do not edit files here** -- they exist for `git log` / `git blame` archaeology only. If you need something from a retired app, copy it out; do not revive the app in place.
- **`tsconfig.json` excludes `retired/`** -- so root-level typechecks skip it.

## How apps get here

The `remove-app --archive` flow (`/remove-app` skill, `.claude/skills/remove-app/`) moves the app's directory tree here with `git mv`, preserving full history. The app's Cloudflare resources (Worker, D1, KV) are torn down, its deploy workflow and labels are removed, and its epic/issues are closed -- but the code stays browsable.
