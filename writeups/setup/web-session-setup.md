# Fast session startup — Claude Code on the web

Each web session runs in a **fresh container** (repo cloned anew). The container is **snapshotted after the SessionStart hook finishes** and reused for later sessions (~7 days), so the expensive setup is paid **once**. For this monorepo the cost is `pnpm install` + building the `@fyit/crouton-*` packages (apps won't boot without their `dist`).

## What's automated (in the repo)

`.claude/hooks/session-start.sh` (registered in `.claude/settings.json` → `hooks.SessionStart`) runs on web sessions only and does:

```bash
pnpm install
pnpm build:packages   # apps (e.g. fanfare) need the crouton dist to boot
```

It's idempotent and skipped on local (non-web) sessions (`$CLAUDE_CODE_REMOTE`). After the first run it's cached into the snapshot, so subsequent sessions start fast.

> **Activation:** once this hook is on the **default branch**, all future web sessions use it.

## Environment config (one-time, in the web UI — not the repo)

Set in the environment settings:

- **`BETTER_AUTH_SECRET`** — a 32+ character secret. Apps like `fanfare` need it to boot. (Optionally `BETTER_AUTH_URL`.) Keep secrets in the env config, not in the hook or a committed `.env`.
- *(Alternative)* If you'd rather, the same `pnpm install && pnpm build:packages` can live in the environment **setup script** instead of the SessionStart hook. Both get snapshot-cached; the hook keeps it version-controlled, so we use the hook.

## Running an app in a session

```bash
cd apps/fanfare && pnpm dev      # uses hub:db sqlite locally; needs BETTER_AUTH_SECRET
```

If you edit a **dist-consumed** package (e.g. `crouton-core`, `crouton-sales`), rebuild just that one so the app picks it up:

```bash
pnpm --filter @fyit/crouton-core build
```

## Recommended way to start a work session

1. **Sync the branch:** `git fetch origin && git reset --hard origin/main`
2. **Paste the handoff prompt** (continue the active issue — e.g. #61) so context isn't re-derived.
3. The SessionStart hook has already installed + built everything; you can run tests/lint/dev immediately.
