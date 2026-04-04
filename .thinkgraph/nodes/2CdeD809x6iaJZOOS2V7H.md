# Typecheck OOM on large monorepo in CI

**Status:** done
**Type:** meta

## Summary
Added `NODE_OPTIONS: '--max-old-space-size=8192'` to the Typecheck step in `.github/workflows/thinkgraph-ci.yml` to prevent JS heap OOM errors during CI typecheck runs.

## Changes
- `.github/workflows/thinkgraph-ci.yml` — added `env.NODE_OPTIONS` to Typecheck step, matching the pattern used in all deploy workflows.
