# CLI Testing Learnings - December 18, 2024

Testing the crouton-cli from scratch using `apps/test` revealed several issues and improvement opportunities.

## Test Setup

- **App**: `apps/test` (fresh Nuxt app)
- **Collection**: Simple blog with posts (id, title, slug, content, published, publishedAt, authorName)
- **Method**: Config-based generation using `crouton.config.js`

## Issues Found

### 1. Documentation Not Discoverable for AI

**Problem**: The AI assistant searched the codebase looking for config file examples instead of checking the comprehensive docs first.

**Root Cause**: The crouton skill file (`.claude/skills/crouton.md`) didn't emphasize docs-first workflow.

**Fix Applied**: Added "CRITICAL: Documentation First" section to skill file with:
- Documentation tool examples (`crouton_list_docs`, `crouton_search_docs`, `crouton_get_doc`)
- Key documentation sections
- When to use docs (before creating config, for field types, etc.)

**Recommendation**: Ensure MCP tools for docs are prominently featured in skill files.

---

### 2. Crouton MCP Server Not Connected

**Problem**: The Crouton MCP server exists but wasn't available in the AI session.

**Location**: `packages/nuxt-crouton-mcp-server/`

**Impact**: AI couldn't use structured tools like `design_schema`, `validate_schema`, `generate_collection`.

**Fix Required**: Add to Claude Code settings:
```json
{
  "mcpServers": {
    "crouton": {
      "command": "node",
      "args": ["./packages/nuxt-crouton-mcp-server/dist/index.js"]
    }
  }
}
```

---

### 3. Drizzle ORM Version Mismatch

**Problem**: Type errors in generated code due to mismatched drizzle-orm versions.

**Symptoms**:
```
Type 'SQLiteColumn<...drizzle-orm@0.38.4...>' is not assignable to type 'SQLiteColumn<...drizzle-orm@0.45.1...>'
```

**Root Cause**:
- Test app had `drizzle-orm@0.38.4`
- Auth package uses `drizzle-orm@0.45.1`

**Fix Applied**: Updated test app to use `drizzle-orm@^0.45.1` and `drizzle-kit@^0.31.4`

**Recommendation**:
- Document required drizzle versions in getting-started docs
- Consider having generator check/warn about version mismatches
- Add drizzle versions to dependency check in CLI

---

### 4. Schema Index Export Path Issue

**Problem**: Generator writes package import that doesn't work with drizzle-kit:
```typescript
// Generated (doesn't work)
export * from '@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth'
```

**Error**:
```
ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './server/database/schema/auth'
is not defined by "exports" in package.json
```

**Workaround**: Playground uses direct relative path:
```typescript
// Works
export * from '../../../../../packages/nuxt-crouton-auth/server/database/schema/auth'
```

**Recommendation**:
- Update generator to use direct path for monorepo setups
- Or add the export to nuxt-crouton-auth package.json exports field

---

### 5. Workspace Install Location

**Problem**: Running `pnpm install` from `apps/test/` fails with:
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND: "@friendlyinternet/nuxt-crouton@workspace:*"
is in the dependencies but no package named "@friendlyinternet/nuxt-crouton"
is present in the workspace
```

**Fix**: Must run `pnpm install` from monorepo root (`/Users/pmcp/Projects/nuxt-crouton/`)

**Recommendation**: Add note to test app README or getting-started docs.

---

## What Worked Well

1. **Config-based generation** - `crouton.config.js` format is clean and documented
2. **Dependency detection** - Generator correctly identified missing `nuxt-crouton` and `nuxt-crouton-auth`
3. **Schema index management** - Auto-updates `server/database/schema/index.ts`
4. **CSS source directive** - Auto-adds Tailwind `@source` for layer components
5. **Layer extension** - Auto-updates `nuxt.config.ts` extends array

---

## Files Modified During Testing

| File | Change |
|------|--------|
| `.claude/skills/crouton.md` | Added docs-first guidance |
| `apps/test/package.json` | Added workspace deps, drizzle versions |
| `apps/test/nuxt.config.ts` | Added extends array, hub config |
| `apps/test/drizzle.config.ts` | Created for db migrations |
| `apps/test/server/database/schema/index.ts` | Fixed auth schema path |

---

## Action Items

- [ ] Add Crouton MCP to project `.claude/settings.json`
- [ ] Document drizzle version requirements in getting-started
- [ ] Fix generator to use direct path for auth schema export
- [ ] Add workspace install note to docs
- [ ] Consider version mismatch warning in CLI