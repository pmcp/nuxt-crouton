# CLI Refactoring & Testing Plan

**Package:** `packages/nuxt-crouton-cli`
**Created:** 2024-12-20
**Status:** Planned

## Goal
Add testing infrastructure and refactor large files in `packages/nuxt-crouton-cli` for maintainability, with a fast iteration workflow.

## Current State
- **Main file:** `generate-collection.mjs` - 1,945 lines (monster)
- **Generators:** 12 pure functions in `lib/generators/` - already testable
- **Tests:** None exist
- **Monorepo pattern:** Vitest (see `nuxt-crouton-mcp-server` for template)

---

## Phase 1: Test Infrastructure (Fast Feedback Loop)

### 1.1 Set up Vitest
Copy pattern from MCP server package:

```
packages/nuxt-crouton-cli/
├── vitest.config.ts       # Minimal node environment config
├── tests/
│   ├── unit/
│   │   ├── generators/    # Pure function tests
│   │   └── utils/         # Helper tests
│   └── fixtures/          # Sample data objects
└── package.json           # Add test scripts
```

**Files to create:**
- `vitest.config.ts`
- `tests/fixtures/sample-data.mjs` - Reusable test data objects

**Package.json scripts:**
```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:watch": "vitest --watch"
}
```

### 1.2 First Tests: Pure Generators (Quick Wins)
Start with generators because they're **pure functions** - no mocking needed.

**Priority order:**
1. `lib/utils/helpers.mjs` - Case conversion, type mapping (most reused)
2. `lib/generators/types.mjs` - Simplest generator (105 lines)
3. `lib/generators/composable.mjs` - Core output (128 lines)
4. `lib/generators/form-component.mjs` - Complex but critical

**Test approach:**
- Unit tests for pure functions
- Snapshot tests for template output (catches regressions fast)

---

## Phase 2: Extract Testable Modules from Monster File

### 2.1 Low-Risk Extractions
Move pure/near-pure functions out of `generate-collection.mjs`:

| Extract | To | Lines | Risk |
|---------|-----|-------|------|
| `parseArgs()` | `lib/utils/cli-args.mjs` | 50 | Low |
| `loadFields()` | `lib/utils/schema-loader.mjs` | 30 | Low |
| Path constants | `lib/utils/paths.mjs` | New | Low |
| Regex patterns | `lib/utils/patterns.mjs` | New | Low |

### 2.2 Medium-Risk Extractions
Config updaters (have side effects but isolated):

| Extract | To | Lines |
|---------|-----|-------|
| `updateSchemaIndex()` | `lib/updaters/schema-index.mjs` | 70 |
| `updateRegistry()` | `lib/updaters/registry.mjs` | 100 |
| `updateRootNuxtConfig()` | `lib/updaters/nuxt-config.mjs` | 60 |
| `updateLayerRootConfig()` | `lib/updaters/layer-config.mjs` | 110 |

### 2.3 High-Impact Refactor (Later)
Break down the two monster functions:

**`writeScaffold()` (491 lines) → Split into:**
- `prepareGenerationData()` - Build the data object
- `generateFiles()` - Call generators, collect output
- `writeFiles()` - Batch file writing
- `updateConfigurations()` - Post-generation config updates

**`main()` (458 lines) → Split into:**
- `loadAndValidateConfig()` - Config file handling
- `processConfigTargets()` - Generic handler for both formats
- `runCliMode()` - Direct CLI invocation

---

## Phase 3: Integration Testing

### 3.1 Dry-Run Testing
The CLI has a `--dry-run` flag. Use it for integration tests:
- Parse config → validate → show what would generate
- No file system changes
- Fast feedback

### 3.2 Fixture-Based Testing
Create test schemas in `tests/fixtures/`:
- `simple-collection.json` - Basic fields
- `complex-collection.json` - Hierarchy, translations, relations
- `edge-cases.json` - Weird field types, special characters

Run generation against fixtures, snapshot the output.

---

## Execution Order

| Step | Description | Effort |
|------|-------------|--------|
| 1 | Vitest setup + first test (helpers.mjs) | 30 min |
| 2 | Generator snapshot tests (types, composable) | 1 hour |
| 3 | Create test fixtures (sample data) | 30 min |
| 4 | Extract `parseArgs()` + `loadFields()` with tests | 1 hour |
| 5 | Generator tests for form + list components | 1 hour |
| 6 | Extract config updaters (one at a time) | 2 hours |
| 7 | Break down `writeScaffold()` | 2 hours |
| 8 | Integration tests with dry-run | 1 hour |

**Total:** ~9 hours of focused work

---

## Key Files

**To modify:**
- `packages/nuxt-crouton-cli/package.json`
- `packages/nuxt-crouton-cli/lib/generate-collection.mjs`

**To create:**
- `packages/nuxt-crouton-cli/vitest.config.ts`
- `packages/nuxt-crouton-cli/tests/unit/utils/helpers.test.ts`
- `packages/nuxt-crouton-cli/tests/unit/generators/*.test.ts`
- `packages/nuxt-crouton-cli/tests/fixtures/sample-data.mjs`
- `packages/nuxt-crouton-cli/lib/utils/cli-args.mjs`
- `packages/nuxt-crouton-cli/lib/utils/schema-loader.mjs`

**Reference:**
- `packages/nuxt-crouton-mcp-server/vitest.config.ts` (template)
- `packages/nuxt-crouton-mcp-server/tests/` (patterns)

---

## Fast Iteration Workflow

Once set up, the workflow is:

```bash
# Terminal 1: Watch tests
pnpm --filter nuxt-crouton-cli test:watch

# Terminal 2: Make changes, see instant feedback
# Snapshot failures show diffs immediately
```

For generator changes:
1. Update generator code
2. Tests fail with snapshot diff
3. Review diff - if intentional, update snapshot
4. Commit with confidence

This gives you the fast feedback loop for "finnicky stuff."
