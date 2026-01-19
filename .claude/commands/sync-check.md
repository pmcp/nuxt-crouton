# Sync Check Command

Verify all crouton-related documentation and code artifacts are in sync.

## Usage

```
/sync-check
```

## What It Does

This command is now part of `crouton-ci`. Run:

```bash
pnpm crouton-ci sync-check
```

Or use the `/audit` skill for comprehensive package auditing:

```
/audit --all
```

## Legacy Behavior

If `crouton-ci` is not available, manually check:

### 1. Field Type Consistency

**Source of Truth**: `packages/crouton-cli/lib/utils/helpers.mjs`

**Compare with**:
- `packages/crouton-cli/CLAUDE.md` - Field Types table
- `.claude/skills/crouton.md` - Field Types table
- `packages/crouton-mcp/src/utils/field-types.ts` - FIELD_TYPES object

### 2. CLI Command Consistency

**Source of Truth**: `packages/crouton-cli/bin/crouton-generate.js`

**Compare with**:
- `packages/crouton-cli/CLAUDE.md` - CLI Commands section
- `.claude/skills/crouton.md` - Commands reference
- `packages/crouton-cli/README.md` - Usage section

### 3. Run Validation Script (if exists)

```bash
node scripts/validate-field-types-sync.mjs
```

## Related

- Full audit skill: `.claude/skills/audit.md`
- CI package plan: `docs/active/PLAN-crouton-ci.md`
