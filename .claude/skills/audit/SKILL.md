---
name: audit
description: Audit packages for documentation completeness, detect drift between code and docs, and maintain documentation quality across the monorepo. Use when checking package docs, running audits, or reviewing documentation health.
argument-hint: "[package-name | --all | --docs-health]"
allowed-tools: Bash, Read, Grep, Glob
---

# Package Audit Skill

Audit packages for documentation completeness, detect drift, and maintain docs quality.

## Critical Principle: Defensive & Human-First

**AI makes mistakes. Human choices always win.**

### Trust Hierarchy

```
1. Human-written content     → PRESERVE, never auto-overwrite
2. Human-approved AI content → Trust, but flag if conflicts
3. AI-generated suggestions  → SUSPECT, always require confirmation
```

### Rules for This Skill

1. **Never auto-overwrite** - Always show what will change, ask for confirmation
2. **Flag, don't fix** - When docs differ from code, present BOTH options
3. **Assume AI mistakes** - Your analysis might be wrong, offer "skip" always
4. **Preserve human content** - Even if it seems outdated, ask before changing
5. **Show diffs** - Never just say "I updated X", show exactly what changed

### When in Doubt

```
I found a potential issue, but I might be wrong:

CLAUDE.md says: "CroutonEditor accepts 5 props"
I found in source: 7 props defined

This could mean:
- Docs are outdated (likely)
- 2 props are internal/undocumented (intentional)
- I misread the source code (possible)

What would you like to do?
1. Show me the details so I can decide
2. Update docs to show all 7 props
3. Skip - the docs are correct as-is
4. Add a TODO comment for later review
```

## Prerequisites

The `@fyit/crouton-ci` package must be built and available. If not, fall back to manual analysis.

## Commands

### Single Package Audit

```bash
/audit <package-name>
```

Example: `/audit crouton-editor`

### Full Monorepo Audit

```bash
/audit --all
```

### Docs Folder Health Check

```bash
/audit --docs-health
```

## Workflow: Single Package

### Step 1: Run Analysis

```bash
pnpm crouton-ci audit <package> --json
```

If crouton-ci is not available, manually analyze:
1. Read all files in `packages/<package>/`
2. Extract components from `app/components/`
3. Extract composables from `app/composables/`
4. Extract server utils from `server/`
5. Read existing CLAUDE.md and README.md

### Step 2: Present Findings

Format results clearly:

```
## Audit: crouton-editor

**Package Info**
- Type: addon (Nuxt Layer)
- Files: 12
- Maturity: stable

**Exports Found**
- Components: 5
- Composables: 1
- Server Utils: 0
- Types: 2

**Documentation Status**
- CLAUDE.md: 95% coverage
- README.md: exists
- apps/docs: may need update

**Issues**
1. CroutonEditorToolbar not documented in CLAUDE.md
2. Package reference "@friendlyinternet/..." is outdated
```

### Step 3: Offer Fixes

Ask the user:
> Would you like me to fix these issues?
> 1. Add missing exports to CLAUDE.md
> 2. Update outdated package references
> 3. Both

### Step 4: Execute Fixes

If user approves:

1. **For missing documentation:**
   - Read the source file
   - Extract props/emits for components
   - Extract return values for composables
   - Add section to CLAUDE.md following existing format

2. **For outdated references:**
   - Find and replace old package names with current ones

### Step 5: Verify

```bash
npx nuxt typecheck
```

### Step 6: Suggest Commit

```
docs(<package>): update documentation

- Add missing exports to CLAUDE.md
- Update package references to @fyit scope
- Coverage: X% → Y%
```

## Workflow: Full Audit

### Step 1: Run Full Analysis

```bash
pnpm crouton-ci audit --all --json
```

### Step 2: Summarize

```
## Monorepo Audit Summary

**Packages Analyzed**: 21

**By Coverage**
- 90%+: 8 packages
- 70-89%: 10 packages
- <70%: 3 packages

**Packages Needing Attention**
1. crouton-maps (45%) - missing 3 components
2. crouton-admin (62%) - missing 5 composables
3. crouton-collab (68%) - missing README

Would you like to audit a specific package?
```

### Step 3: Iterate

Let user pick packages to fix one by one.

## Workflow: Docs Health

### Step 1: Analyze /docs

```bash
pnpm crouton-ci docs-health --json
```

Or manually check:
- `docs/upcoming/` - Plans in progress
- `docs/briefings/` - Feature briefs
- `docs/projects/` - Larger initiatives
- `docs/completed/` - Archived items

### Step 2: Detect Status

For each file, check:
1. **Likely done**: Feature mentioned exists in code
2. **Active**: Recent modifications, clear "in progress" markers
3. **Stale**: No updates in 60+ days, no related commits
4. **Unknown**: Can't determine status

### Step 3: Present Findings

```
## /docs Health Check

**upcoming/** (6 files)
- PLAN-package-rename-fyit.md — Active
- PLAN-keyboard-shortcuts.md — Likely done
  → useCroutonShortcuts exists
- PLAN-playground.md — Unknown

**Suggestions**
- Move 2 files to completed/
- Triage 3 files with unknown status

Would you like me to help triage the unknown files?
```

### Step 4: Triage Unknown Files

For each unknown file:
1. Read the file content
2. Search codebase for related features
3. Ask user: "Is this complete, in progress, or abandoned?"
4. Move to appropriate folder or add status marker

## Manual Analysis Fallback

If crouton-ci is not available, use these patterns:

### Extract Components

```bash
# Find all Vue components
find packages/<pkg>/app/components -name "*.vue" 2>/dev/null
```

### Extract Composables

```bash
# Find all composables
find packages/<pkg>/app/composables -name "use*.ts" 2>/dev/null
```

### Check Documentation

```bash
# Check if CLAUDE.md exists and search for component names
grep -l "ComponentName" packages/<pkg>/CLAUDE.md
```

## Related Files

- Plan: `docs/active/PLAN-crouton-ci.md`
- CLI Package: `packages/crouton-ci/` (when built)
- Existing sync-check: `.claude/commands/sync-check.md`