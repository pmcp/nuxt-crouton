# Launcher preflight checks assume app deployment

**Status**: done
**Type**: meta
**Stage**: builder

## Summary

Added a fast-path to `launcherInstructions()` in `session-manager.ts` so that non-app work items (infra, agent code, idea nodes) skip deploy preflight checks. The launcher agent now checks `git diff main..HEAD --stat` first — if no `apps/` files changed, it verifies CI status and signals green without running deploy checks.
