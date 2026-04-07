# apps/docs/scripts

## sync-changelogs.ts

> **Status: SUPERSEDED (2026-04-07).** Replaced by ThinkGraph Phase 2A
> "Repo watchlist + daily digest". The workflow file
> `.github/workflows/sync-changelogs.yml` is intentionally still active —
> do not delete it yet, the apps/docs UI still reads
> `data/changelog-releases.json` and migration to the new flow is pending.

Fetches GitHub releases for tracked packages, generates AI summaries, and
writes them to `data/changelog-releases.json`. Runs daily via the
`sync-changelogs` GitHub Action.

### What replaces it

The same job is now done inside the `thinkgraph` app:

- **Storage**: D1 instead of a JSON file in this repo. Two collections:
  - `thinkgraph_watchedrepos` — the watchlist (repo, branch, lastCheckedSha,
    notes, active).
  - `thinkgraph_watchreports` — one row per run, with markdown summary,
    raw commit list, and any nodes spawned from the digest.
- **Trigger**: `POST /api/cron/watch-repos` on the thinkgraph app, secured
  by `WATCH_REPOS_CRON_SECRET`. Wire it to a Cloudflare cron trigger or
  any external scheduler.
- **Runner**: `apps/thinkgraph/server/utils/watch-repos.ts`. Walks all
  active watched repos, fetches commits since `lastCheckedSha` from the
  GitHub API, generates a markdown digest with the project's standard AI
  helper, writes a `watch_reports` row, and (optionally) creates an idle
  "watch digest" node so the digest surfaces on the canvas.

### Migration path

1. Backfill the new `thinkgraph_watchedrepos` table from
   `apps/docs/data/changelog-packages.json`.
2. Point the docs changelog UI at `thinkgraph_watchreports` (or keep its
   own JSON cache, fed by the new endpoint).
3. Disable the `sync-changelogs.yml` workflow and delete this script.
