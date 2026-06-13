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

echo "[session-start] pnpm install…"
pnpm install

# Apps (e.g. fanfare) won't boot until the crouton packages' dist exists — the
# dev server errors on a missing crouton-core/dist. Build them once here.
echo "[session-start] pnpm build:packages…"
pnpm build:packages

echo "[session-start] done."
