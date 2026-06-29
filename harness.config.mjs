/**
 * Harness stage model — epic #952 / WS2 (#954).
 *
 * Makes "stage" a first-class, DECLARED concept instead of folder names hardcoded
 * across CLAUDE.md, skills and hooks. Each stage maps a set of path prefixes to the
 * lifecycle gates that fire there and its default deploy target. WS3 (#955) refactors
 * the call sites (the #779 test-first table, the packages-edit guard hook, the deploy
 * default, task-worker) to READ this instead of string-matching folders. This file
 * only declares the data + is read by scripts/harness-stages.mjs; it changes no
 * behaviour on its own.
 *
 * Renaming a stage (the canonical example: `poc` → `spike` for a scrum team) is a
 * one-line edit HERE — rename the key. Nothing else changes, because the gates travel
 * with the stage, not the folder name. See scripts/harness-stages.test.mjs.
 *
 * Gate vocabulary (stable ids WS3 maps to the actual skills):
 *   test-first      — write+agree the test before the code (#774)
 *   schema-signoff  — sign off the data model before generating (#314)
 *   ui-signoff      — sign off the look before building (#307)
 *   code-review     — /code-review the diff
 *   sec             — red-team / security review
 *
 * Per stage:
 *   paths          — path prefixes (repo-relative) that belong to this stage. Longest
 *                    matching prefix wins, so nested paths resolve to the deepest stage.
 *   gates          — gate ids REQUIRED at this stage.
 *   optionalGates  — gate ids that are OPT-IN here (offered, not enforced).
 *   deploy         — default deploy target: 'preview' | 'staging' | 'prod-manual' | 'none'.
 *   editGuard      — true if edits to this stage's paths need explicit approval (shared
 *                    code). DECLARATIVE here; the PreToolUse hook .claude/hooks/
 *                    gate-package-edits.sh is the enforcer and hardcodes `packages/*` on
 *                    purpose — it fires on every Edit/Write, so it must not pay a Node
 *                    spawn per call just to re-derive what this flag already states (#955).
 *                    Keep the two in sync: this flag documents intent, the hook enforces it.
 *
 * The DEFAULT profile below reproduces today's behaviour exactly (the #779 table:
 * packages = test-first ON, apps = opt-in, pocs = OFF). A consumer on another stack
 * edits this file (rename stages, repoint paths, swap deploy targets) without touching
 * any skill or hook.
 */
export const stages = {
  // The incubator. `poc` today; rename this key to `spike` for a scrum flow — the
  // gates (none required) and everything downstream are unchanged by the rename.
  poc: {
    paths: ['pocs/'],
    gates: [],
    optionalGates: [],
    deploy: 'preview'
  },

  // Launched apps — may be someone else's; test-first is offered, not imposed.
  app: {
    paths: ['apps/'],
    gates: [],
    optionalGates: ['test-first'],
    deploy: 'staging'
  },

  // Shared packages — what we maintain; every consuming app inherits their
  // correctness, so test-first is required. Not deployed on their own.
  package: {
    paths: ['packages/'],
    gates: ['test-first'],
    optionalGates: [],
    deploy: 'none',
    editGuard: true
  }
}

// Fallback for paths under no stage (root config, .claude/, scripts/, docs/): no
// required gates, nothing deployed. Keeps the resolver total — every path resolves.
export const unstaged = {
  paths: [],
  gates: [],
  optionalGates: [],
  deploy: 'none'
}

export default { stages, unstaged }
