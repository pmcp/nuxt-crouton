# Crouton MCP Server & Documentation Sync Workflow

## Overview

This plan covers two interconnected goals:
1. **Build an MCP Server** for AI-powered collection generation
2. **Create a maintenance workflow** to keep all artifacts in sync

---

## Part 1: The Sync Problem

### What Needs to Stay in Sync

When the generator changes, multiple artifacts may need updates:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GENERATOR CHANGES                                 │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         ▼                    ▼                    ▼                     │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐                 │
│   │ Internal │        │   CLI    │        │  Field   │                 │
│   │ Refactor │        │  Flags   │        │  Types   │                 │
│   └────┬─────┘        └────┬─────┘        └────┬─────┘                 │
│        │                   │                   │                        │
│        ▼                   ▼                   ▼                        │
│   No updates          Update:              Update:                      │
│   needed              - CLAUDE.md          - CLAUDE.md                  │
│                       - README.md          - README.md                  │
│                       - Skill file         - Skill file                 │
│                       - MCP Server         - MCP Server                 │
│                       - External docs      - External docs              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Artifact Inventory

| Artifact | Location | Updates When |
|----------|----------|--------------|
| Generator CLAUDE.md | `packages/nuxt-crouton-cli/CLAUDE.md` | CLI commands, options, field types change |
| Generator README.md | `packages/nuxt-crouton-cli/README.md` | User-facing features change |
| Claude Skill | `.claude/skills/crouton.md` | Field types, workflow, examples change |
| MCP Server | `packages/crouton-mcp-server/` (new) | Tools, schemas, field types change |
| External Docs | `apps/docs/content/` | Any user-facing change |
| Root CLAUDE.md | `CLAUDE.md` | Rarely - major workflow changes |

### The Sync Matrix

| Change Type | CLAUDE.md | README | Skill | MCP | Ext Docs |
|-------------|-----------|--------|-------|-----|----------|
| Add field type | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add CLI flag | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| Add command | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change config format | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add generator file | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fix bug | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| Internal refactor | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Part 2: The Sync Workflow System

### Proposed Solution: Multi-Layer Approach

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYNC WORKFLOW SYSTEM                             │
│                                                                          │
│  Layer 1: CLAUDE.md Instructions                                        │
│  ├── Detailed sync checklist in generator CLAUDE.md                     │
│  └── Claude follows these instructions automatically                    │
│                                                                          │
│  Layer 2: Slash Command (/sync-check)                                   │
│  ├── Runs automated checks                                              │
│  └── Reports what's out of sync                                         │
│                                                                          │
│  Layer 3: Pre-Commit Hook                                               │
│  ├── Reminds developer to check sync                                    │
│  └── Can block commit if critical files changed without docs            │
│                                                                          │
│  Layer 4: CI Validation                                                 │
│  ├── Validates MCP server against generator                             │
│  └── Checks field type consistency                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: CLAUDE.md Sync Instructions

Add to `packages/nuxt-crouton-cli/CLAUDE.md`:

```markdown
## Mandatory Sync Workflow

**CRITICAL**: After ANY change to this package, Claude MUST follow this checklist:

### Step 1: Classify the Change
- [ ] Internal refactor only (no sync needed)
- [ ] CLI flag/command change
- [ ] Field type change
- [ ] Config format change
- [ ] New feature

### Step 2: Update Package Documentation
If NOT internal refactor:
- [ ] Update `CLAUDE.md` - Key Files, CLI Commands, Field Types tables
- [ ] Update `README.md` - User-facing documentation

### Step 3: Update Skill File
If field types, workflow, or examples changed:
- [ ] Update `.claude/skills/crouton.md`
- [ ] Update Field Types table
- [ ] Update examples if affected

### Step 4: Update MCP Server
If CLI commands, flags, or field types changed:
- [ ] Update `packages/crouton-mcp-server/src/tools/`
- [ ] Update field type definitions
- [ ] Run MCP server tests

### Step 5: Update External Documentation
For ANY user-facing change:
- [ ] Search `apps/docs/content/` for affected references
- [ ] Update relevant documentation pages
- [ ] Update code examples if affected

### Step 6: Verify Sync
Run the sync check:
```bash
# From project root
/sync-check
```
```

### Layer 2: Slash Command

Create `.claude/commands/sync-check.md`:

```markdown
# Sync Check Command

Verify all crouton-related documentation is in sync with the generator.

## Checks to Perform

1. **Field Type Consistency**
   - Read `lib/utils/helpers.mjs` and extract FIELD_TYPES
   - Compare with:
     - `packages/nuxt-crouton-cli/CLAUDE.md` Field Types table
     - `.claude/skills/crouton.md` Field Types table
     - `packages/crouton-mcp-server/src/schema/field-types.ts` (if exists)
   - Report any mismatches

2. **CLI Command Consistency**
   - Read `bin/crouton-generate.js` and extract all commands/options
   - Compare with:
     - `packages/nuxt-crouton-cli/CLAUDE.md` CLI Commands section
     - `.claude/skills/crouton.md` commands
   - Report any mismatches

3. **External Docs References**
   - Search crouton-docs for references to changed files
   - List any potentially outdated references

## Output Format

```
## Sync Check Results

### Field Types
✅ CLAUDE.md: 8 types (matches)
✅ Skill file: 8 types (matches)
⚠️ MCP Server: 7 types (missing: 'repeater')

### CLI Commands
✅ CLAUDE.md: 6 commands (matches)
✅ Skill file: 6 commands (matches)

### External Docs
⚠️ Found 3 references to 'crouton config' - verify still accurate
```

## Instructions

Run all checks and report results. Do NOT automatically fix - just report what needs attention.
```

### Layer 3: Pre-Commit Hook

Create `.claude/hooks/pre-commit-sync-reminder.md`:

```markdown
# Pre-Commit Sync Reminder Hook

## Trigger
When committing changes to `packages/nuxt-crouton-cli/`

## Action
Display reminder:

```
╔═══════════════════════════════════════════════════════════════╗
║                    SYNC REMINDER                               ║
╠═══════════════════════════════════════════════════════════════╣
║ You're committing changes to the collection generator.        ║
║                                                                ║
║ Did you update:                                                ║
║   □ CLAUDE.md (if CLI/types changed)                          ║
║   □ README.md (if user-facing features changed)               ║
║   □ .claude/skills/crouton.md (if field types changed)        ║
║   □ MCP Server (if CLI/types changed)                         ║
║   □ External docs (crouton-docs)                              ║
║                                                                ║
║ Run '/sync-check' to verify everything is in sync.            ║
╚═══════════════════════════════════════════════════════════════╝
```

## Files to Watch
- `packages/nuxt-crouton-cli/lib/**`
- `packages/nuxt-crouton-cli/bin/**`
```

### Layer 4: Automated Validation (CI)

Create `.github/workflows/sync-validation.yml`:

```yaml
name: Sync Validation

on:
  pull_request:
    paths:
      - 'packages/nuxt-crouton-cli/**'

jobs:
  validate-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract field types from generator
        run: |
          node -e "
            import('./packages/nuxt-crouton-cli/lib/utils/helpers.mjs')
              .then(m => console.log(JSON.stringify(Object.keys(m.FIELD_TYPES || {}))))
          " > /tmp/generator-types.json

      - name: Validate MCP server types
        run: |
          # Compare with MCP server definitions
          node scripts/validate-mcp-types.js

      - name: Check documentation references
        run: |
          # Grep for potentially outdated references
          node scripts/check-doc-references.js
```

---

## Part 3: MCP Server Implementation Plan

### Package Structure

```
packages/crouton-mcp-server/
├── src/
│   ├── index.ts                 # Entry point, server setup
│   ├── server.ts                # MCP server configuration
│   ├── tools/
│   │   ├── index.ts             # Tool exports
│   │   ├── design-schema.ts     # AI-assisted schema design
│   │   ├── validate-schema.ts   # Schema validation
│   │   ├── generate.ts          # Collection generation (CLI wrapper)
│   │   ├── list-collections.ts  # List existing collections
│   │   ├── list-layers.ts       # List available layers
│   │   └── rollback.ts          # Remove collection
│   ├── resources/
│   │   ├── index.ts             # Resource exports
│   │   ├── field-types.ts       # Field type reference
│   │   ├── schema-template.ts   # Schema templates
│   │   └── config-template.ts   # Config file templates
│   ├── prompts/
│   │   ├── index.ts             # Prompt exports
│   │   └── collection-design.ts # Schema design prompt
│   ├── utils/
│   │   ├── cli.ts               # CLI execution helpers
│   │   ├── fs.ts                # Filesystem utilities
│   │   └── validation.ts        # Schema validation
│   └── sync/
│       ├── field-types.ts       # Auto-imported from generator
│       └── cli-commands.ts      # CLI command definitions
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
└── tests/
    ├── tools.test.ts
    └── validation.test.ts
```

### Tool Definitions

#### Tool 1: `design_schema`

```typescript
// src/tools/design-schema.ts
import { z } from "zod";
import { FIELD_TYPES } from "../sync/field-types";

export const designSchemaTool = {
  name: "design_schema",
  description: `Design a collection schema from a natural language description.
Returns field type reference and a suggested schema structure that you should
refine based on the user's requirements.`,

  inputSchema: z.object({
    collectionName: z.string().describe("Name of the collection (singular, e.g., 'product')"),
    description: z.string().describe("Natural language description of what the collection should contain"),
    layer: z.string().optional().describe("Target layer name (optional)")
  }),

  handler: async ({ collectionName, description, layer }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          collectionName,
          suggestedLayer: layer || inferLayerFromName(collectionName),
          fieldTypes: FIELD_TYPES,
          schemaTemplate: {
            id: { type: "string", meta: { primaryKey: true } },
            // ... base template
          },
          instructions: `Based on the description "${description}", create a schema using these field types.
Common patterns:
- Use 'string' for names, titles, short text
- Use 'text' for descriptions, content (with component: 'EditorSimple' for rich text)
- Use 'decimal' for prices (precision: 10, scale: 2)
- Use 'refTarget' for relationships to other collections
- Add 'meta.required: true' for mandatory fields
- Add 'meta.maxLength' for string validation`
        }, null, 2)
      }]
    };
  }
};
```

#### Tool 2: `validate_schema`

```typescript
// src/tools/validate-schema.ts
export const validateSchemaTool = {
  name: "validate_schema",
  description: "Validate a collection schema before generation. Checks field types, required properties, and common issues.",

  inputSchema: z.object({
    schema: z.record(z.any()).describe("The schema object to validate"),
    options: z.object({
      hierarchy: z.boolean().optional(),
      translations: z.boolean().optional()
    }).optional()
  }),

  handler: async ({ schema, options }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation logic...
    // - Check for id field with primaryKey
    // - Validate field types against FIELD_TYPES
    // - Check refTarget references
    // - Validate meta options

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          valid: errors.length === 0,
          errors,
          warnings,
          schema // Return cleaned schema
        }, null, 2)
      }]
    };
  }
};
```

#### Tool 3: `generate_collection`

```typescript
// src/tools/generate.ts
import { execAsync } from "../utils/cli";

export const generateCollectionTool = {
  name: "generate_collection",
  description: "Generate a collection from a validated schema. Creates all CRUD files, API endpoints, and database schema.",

  inputSchema: z.object({
    layer: z.string().describe("Target layer name"),
    collection: z.string().describe("Collection name (singular)"),
    schema: z.record(z.any()).describe("Validated schema object"),
    options: z.object({
      dialect: z.enum(["sqlite", "pg"]).default("sqlite"),
      hierarchy: z.boolean().default(false),
      noTranslations: z.boolean().default(false),
      force: z.boolean().default(false),
      dryRun: z.boolean().default(false)
    }).optional()
  }),

  handler: async ({ layer, collection, schema, options = {} }) => {
    // 1. Write schema to temp file
    const schemaPath = await writeTempSchema(schema);

    // 2. Build CLI command
    const flags = [
      `--fields-file=${schemaPath}`,
      `--dialect=${options.dialect || 'sqlite'}`,
      options.hierarchy ? '--hierarchy' : '',
      options.noTranslations ? '--no-translations' : '',
      options.force ? '--force' : '',
      options.dryRun ? '--dry-run' : ''
    ].filter(Boolean).join(' ');

    const cmd = `crouton ${layer} ${collection} ${flags}`;

    // 3. Execute
    try {
      const result = await execAsync(cmd, { timeout: 60000 });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            command: cmd,
            output: result.stdout,
            generatedPath: `layers/${layer}/collections/${collection}/`
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            command: cmd,
            error: error.message,
            stderr: error.stderr
          }, null, 2)
        }]
      };
    }
  }
};
```

#### Tool 4: `list_collections`

```typescript
// src/tools/list-collections.ts
export const listCollectionsTool = {
  name: "list_collections",
  description: "List all existing collections in the project, organized by layer.",

  inputSchema: z.object({
    layer: z.string().optional().describe("Filter by specific layer")
  }),

  handler: async ({ layer }) => {
    const collections = await scanCollections(layer);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(collections, null, 2)
      }]
    };
  }
};
```

### Resource Definitions

```typescript
// src/resources/field-types.ts
export const fieldTypesResource = {
  uri: "crouton://field-types",
  name: "Field Types Reference",
  description: "All available field types for collection schemas",
  mimeType: "application/json",

  handler: async () => {
    return {
      contents: [{
        uri: "crouton://field-types",
        mimeType: "application/json",
        text: JSON.stringify(FIELD_TYPES, null, 2)
      }]
    };
  }
};
```

### Auto-Sync from Generator

```typescript
// src/sync/field-types.ts
// This file imports directly from the generator to stay in sync

// Option A: Direct import (requires proper package linking)
export { getTypeMapping, FIELD_TYPES } from "@friendlyinternet/nuxt-crouton-cli/lib/utils/helpers.mjs";

// Option B: Build-time extraction (if import doesn't work)
// Generated by: pnpm sync-types
export const FIELD_TYPES = {
  string: { zod: "z.string()", ts: "string", default: "''" },
  text: { zod: "z.string()", ts: "string", default: "''" },
  number: { zod: "z.number()", ts: "number", default: "0" },
  decimal: { zod: "z.number()", ts: "number", default: "0" },
  boolean: { zod: "z.boolean()", ts: "boolean", default: "false" },
  date: { zod: "z.date()", ts: "Date | null", default: "null" },
  json: { zod: "z.record(z.any())", ts: "Record<string, any>", default: "{}" },
  repeater: { zod: "z.array(z.any())", ts: "any[]", default: "[]" }
};
```

---

## Part 4: Implementation Steps

### Phase 1: Sync Workflow Foundation (Week 1)

#### Task 1.1: Update Generator CLAUDE.md
- [ ] Add "Mandatory Sync Workflow" section
- [ ] Add sync checklist
- [ ] Document all artifacts that need sync

#### Task 1.2: Create Slash Command
- [ ] Create `.claude/commands/sync-check.md`
- [ ] Define check logic
- [ ] Test command execution

#### Task 1.3: Create Pre-Commit Hook Config
- [ ] Create `.claude/hooks/pre-commit-sync-reminder.md`
- [ ] Document hook behavior
- [ ] Test with sample commits

### Phase 2: MCP Server Foundation (Week 2)

#### Task 2.1: Package Setup
- [ ] Create `packages/crouton-mcp-server/`
- [ ] Initialize package.json with dependencies
- [ ] Set up TypeScript config
- [ ] Create CLAUDE.md for the package

#### Task 2.2: Core Infrastructure
- [ ] Implement server entry point
- [ ] Set up tool registration
- [ ] Implement CLI execution utilities
- [ ] Add error handling

#### Task 2.3: Sync Module
- [ ] Create field-types.ts with auto-import or build script
- [ ] Create cli-commands.ts
- [ ] Add sync validation script

### Phase 3: MCP Tools Implementation (Week 3)

#### Task 3.1: Design Schema Tool
- [ ] Implement tool handler
- [ ] Add field type reference
- [ ] Add schema template generation
- [ ] Write tests

#### Task 3.2: Validate Schema Tool
- [ ] Implement validation logic
- [ ] Check field types
- [ ] Check references
- [ ] Write tests

#### Task 3.3: Generate Collection Tool
- [ ] Implement CLI wrapper
- [ ] Handle temp file creation
- [ ] Parse CLI output
- [ ] Write tests

#### Task 3.4: Utility Tools
- [ ] Implement list_collections
- [ ] Implement list_layers
- [ ] Implement rollback (optional)

### Phase 4: Integration & Documentation (Week 4)

#### Task 4.1: MCP Registration
- [ ] Add MCP server to Claude Code config
- [ ] Test tool invocation
- [ ] Test end-to-end flow

#### Task 4.2: Documentation
- [ ] Update root CLAUDE.md with MCP section
- [ ] Update generator README
- [ ] Create MCP server README
- [ ] Update external docs

#### Task 4.3: CI Integration
- [ ] Create sync validation workflow
- [ ] Add MCP server tests to CI
- [ ] Document CI checks

---

## Part 5: Usage Flow (After Implementation)

### User Experience

```
User: "Create a products collection for my e-commerce app with
       name, description, price, SKU, inventory count, category,
       and whether it's featured"

Claude: I'll help create this collection. Let me design the schema first.

        *calls design_schema tool*

        Here's the proposed schema:

        {
          "id": { "type": "string", "meta": { "primaryKey": true } },
          "name": { "type": "string", "meta": { "required": true, "maxLength": 255 } },
          "description": { "type": "text", "meta": { "component": "EditorSimple" } },
          "price": { "type": "decimal", "meta": { "precision": 10, "scale": 2, "required": true } },
          "sku": { "type": "string", "meta": { "unique": true, "maxLength": 50 } },
          "inventoryCount": { "type": "number", "meta": { "default": 0 } },
          "categoryId": { "type": "string", "refTarget": "categories" },
          "featured": { "type": "boolean", "meta": { "default": false } }
        }

        Should I generate this in the 'shop' layer?

User: "Yes, go ahead"

Claude: *calls validate_schema tool*

        Schema is valid. Generating...

        *calls generate_collection tool*

        Done! Created 14 files in layers/shop/collections/products/:
        - Form.vue, List.vue (components)
        - useShopProducts.ts (composable)
        - API endpoints (GET, POST, PATCH, DELETE)
        - Database schema and queries

        Next steps:
        1. Run `pnpm db:generate` to create the migration
        2. Restart your dev server
```

---

## Part 6: Maintenance Checklist Template

### When Making Generator Changes

```markdown
## Change Sync Checklist

**Change Description**: [What was changed]
**Change Type**: [ ] Internal [ ] CLI [ ] Field Type [ ] Config [ ] Feature

### Package Documentation
- [ ] `packages/nuxt-crouton-cli/CLAUDE.md`
  - [ ] Key Files table
  - [ ] CLI Commands section
  - [ ] Field Types table
  - [ ] Common Tasks section
- [ ] `packages/nuxt-crouton-cli/README.md`
  - [ ] Usage examples
  - [ ] Options documentation

### Skill File
- [ ] `.claude/skills/crouton.md`
  - [ ] Field Types table
  - [ ] Workflow steps
  - [ ] Examples

### MCP Server
- [ ] `packages/crouton-mcp-server/src/sync/field-types.ts`
- [ ] `packages/crouton-mcp-server/src/tools/*.ts` (if tools affected)
- [ ] MCP server tests

### External Documentation
- [ ] Searched crouton-docs for references
- [ ] Updated affected pages:
  - [ ] [list pages updated]

### Verification
- [ ] Ran `/sync-check`
- [ ] Ran `npx nuxt typecheck`
- [ ] Ran MCP server tests
```

---

## Summary

This plan provides:

1. **Multi-layer sync system**:
   - CLAUDE.md instructions (always-on guidance)
   - Slash command for verification
   - Pre-commit hook for reminders
   - CI for automated validation

2. **MCP Server with hybrid architecture**:
   - Imports type info from generator (stays in sync)
   - Wraps CLI for generation (loose coupling)
   - ~400 lines of maintainable code

3. **Clear maintenance workflow**:
   - Checklist for every change type
   - Automated sync checking
   - Documentation-first approach

The key insight: **Make sync automatic where possible** (imports, CI validation) and **make manual sync easy** (checklists, commands, reminders).
