---
name: sync-docs
description: Analyze code changes and update relevant documentation to stay in sync. Runs automatically before /commit. Assumes docs are outdated — only updates what this change touches, never over-reaches.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# Sync Docs Skill

Ensures documentation reflects the current code changes. **Conservative by default** — only touches docs directly related to what changed.

## Core Philosophy

1. **Assume docs are outdated** — don't trust them, verify against source code
2. **Only update what this change touches** — if you changed a composable, update its entry in CLAUDE.md. Don't rewrite the whole file.
3. **Never over-reach** — don't "improve" unrelated docs. Don't add sections that weren't there before unless the change demands it.
4. **Additions over rewrites** — prefer adding a line to a table or list over restructuring
5. **Skip if nothing to update** — not every change needs a doc update. Config tweaks, bug fixes to internal logic, formatting changes — these rarely need doc changes.

## When NOT to Update Docs

- Pure bug fixes with no API/behavior change
- Internal refactors that don't change any public interface
- Dependency bumps
- Test-only changes
- Formatting/linting changes
- Changes to files that have no documentation coverage (and shouldn't)

## What to Check

### 1. Package CLAUDE.md Files

Each package in `packages/*/CLAUDE.md` documents its components, composables, server utils, types, and patterns.

**When to update:**
- Added/removed/renamed a component → update "Key Components" or similar section
- Added/removed/renamed a composable → update "Key Composables" section
- Changed a composable's return value or parameters → update its documentation
- Added/removed/renamed an API endpoint → update "API Endpoints" section
- Changed a component's props/emits significantly → update component docs
- Added a new export → add it to the relevant section

**How to update:**
- Read the existing CLAUDE.md for the package
- Find the relevant section (components, composables, API, etc.)
- Add/update/remove the specific entry
- Match the existing format exactly — don't restructure

### 2. Root CLAUDE.md

Only update if:
- A new package was added (add to scopes list)
- A critical gotcha was discovered (add to gotchas section)
- A dev command changed (update commands section)
- Architecture changed fundamentally

### 3. Docs App Content (`apps/docs/content/`)

Only update if:
- The change directly contradicts what a docs page says
- A documented API endpoint changed its contract
- A documented component changed its usage pattern
- A field type was added/removed from the generator

**How to find relevant docs pages:**
- Search `apps/docs/content/` for the name of the changed component/composable/endpoint
- If a docs page references it, check if the reference is still accurate
- Only fix inaccuracies — don't expand or improve the docs page

### 4. Skills and Commands (`.claude/skills/`, `.claude/commands/`)

Only update if:
- The change affects a workflow that a skill describes
- A CLI command changed that a skill references
- A file path changed that a skill uses

## Workflow

### Step 1: Identify What Changed

Run in parallel:
- `git diff --name-only` — list changed files
- `git diff --cached --name-only` — list staged files
- `git diff --stat` — summary of changes

### Step 2: Categorize Changes

For each changed file, determine:
- **Package**: which `packages/*/` does it belong to?
- **Type**: component, composable, server util, type, config, other?
- **Impact**: public API change, internal change, or cosmetic?

Only proceed with files that have **public API impact**.

### Step 3: Check Relevant Docs

For each package with public API changes:

1. **Read the package's CLAUDE.md** (if it exists)
2. **Search for references** in `apps/docs/content/` using the changed item's name
3. **Compare** the docs against what the code now says

### Step 4: Make Targeted Updates

For each doc that needs updating:
1. Show what's changing: `Updating packages/crouton-foo/CLAUDE.md — adding useNewComposable to Key Composables`
2. Use the Edit tool to make the minimum change
3. Match existing formatting

### Step 5: Report

Summarize what was updated:

```
Docs synced:
- packages/crouton-core/CLAUDE.md: added useTeamRoles to composables list
- apps/docs/content/8.api-reference/composables.md: updated useTeamRoles signature

No updates needed:
- 3 internal files changed (no public API impact)
```

Or if nothing needs updating:

```
No doc updates needed — changes are internal/cosmetic only.
```

## Mapping: File Change → Doc Location

| Changed File Pattern | Check This Doc |
|---------------------|----------------|
| `packages/*/app/components/*.vue` | `packages/*/CLAUDE.md` (components section) |
| `packages/*/app/composables/use*.ts` | `packages/*/CLAUDE.md` (composables section) |
| `packages/*/server/api/**` | `packages/*/CLAUDE.md` (API section) |
| `packages/*/server/utils/**` | `packages/*/CLAUDE.md` (server utils section) |
| `packages/*/types*.ts` | `packages/*/CLAUDE.md` (types section) |
| `packages/crouton-cli/**` | `.claude/skills/crouton.md`, `packages/crouton-cli/CLAUDE.md` |
| `packages/crouton-mcp*/**` | `packages/crouton-mcp*/CLAUDE.md` |
| `apps/docs/content/**` | N/A (it IS the docs) |
| `*.nuxt.config.ts` | Package CLAUDE.md (config section, if exists) |

## Examples

### Example 1: Added a composable

Changed: `packages/crouton-core/app/composables/useTeamRoles.ts`

Action:
1. Read `packages/crouton-core/CLAUDE.md`
2. Find composables section
3. Add `useTeamRoles` entry matching existing format
4. Search `apps/docs/content/` for "team roles" — if found, verify accuracy

### Example 2: Renamed a component

Changed: `packages/crouton-editor/app/components/EditorToolbar.vue` → `EditorActions.vue`

Action:
1. Read `packages/crouton-editor/CLAUDE.md`
2. Replace `EditorToolbar` with `EditorActions`
3. Search docs for `EditorToolbar` references and update

### Example 3: Internal bug fix

Changed: `packages/crouton-auth/server/utils/session.ts` (fixed a null check)

Action: No doc update needed — internal fix, no API change.

## Rules

1. **NEVER restructure docs** — add/edit/remove specific entries only
2. **NEVER add new sections** unless the change introduces an entirely new category
3. **NEVER update docs for internal changes** — only public API
4. **ALWAYS match existing format** — if the list uses `- `, keep using `- `
5. **ALWAYS show what you're updating** before doing it
6. **ALWAYS read the doc first** before editing it
7. **Prefer skipping over guessing** — if you're unsure whether a doc needs updating, skip it
