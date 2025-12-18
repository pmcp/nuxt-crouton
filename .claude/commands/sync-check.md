# Sync Check Command

Verify all crouton-related documentation and code artifacts are in sync with the generator.

## When to Use

Run this command after making changes to the collection generator to verify all documentation artifacts are up to date.

## Checks to Perform

### 1. Field Type Consistency

Extract field types from the source of truth and compare with all artifacts:

**Source of Truth**: `packages/nuxt-crouton-cli/lib/utils/helpers.mjs`
- Look for `typeMapping` object or `mapType` function

**Compare with**:
- `packages/nuxt-crouton-cli/CLAUDE.md` - Field Types table
- `.claude/skills/crouton.md` - Field Types table
- `packages/crouton-mcp-server/src/utils/field-types.ts` - FIELD_TYPES object

### 2. CLI Command Consistency

Extract CLI commands from the generator and compare with documentation:

**Source of Truth**: `packages/nuxt-crouton-cli/bin/crouton-generate.js`
- Extract all Commander.js commands and options

**Compare with**:
- `packages/nuxt-crouton-cli/CLAUDE.md` - CLI Commands section
- `.claude/skills/crouton.md` - Commands and workflow
- `packages/nuxt-crouton-cli/README.md` - Usage section

### 3. Run CI Validation Script

Execute the automated validation script:

```bash
node scripts/validate-field-types-sync.mjs
```

This will:
- Extract field types from generator
- Compare with MCP server
- Compare with Claude skill
- Report any mismatches

## Output Format

Report results in this format:

```markdown
## Sync Check Results

### Field Types
✅ Generator: 9 types (source of truth)
✅ CLAUDE.md: 9 types (matches)
✅ Skill file: 9 types (matches)
✅ MCP Server: 9 types (matches)

### CLI Commands
✅ Generator: 7 commands
✅ CLAUDE.md: 7 commands (matches)
✅ Skill file: references main commands

### CI Validation
✅ scripts/validate-field-types-sync.mjs passed

### Summary
✅ All artifacts are in sync!
```

Or if issues found:

```markdown
## Sync Check Results

### Field Types
✅ Generator: 9 types (source of truth)
❌ CLAUDE.md: 8 types (MISMATCH - missing: array)
✅ Skill file: 9 types (matches)
✅ MCP Server: 9 types (matches)

### Action Required
1. Update `packages/nuxt-crouton-cli/CLAUDE.md`
   - Add `array` to Field Types table
```

## Instructions

1. Read the source files listed above
2. Extract the relevant data (field types, CLI commands)
3. Compare across all artifacts
4. Run the CI validation script
5. Report results with specific fix instructions if mismatches found

**IMPORTANT**: Do NOT automatically fix issues - only report what needs attention. The developer should review and make intentional updates.

## Related Files

- Generator CLAUDE.md sync workflow: `packages/nuxt-crouton-cli/CLAUDE.md` (see "Documentation Sync Workflow" section)
- CI validation script: `scripts/validate-field-types-sync.mjs`
- MCP server field types: `packages/crouton-mcp-server/src/utils/field-types.ts`