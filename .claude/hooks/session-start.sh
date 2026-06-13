#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Installs workspace dependencies and builds the @fyit/crouton-* packages so
# apps boot and tests/linters run. The container state is cached into the
# environment snapshot after this completes, so later sessions start fast.
#
# Local (non-web) sessions are skipped — local dev manages its own setup.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# CLAUDE_PROJECT_DIR is set by the harness in a real invocation; fall back to
# the repo root relative to this script so the hook is also runnable directly.
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Provide a dev BETTER_AUTH_SECRET so apps (e.g. fanfare) boot without manual
# env config. Generated once and reused (kept outside the repo so it's stable
# across sessions and never committed). Dev-only — production uses its own
# secret. Skipped if you've already set BETTER_AUTH_SECRET in the env config.
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -z "${BETTER_AUTH_SECRET:-}" ]; then
  dev_secret_file="${HOME:-/root}/.crouton-dev-auth-secret"
  if [ ! -s "$dev_secret_file" ]; then
    openssl rand -hex 32 > "$dev_secret_file" 2>/dev/null || true
  fi
  if [ -s "$dev_secret_file" ]; then
    echo "export BETTER_AUTH_SECRET=$(cat "$dev_secret_file")" >> "$CLAUDE_ENV_FILE"
    echo "[session-start] dev BETTER_AUTH_SECRET exported"
  fi
fi

echo "[session-start] pnpm install…"
pnpm install

# Apps (e.g. fanfare) won't boot until the crouton packages' dist exists — the
# dev server errors on a missing crouton-core/dist. Build them once here.
echo "[session-start] pnpm build:packages…"
pnpm build:packages

echo "[session-start] done."
