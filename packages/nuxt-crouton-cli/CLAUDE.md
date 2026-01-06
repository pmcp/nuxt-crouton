# CLAUDE.md - @friendlyinternet/nuxt-crouton-cli

## Package Purpose

CLI tool that generates complete CRUD collections for Nuxt Crouton applications. Creates API endpoints, Vue components, database schemas, composables, and types from a JSON schema definition.

## CLI Commands

```bash
crouton <layer> <collection> [options]       # Generate single collection
crouton config [path] [--only name]          # Generate from config file
crouton install                              # Install required modules
crouton init [-o path]                       # Create example schema
crouton rollback <layer> <collection>        # Remove collection
crouton rollback-interactive                 # Interactive removal UI
crouton seed-translations                    # Seed i18n data
```

## Key Options

| Option | Description |
|--------|-------------|
| `--fields-file <path>` | Schema JSON file |
| `--dialect <pg\|sqlite>` | Database dialect (default: pg) |
| `--hierarchy` | Enable tree structure |
| `--seed` | Generate seed data file (drizzle-seed) |
| `--count <number>` | Number of seed records (default: 25) |
| `--force` | Overwrite existing files |
| `--no-translations` | Skip i18n fields |
| `--dry-run` | Preview without writing |

## Key Files

| File | Purpose |
|------|---------|
| `bin/crouton-generate.js` | CLI entry point (Commander.js) |
| `lib/generate-collection.mjs` | Main orchestrator (~74KB) |
| `lib/generators/*.mjs` | Template generators (14 files) |
| `lib/utils/helpers.mjs` | Case conversion, type mapping |
| `lib/utils/dialects.mjs` | PostgreSQL/SQLite configs |

## Generators Structure

```
lib/generators/
├── form-component.mjs      → Form.vue (Zod validation)
├── list-component.mjs      → List.vue (data table)
├── composable.mjs          → use[Collection].ts
├── api-endpoints.mjs       → GET/POST/PATCH/DELETE
├── database-schema.mjs     → Drizzle schema
├── database-queries.mjs    → Query functions
├── seed-data.mjs           → seed.ts (drizzle-seed data)
├── types.mjs               → TypeScript interfaces
├── nuxt-config.mjs         → Layer config
└── field-components.mjs    → Dependent field components
```

## Schema Format

```json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "name": { "type": "string", "meta": { "required": true, "maxLength": 255, "translatable": true } },
  "price": { "type": "decimal", "meta": { "precision": 10, "scale": 2 } },
  "categoryId": { "type": "string", "refTarget": "categories" }
}
```

### Field Meta Properties

| Property | Type | Description |
|----------|------|-------------|
| `required` | boolean | Field is required |
| `maxLength` | number | Max string length |
| `translatable` | boolean | Enable i18n translation support |
| `default` | any | Default value |
| `primaryKey` | boolean | Mark as primary key |
| `label` | string | Human-readable label |
| `area` | string | Form area: main/sidebar/meta |
| `group` | string | Group fields together (creates tabs when multiple main groups) |
| `options` | string[] | Inline options for USelect dropdown (use with `displayAs: "optionsSelect"`) |
| `displayAs` | string | Display hint: `"optionsSelect"` for dropdowns |
| `optionsCollection` | string | Collection name for database-driven options |
| `optionsField` | string | Field in options collection containing values |
| `creatable` | boolean | Allow creating new options (default: true) |
| `component` | string | Custom component name override |

## Field Types

| Type | Zod | TypeScript | Default |
|------|-----|------------|---------|
| string | `z.string()` | `string` | `''` |
| text | `z.string()` | `string` | `''` |
| number | `z.number()` | `number` | `0` |
| decimal | `z.number()` | `number` | `0` |
| boolean | `z.boolean()` | `boolean` | `false` |
| date | `z.date()` | `Date \| null` | `null` |
| json | `z.record(z.any())` | `Record<string, any>` | `{}` |
| repeater | `z.array(z.any())` | `any[]` | `[]` |
| array | `z.array(z.string())` | `string[]` | `[]` |

## Generated Output

```
layers/[layer]/collections/[collection]/
├── app/
│   ├── components/
│   │   ├── Form.vue
│   │   └── List.vue
│   └── composables/
│       └── use[LayerCollection].ts
├── server/
│   ├── api/teams/[id]/[layer]-[collection]/
│   │   ├── index.get.ts
│   │   ├── index.post.ts
│   │   ├── [id].patch.ts
│   │   └── [id].delete.ts
│   └── database/
│       ├── schema.ts
│       ├── queries.ts
│       └── seed.ts          # Only with --seed flag
├── types.ts
└── nuxt.config.ts
```

## Config File Format

```javascript
// crouton.config.js
export default {
  collections: [
    { name: 'products', fieldsFile: './schemas/products.json', hierarchy: true },
    { name: 'authors', fieldsFile: './schemas/authors.json', seed: true },          // seed with defaults
    { name: 'posts', fieldsFile: './schemas/posts.json', seed: { count: 50 } }      // seed with custom count
  ],
  dialect: 'sqlite',
  seed: {
    defaultCount: 25,           // default records per collection
    defaultTeamId: 'seed-team'  // team ID for seeded data
  },
  targets: [
    { layer: 'shop', collections: ['products'] }
  ],
  flags: {
    noTranslations: false,
    force: false
  }
}
```

## Examples

Example configuration files are in `examples/`:
- `crouton.config.example.js` - Exhaustive config with all options documented
- `crouton.config.products.js` - Minimal single-collection example

## Common Tasks

### Keep examples in sync (IMPORTANT)

When modifying the generator, **always check if examples need updating**:
1. Adding/removing a flag → Update `examples/crouton.config.example.js`
2. Changing schema format → Update example schemas in comments
3. Changing CLI options → Update CLI reference in example comments
4. Changing defaults → Update documented defaults

### Add a new generator template
1. Create `lib/generators/{name}.mjs`
2. Export async function that returns file content string
3. Import in `lib/generate-collection.mjs`
4. Call generator in appropriate step

### Add a new field type
1. Add type mapping in `lib/utils/helpers.mjs` (getTypeMapping function)
2. Update Zod schema in `lib/generators/composable.mjs`
3. Update form component in `lib/generators/form-component.mjs`
4. Add Drizzle type in `lib/utils/dialects.mjs`

### Add new CLI option
1. Add option to `bin/crouton-generate.js` using Commander
2. Pass to `generateCollection()` in flags object
3. Handle in `lib/generate-collection.mjs`

### Debug generation
1. Use `--dry-run` to preview output
2. Check `lib/generate-collection.mjs` for step order
3. Individual generators are isolated - test in isolation

## Naming Conventions

```
Collection: products
Layer: shop
→ API path: /api/teams/[id]/shop-products/
→ Component: ShopProductsForm, ShopProductsList
→ Composable: useShopProducts
→ Schema export: shopProducts
```

## Auto-Generated Fields

Always added to schema:
- `id` - Primary key (uuid/nanoid)
- `teamId` - Team association (always team-scoped)
- `createdAt`, `updatedAt` - Timestamps
- `createdBy`, `updatedBy` - User tracking

With `--hierarchy`:
- `parentId`, `path`, `depth`, `order`

## Team Authentication

All generated collections are team-scoped. The generator:
- Imports team auth from `@crouton/auth/server` (NOT `#crouton/team-auth`)
- Uses `resolveTeamAndCheckMembership()` for membership validation
- Requires `@crouton/auth` package to be installed in the consuming project

**Note**: The `useTeamUtility` flag has been removed. All collections are now team-scoped by default.

## Dependencies

- **Extends**: None (standalone CLI)
- **Works with**: `@friendlyinternet/nuxt-crouton`
- **Dev deps**: commander, chalk, inquirer, ora, fs-extra

## Testing

```bash
# Run unit tests
pnpm test

# Watch mode for development
pnpm test:watch

# Test generation (dry run)
crouton shop products --fields-file=schema.json --dry-run

# Test with config
crouton config ./crouton.config.js --dry-run

# Verify generated code
npx nuxt typecheck
```

### Test Coverage

| File | Tests |
|------|-------|
| `lib/utils/helpers.mjs` | Case conversion, type mapping, seed generators |
| `lib/generators/types.mjs` | TypeScript type generation (snapshot) |
| `lib/generators/composable.mjs` | Composable generation (snapshot) |

## Seed Data Generation

Generate realistic test data using drizzle-seed + Faker.

### CLI Usage

```bash
# Generate collection with seed file
crouton shop products --fields-file=schema.json --seed

# Generate with custom seed count
crouton shop products --fields-file=schema.json --seed --count=100
```

### Config Usage

```javascript
collections: [
  { name: 'products', fieldsFile: './schema.json', seed: true },           // default 25 records
  { name: 'authors', fieldsFile: './schema.json', seed: { count: 100 } }   // custom count
]
```

### Running Seeds

```bash
# Execute seed file directly
npx tsx ./layers/shop/collections/products/server/database/seed.ts

# Or import and call with options
import { seedShopProducts } from './layers/shop/collections/products/server/database/seed'
await seedShopProducts({ count: 50, teamId: 'my-team', reset: true })
```

### Field-to-Generator Mapping

The generator auto-detects field types and generates appropriate data:
- `email` fields → `f.email()`
- `name`, `fullName` → `f.fullName()`
- `title` → `f.loremIpsum({ sentencesCount: 1 })`
- `description`, `content` → `f.loremIpsum({ sentencesCount: 3 })`
- `price`, `amount` → `f.number({ minValue: 1, maxValue: 1000 })`
- Foreign keys → placeholder values with dependency comments

---

## Documentation Sync Workflow (MANDATORY)

**CRITICAL**: After ANY change to this package, Claude MUST follow this workflow to keep all artifacts in sync.

### Artifacts That Must Stay in Sync

| Artifact | Location | Update When |
|----------|----------|-------------|
| This CLAUDE.md | `packages/nuxt-crouton-cli/CLAUDE.md` | CLI, options, field types, key files change |
| README.md | `packages/nuxt-crouton-cli/README.md` | User-facing features change |
| Example configs | `examples/crouton.config.*.js` | Flags, schema format, defaults change |
| Claude Skill | `.claude/skills/crouton.md` | Field types, workflow, commands change |
| MCP Server | `packages/nuxt-crouton-mcp-server/` | CLI commands, field types change |
| Auth Package | `packages/nuxt-crouton-auth/CLAUDE.md` | If `@crouton/auth/server` exports change |
| External Docs | `apps/docs/content/` | Any user-facing change |
| FormPreview.vue | `packages/nuxt-crouton-schema-designer/.../FormPreview.vue` | Form component mapping changes |

### Step 1: Classify Your Change

Before finishing, identify what type of change you made:

| Change Type | Sync Required |
|-------------|---------------|
| Internal refactor | None |
| Bug fix | Maybe external docs (if behavior changed) |
| New field type | **All artifacts** |
| New CLI flag/option | CLAUDE.md, README, Skill, MCP, External docs |
| New command | CLAUDE.md, README, Skill, MCP, External docs |
| Config format change | CLAUDE.md, README, Examples, Skill, External docs |
| Generator template change | CLAUDE.md (Key Files), maybe External docs |
| Form component mapping change | FormPreview.vue, External docs |

### Step 2: Update Package Documentation

For non-internal changes:

- [ ] **This CLAUDE.md**
  - [ ] CLI Commands section (if commands changed)
  - [ ] Key Options table (if options changed)
  - [ ] Field Types table (if types changed)
  - [ ] Key Files table (if files added/removed)
  - [ ] Common Tasks (if workflows changed)

- [ ] **README.md**
  - [ ] Usage examples
  - [ ] Options documentation
  - [ ] Feature descriptions

- [ ] **Example configs** (`examples/`)
  - [ ] Add new flags/options with comments
  - [ ] Update defaults if changed

- [ ] **FormPreview.vue** (if form-component.mjs changed)
  - [ ] Field type to component mapping
  - [ ] Form layout structure (CroutonFormLayout slots)
  - [ ] Default values for field types

### Step 3: Update Claude Skill

If field types, commands, or workflow changed:

- [ ] Update `.claude/skills/crouton.md`
  - [ ] Field Types table
  - [ ] Quick Reference section
  - [ ] Examples (if affected)

### Step 4: Update MCP Server

If CLI commands, flags, or field types changed:

- [ ] Update `packages/nuxt-crouton-mcp-server/` (when implemented)
  - [ ] Field type definitions
  - [ ] Tool input schemas
  - [ ] Tool handlers

### Step 5: Update External Documentation

For ANY user-facing change:

```bash
# Search for references in external docs (from monorepo root)
grep -r "crouton" apps/docs/content --include="*.md" | head -20
```

- [ ] Update affected documentation pages
- [ ] Update code examples if syntax changed

### Step 6: Verify Sync

After completing updates, verify everything is in sync:

**Option 1: Use the `/sync-check` slash command in Claude Code**
```
/sync-check
```

**Option 2: Run the CI validation script**
```bash
node scripts/validate-field-types-sync.mjs
```

These tools will:
1. Extract field types from `lib/utils/helpers.mjs`
2. Compare with MCP server field types
3. Compare with Claude skill field types
4. Report any mismatches with fix instructions

### Pre-Commit Hook (Optional)

Install the pre-commit hook to get sync reminders when committing generator changes:

```bash
cp .claude/hooks/pre-commit-sync-reminder .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

See `.claude/hooks/README.md` for more options.

### Quick Sync Checklist (Copy-Paste)

```markdown
## Sync Checklist for [describe change]

**Change Type**: [ ] Internal [ ] Bug Fix [ ] Field Type [ ] CLI [ ] Config

### Package Docs
- [ ] CLAUDE.md updated
- [ ] README.md updated
- [ ] Examples updated

### External Artifacts
- [ ] `.claude/skills/crouton.md` updated
- [ ] MCP Server updated (if exists)
- [ ] External docs checked

### Verification
- [ ] `/sync-check` command passed (or `node scripts/validate-field-types-sync.mjs`)
- [ ] `npx nuxt typecheck` passed
```
