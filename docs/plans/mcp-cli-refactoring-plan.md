# MCP & CLI Refactoring Plan

## Overview

This plan covers three related initiatives:
1. **Rename** `nuxt-crouton-cli` → `nuxt-crouton-cli`
2. **Enhance** CLI integration in MCP server
3. **Create** MCP feedback/improvement capture system

---

## 1. Package Rename: generator → cli

### Files to Update (28+ files)

#### Package Definitions
- [ ] `packages/nuxt-crouton-cli/package.json` → rename to `@friendlyinternet/nuxt-crouton-cli`
- [ ] `packages/crouton-mcp-server/package.json` → update peer dependency

#### Directory Rename
- [ ] `packages/nuxt-crouton-cli/` → `packages/nuxt-crouton-cli/`

#### Package Documentation
- [ ] `packages/nuxt-crouton-cli/CLAUDE.md`
- [ ] `packages/nuxt-crouton-cli/README.md`
- [ ] `packages/nuxt-crouton-cli/examples/crouton.config.example.js`

#### MCP Server
- [ ] `packages/crouton-mcp-server/README.md`
- [ ] `packages/crouton-mcp-server/CLAUDE.md`
- [ ] `packages/crouton-mcp-server/src/utils/field-types.ts`

#### Docs App MCP Resources
- [ ] `apps/docs/server/mcp/resources/cli-commands.ts`
- [ ] `apps/docs/server/mcp/resources/field-types.ts`

#### External Documentation
- [ ] `apps/docs/content/1.getting-started/2.installation.md`
- [ ] `apps/docs/content/2.fundamentals/7.packages.md`
- [ ] `apps/docs/content/3.generation/4.cli-reference.md`
- [ ] `apps/docs/content/6.features/11.devtools.md`
- [ ] `apps/docs/content/10.guides/2.migration.md`
- [ ] `apps/docs/content/10.guides/6.future-roadmap.md`

#### Claude AI Configuration
- [ ] `.claude/agents/sync-checker.md`
- [ ] `.claude/hooks/README.md`
- [ ] `.claude/hooks/pre-commit-sync-reminder`
- [ ] `.claude/commands/sync-check.md`
- [ ] `.claude/skills/crouton.md`

#### Scripts
- [ ] `scripts/validate-field-types-sync.mjs`

#### Root Documentation
- [ ] `README.md`
- [ ] `CLAUDE.md`

#### Planning Documents
- [ ] `docs/PROGRESS_TRACKER.md`
- [ ] `docs/plans/crouton-mcp-and-sync-workflow.md`
- [ ] `docs/briefs/packages-cleanup-analysis-brief.md`
- [ ] `docs/reports/team-architecture-analysis.md`

### Rename Steps

1. Rename directory
2. Update package.json name
3. Run find/replace on all files
4. Update pnpm-lock.yaml (via pnpm install)
5. Verify builds

---

## 2. Enhanced CLI Integration

### Current MCP Server Tools
- `design_schema` - Get field types and guidelines
- `validate_schema` - Validate schema JSON
- `generate_collection` - Run generator
- `list_collections` - List existing collections
- `list_layers` - List available layers

### New Tools to Add

#### `cli_help`
Get help for any CLI command.
```typescript
{
  name: 'cli_help',
  description: 'Get help for Crouton CLI commands',
  inputSchema: {
    command: z.enum(['generate', 'config', 'rollback', 'init', 'install']).optional()
  }
}
```

#### `dry_run`
Preview what would be generated without writing files.
```typescript
{
  name: 'dry_run',
  description: 'Preview generated files without writing',
  inputSchema: {
    layer: z.string(),
    collection: z.string(),
    schema: z.string()
  }
}
```

#### `wizard`
Guided multi-step generation wizard.
```typescript
{
  name: 'wizard',
  description: 'Interactive wizard for collection generation',
  inputSchema: {
    step: z.enum(['start', 'fields', 'options', 'review', 'generate']),
    context: z.string().optional()
  }
}
```

#### `rollback`
Remove a generated collection.
```typescript
{
  name: 'rollback',
  description: 'Remove a generated collection',
  inputSchema: {
    layer: z.string(),
    collection: z.string(),
    dryRun: z.boolean().default(true)
  }
}
```

#### `init_schema`
Create starter schema file.
```typescript
{
  name: 'init_schema',
  description: 'Generate a starter schema template',
  inputSchema: {
    type: z.enum(['minimal', 'full', 'ecommerce', 'blog', 'tasks'])
  }
}
```

### New Resources to Add

#### `crouton://config-format`
Configuration file format reference.

#### `crouton://generated-structure`
What gets generated and where.

---

## 3. MCP Feedback Capture System

### Goals
- Capture ideas for MCP improvements during development
- Make it easy for agents to suggest additions
- Create a backlog for MCP enhancements

### Implementation

#### A. Create `.claude/mcp-ideas.md`
Central file for MCP improvement suggestions.

```markdown
# MCP Improvement Ideas

This file captures ideas for improving the Crouton MCP servers.
Add ideas here when you encounter something that would benefit from MCP integration.

## Format
- **Idea**: [Brief description]
- **Context**: [Where/when this would be useful]
- **Priority**: [High/Medium/Low]
- **Type**: [Tool/Resource/Prompt]

---

## Ideas

### [Example] Schema Diff Tool
- **Idea**: Tool to diff two schemas and show changes
- **Context**: When migrating or updating collections
- **Priority**: Medium
- **Type**: Tool
```

#### B. Add to CLAUDE.md Workflow

Add section to root CLAUDE.md:

```markdown
## MCP Improvement Capture

When working on any task, consider:
- Is there repetitive work an MCP tool could automate?
- Is there documentation an MCP resource could expose?
- Is there a workflow an MCP prompt could guide?

If yes, add to `.claude/mcp-ideas.md` with context.
```

#### C. Add Checklist Item to Task Workflow

Add to the 5-step task flow:

```markdown
Step 2: Do The Work
├─ Complete the actual task requirements
├─ Follow CLAUDE.md patterns and conventions
├─ Keep it simple (KISS principle)
└─ **NEW**: Consider if task reveals MCP improvement opportunity
```

#### D. Create `/mcp-idea` Slash Command

Quick way to add ideas:

```markdown
<!-- .claude/commands/mcp-idea.md -->
Add the following MCP improvement idea to `.claude/mcp-ideas.md`:

$ARGUMENTS

Include:
- Current date
- Context of what prompted this idea
- Suggested implementation approach
```

---

## Execution Order

1. **Create MCP feedback system first** (quick win, helps capture ideas during other work)
2. **Rename CLI package** (foundational change)
3. **Enhance CLI integration** (builds on renamed package)

---

## Verification

After all changes:
- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds in all packages
- [ ] `npx nuxt typecheck` passes in docs app
- [ ] MCP server loads with correct tool/resource count
- [ ] CLI commands still work: `pnpm crouton --help`
