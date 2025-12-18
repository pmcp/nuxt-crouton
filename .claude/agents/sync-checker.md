# Sync Checker Agent

Verifies that all crouton cli generator documentation artifacts are in sync.

## Purpose

This agent checks consistency between the cli generator source code and its documentation across multiple locations. Invoke this agent after making changes to the generator package.

## When to Use

- After modifying `packages/nuxt-crouton-cli/`
- Before committing generator changes
- When you want to verify documentation is up to date

## Checks Performed

### 1. Field Type Consistency

Extract field types from source and compare with documentation:

**Source of truth**: `packages/nuxt-crouton-cli/lib/utils/helpers.mjs`

**Must match**:
- `packages/nuxt-crouton-cli/CLAUDE.md` (Field Types table)
- `.claude/skills/crouton.md` (Field Types table)
- `packages/nuxt-crouton-mcp-server/src/sync/field-types.ts` (if exists)

### 2. CLI Command Consistency

Extract commands from CLI entry point and compare:

**Source of truth**: `packages/nuxt-crouton-cli/bin/crouton-generate.js`

**Must match**:
- `packages/nuxt-crouton-cli/CLAUDE.md` (CLI Commands section)
- `.claude/skills/crouton.md` (commands reference)

### 3. CLI Options Consistency

Extract options from Commander.js setup:

**Source of truth**: `packages/nuxt-crouton-cli/bin/crouton-generate.js`

**Must match**:
- `packages/nuxt-crouton-cli/CLAUDE.md` (Key Options table)
- `packages/nuxt-crouton-cli/README.md`
- `examples/crouton.config.example.js` (documented options)

### 4. External Documentation References

Check for potentially outdated references in external docs:

**Location**: `apps/docs/content/` (within monorepo)

**Check for**:
- References to changed CLI commands
- References to changed options
- Code examples that may need updating

## How to Run Checks

### Field Types Check

```javascript
// Read helpers.mjs and extract type mappings
// Look for getTypeMapping function or FIELD_TYPES export
// Compare keys with documented types in CLAUDE.md and skill file
```

### CLI Commands Check

```javascript
// Read bin/crouton-generate.js
// Find all .command() calls in Commander.js
// Compare with documented commands
```

### Options Check

```javascript
// Read bin/crouton-generate.js
// Find all .option() calls
// Compare with Key Options table
```

## Output Format

Report results in this format:

```markdown
## Sync Check Results

### Field Types
- Source (helpers.mjs): [list types found]
- CLAUDE.md: [status] [details if mismatch]
- Skill file: [status] [details if mismatch]
- MCP Server: [status or N/A]

### CLI Commands
- Source (crouton-generate.js): [list commands found]
- CLAUDE.md: [status]
- Skill file: [status]

### CLI Options
- Source: [list options found]
- CLAUDE.md: [status]
- README.md: [status]
- Example config: [status]

### External Docs
- [List any potentially affected pages]

### Summary
- Total checks: X
- Passed: X
- Warnings: X
- Failed: X

### Action Items
- [List specific items that need updating]
```

## Instructions for Agent

1. **Read source files first** to establish ground truth:
   - `lib/utils/helpers.mjs` for field types
   - `bin/crouton-generate.js` for CLI commands and options

2. **Compare with each documentation artifact**:
   - Be exact - field type names must match exactly
   - Note missing items and extra items separately

3. **Check external docs** for references:
   - Search for "crouton" in crouton-docs content
   - Flag any code examples that reference changed functionality

4. **Report clearly**:
   - Use checkmarks for passing checks
   - Use warnings for minor issues
   - Use failures for significant mismatches

5. **Suggest fixes**:
   - For each mismatch, suggest the specific update needed
   - Reference line numbers when possible

## Example Invocation

```
Please run the sync-checker agent to verify all generator documentation is in sync.
```

The agent should:
1. Read the source files
2. Read all documentation artifacts
3. Compare and report mismatches
4. Suggest specific fixes needed