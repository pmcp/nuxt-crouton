# Branch cleanup should be standard for empty branches

**Status**: done
**Type**: task

## Summary
Updated the merger's Step 1.5 (empty branch short-circuit) in `session-manager.ts` to also delete the local branch, remove the worktree, and checkout main — matching the cleanup that the normal merge path (Steps 4-5) already performs.

## Changes
- `apps/thinkgraph-worker/src/session-manager.ts`: Added steps 3-5 to the Step 1.5 early-exit block (checkout main, delete local branch, remove worktree)
