# Discover tasks don't need worktree setup

## Problem
Discover nodes use step `'analyse'` but `buildPMPrompt`'s switch in `session-manager.ts` only handled `'analyst'`, causing `analyse` to fall through to the default case which runs `builderInstructions()` with full worktree setup — inappropriate for pure analysis tasks.

## Fix
Added `case 'analyse':` to the switch statement in `buildPMPrompt()` that routes to `discoverInstructions()` — a method that already existed at line 1556 but was dead code.

## Files Changed
- `apps/thinkgraph-worker/src/session-manager.ts` — added `case 'analyse'` to stage switch
