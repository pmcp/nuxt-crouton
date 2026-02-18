# CLAUDE.md - @fyit/crouton-cli

## Package Purpose

CLI tool that generates complete CRUD collections for Nuxt Crouton applications. Creates API endpoints, Vue components, database schemas, composables, and types from a JSON schema definition.

## CLI Commands

```bash
crouton <layer> <collection> [options]       # Generate single collection
crouton config [path] [--only name]          # Generate from config file
crouton add <modules...>                     # Add Crouton modules to project
crouton add --list                           # List available modules
crouton install                              # Install required modules
crouton init <name> [options]                 # Full pipeline: scaffold → generate → doctor
crouton rollback <layer> <collection>        # Remove collection
crouton rollback-interactive                 # Interactive removal UI
crouton seed-translations                    # Seed i18n data
```

## Add Command (Module Installation)

Add Crouton modules with automatic configuration:

```bash
# Add a single module
crouton add auth

# Add multiple modules
crouton add bookings i18n

# Preview what would be done
crouton add auth --dry-run

# Skip migration generation
crouton add auth --skip-migrations

# Force reinstall
crouton add auth --force

# List available modules
crouton add --list
```

### Add Command Options

| Option | Description |
|--------|-------------|
| `--skip-migrations` | Skip running `npx nuxt db:generate` and `db:migrate` |
| `--skip-install` | Skip `pnpm add` (assume already installed) |
| `--dry-run` | Preview what would be done without making changes |
| `--force` | Force reinstall even if already installed |
| `--list` | List all available modules |

### Available Modules

| Module | Package | Has Schema | Description |
|--------|---------|------------|-------------|
| `auth` | `@fyit/crouton-auth` | ● | Authentication with Better Auth (**bundled in core**) |
| `i18n` | `@fyit/crouton-i18n` | ● | Multi-language support (**bundled in core**) |
| `admin` | `@fyit/crouton-admin` | ○ | Admin dashboard (**bundled in core**) |
| `bookings` | `@fyit/crouton-bookings` | ○ | Booking system |
| `editor` | `@fyit/crouton-editor` | ○ | Rich text editor |
| `assets` | `@fyit/crouton-assets` | ○ | Asset management |
| `events` | `@fyit/crouton-events` | ○ | Event tracking/audit trail |
| `flow` | `@fyit/crouton-flow` | ○ | Vue Flow graphs |
| `email` | `@fyit/crouton-email` | ○ | Email integration |
| `maps` | `@fyit/crouton-maps` | ○ | Map integration |
| `ai` | `@fyit/crouton-ai` | ○ | AI integration |
| `devtools` | `@fyit/crouton-devtools` | ○ | Nuxt Devtools |

● = Has database schema (will update `server/db/schema.ts`)
○ = No database tables
**bundled in core** = Automatically included when using `@fyit/crouton-core`

⚠️ **WARNING**: Do NOT add bundled packages (`auth`, `i18n`, `admin`) to your
`nuxt.config.ts` extends array separately. They are already included via
`@fyit/crouton-core`. Adding them separately causes duplicate layer loading
and SSR errors like `$setup.t is not a function`.

### What `crouton add` Does

1. **Validates** module exists and dependencies are installed
2. **Installs** package via detected package manager (pnpm/yarn/npm)
3. **Updates** `nuxt.config.ts` - adds to `extends` array
4. **Updates** `server/db/schema.ts` - adds schema export (if applicable)
5. **Generates** migrations with `npx nuxt db:generate` (if applicable)
6. **Applies** migrations with `npx nuxt db:migrate` (if applicable)

## Init Command (Full Pipeline)

Single entry point to go from nothing to a working app:

```bash
# Create app with default settings
crouton init my-app

# With features and theme
crouton init my-app --features bookings,pages,editor --theme ko

# Preview without writing
crouton init my-app --dry-run
```

### Init Options

| Option | Description |
|--------|-------------|
| `--features <list>` | Comma-separated features (e.g., `bookings,pages,editor`) |
| `--theme <name>` | Theme to wire into extends (e.g., `ko`) |
| `-d, --dialect <type>` | `sqlite` or `pg` (default: sqlite) |
| `--no-cf` | Skip Cloudflare-specific config |
| `--dry-run` | Preview without writing files |

### What `crouton init` Does

1. **scaffold-app** — Creates the app skeleton (nuxt.config, package.json, schemas/, etc.)
2. **generate** — Generates collections from `crouton.config.js` (if collections are defined)
3. **doctor** — Validates everything is wired correctly
4. **Summary** — Prints next steps (dev server, deploy)

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
| `bin/crouton-generate.js` | CLI entry point (citty with 11 subcommands) |
| `lib/generate-collection.ts` | Main orchestrator (~74KB) |
| `lib/init-app.ts` | Init pipeline (scaffold → generate → doctor) |
| `lib/generators/*.ts` | Template generators (14 files) |
| `lib/module-registry.ts` | Module definitions for `crouton add` |
| `lib/add-module.ts` | Module installation implementation |
| `lib/utils/helpers.ts` | Case conversion, type mapping |
| `lib/utils/dialects.ts` | PostgreSQL/SQLite configs |
| `lib/utils/detect-package-manager.ts` | Detect pnpm/yarn/npm |
| `lib/utils/update-nuxt-config.ts` | Update nuxt.config.ts extends |
| `lib/utils/update-schema-index.ts` | Update schema exports |

## Generators Structure

```
lib/generators/
├── form-component.ts      → Form.vue (Zod validation)
├── list-component.ts      → List.vue (data table)
├── composable.ts          → use[Collection].ts
├── api-endpoints.ts       → GET/POST/PATCH/DELETE
├── database-schema.ts     → Drizzle schema
├── database-queries.ts    → Query functions
├── seed-data.ts           → seed.ts (drizzle-seed data)
├── types.ts               → TypeScript interfaces
├── nuxt-config.ts         → Layer config
└── field-components.ts    → Dependent field components
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
| `nullable` | boolean | Allow null values (generates `.nullish()` instead of `.optional()`) |
| `component` | string | Custom component name override |
| `translatableProperties` | string[] | (Repeater) Properties to support per-item translations |
| `properties` | object | (Repeater) Typed property definitions for repeater items |

### Translatable Fields Pattern

When a field has `translatable: true`, the root-level column becomes a cache/fallback.
The actual value lives in `translations.{locale}.fieldName`.

**Important:** Translatable fields should have `required: false` at the root level,
because the value is derived from translations, not stored directly.

```json
// ✅ Correct: translatable field is NOT required
{
  "title": {
    "type": "string",
    "translatable": true,
    "meta": {
      "required": false,
      "label": "Title"
    }
  }
}

// ❌ Wrong: Will fail when title only exists in translations!
{
  "title": {
    "type": "string",
    "translatable": true,
    "meta": {
      "required": true,
      "label": "Title"
    }
  }
}
```

**Why this matters:**
- When creating a record, the form may only populate `translations.en.title`
- If the root `title` column has `NOT NULL` constraint, the insert fails
- Making it nullable allows the root column to be empty while translations hold the values

### Translatable Repeater Fields

Repeater fields can support per-item translations using `translatableProperties` and `properties`:

```json
{
  "slots": {
    "type": "repeater",
    "meta": {
      "translatableProperties": ["label", "description"],
      "properties": {
        "label": { "type": "string", "required": true, "label": "Slot Name" },
        "description": { "type": "text", "label": "Description" },
        "value": { "type": "string", "label": "Slot ID" },
        "maxCapacity": { "type": "number", "label": "Max Capacity" }
      }
    }
  }
}
```

**Generated data structure:**
```typescript
{
  id: "abc123",
  label: "morning",           // English (default)
  description: "Morning slot",
  value: "slot-1",            // Non-translatable
  translations: {
    label: { nl: "ochtend", fr: "matin" },
    description: { nl: "Ochtendslot", fr: "Créneau du matin" }
  }
}
```

**Generated artifacts:**
- `types.ts`: Item interface with translations support
- `use[Collection].ts`: Typed Zod schema for repeater items
- `[Field]/Input.vue`: Language tabs with completion indicators

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
| image | `z.string()` | `string` | `''` |
| file | `z.string()` | `string` | `''` |
| repeater | `z.array(z.any())` or typed¹ | `any[]` or typed¹ | `[]` |
| array | `z.array(z.string())` | `string[]` | `[]` |

¹ When `meta.properties` is defined, generates typed item schema (see Translatable Repeater Fields)

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

The `crouton.config.js` is a **unified configuration** that serves both:
- **CLI**: Collection generation (collections, targets, dialect)
- **Module**: Feature flags (features section, read by `getCroutonLayers()`)

```javascript
// crouton.config.js
export default {
  // Feature flags - which crouton packages to enable
  // Used by getCroutonLayers() in nuxt.config.ts
  features: {
    // Core (enabled by default): auth, admin, i18n
    editor: true,     // TipTap rich text
    pages: true,      // CMS pages
    // bookings: true // Enable booking system
  },

  // Collection generation (used by CLI)
  collections: [
    { name: 'products', fieldsFile: './schemas/products.json', hierarchy: true },
    { name: 'authors', fieldsFile: './schemas/authors.json', seed: true },          // seed with defaults
    { name: 'posts', fieldsFile: './schemas/posts.json', seed: { count: 50 } },     // seed with custom count
    { name: 'bookings', fieldsFile: './schemas/bookings.json', collab: true },      // enable collab presence
    { name: 'pages', fieldsFile: './schemas/pages.json', formComponent: 'CroutonPagesForm' }  // use package form
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

### Features Reference

**IMPORTANT:** `@fyit/crouton-core` automatically bundles auth, admin, and i18n.
DO NOT add these to your `nuxt.config.ts` extends array separately - doing so
causes duplicate layer loading and SSR errors (e.g., `$setup.t is not a function`).

| Feature | Default | Description |
|---------|---------|-------------|
| `auth` | bundled | Authentication (Better Auth) - **included in core** |
| `admin` | bundled | Admin dashboard - **included in core** |
| `i18n` | bundled | Multi-language support - **included in core** |
| `editor` | `false` | TipTap rich text editor |
| `pages` | `false` | CMS pages system |
| `bookings` | `false` | Booking system |
| `sales` | `false` | Point of Sale |
| `email` | `false` | Email with Resend |
| `assets` | `false` | Media library |
| `events` | `false` | Audit trail |
| `ai` | `false` | AI/LLM integration (see below) |
| `collab` | `false` | Real-time collaboration |

### AI Feature Configuration

The `ai` feature supports both boolean and object configuration:

```javascript
features: {
  // Simple: uses OpenAI gpt-4o-mini by default
  ai: true,

  // With options: specify model (auto-detects provider from model name)
  ai: { defaultModel: 'claude-sonnet-4-20250514' },  // Uses Anthropic
  ai: { defaultModel: 'gpt-4o' },                     // Uses OpenAI
}
```

**Environment variables required:**
- `NUXT_OPENAI_API_KEY` - For OpenAI models (gpt-*, o1-*, o3-*)
- `NUXT_ANTHROPIC_API_KEY` - For Anthropic models (claude-*)

### Collection Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Collection name (required) |
| `fieldsFile` | string | Path to JSON schema file (required) |
| `hierarchy` | boolean \| object | Enable tree structure with parent/child relationships |
| `sortable` | boolean \| object | Enable drag-drop reordering |
| `seed` | boolean \| object | Generate seed data file with Faker |
| `collab` | boolean | Enable real-time presence indicators |
| `translatable` | boolean | Mark all string fields as translatable |
| `formComponent` | string | Use a custom form component instead of generating Form.vue |
| `publishable` | boolean | Auto-register as page type in crouton-pages (requires crouton-pages) |

### formComponent Option

When a Crouton package (like `@fyit/crouton-pages`) provides its own form component, you can skip generating a redundant Form.vue by specifying `formComponent`:

```javascript
collections: [
  {
    name: 'pages',
    fieldsFile: './schemas/pages.json',
    formComponent: 'CroutonPagesForm',  // Use package-provided form
    hierarchy: true
  }
]
```

**What this does:**
1. Skips generating `Form.vue` in the collection directory
2. Sets `componentName` in the composable to the specified component name
3. The package's form component is used instead for create/edit operations

**When to use:**
- When using `@fyit/crouton-pages` with `features.pages: true` → use `formComponent: 'CroutonPagesForm'`
- When using `@fyit/crouton-bookings` with custom forms → use `formComponent: 'CroutonBookingsForm'`
- When you have a custom form component that handles the collection's data entry

**Dry-run output:**
```
• Form.vue skipped (using CroutonPagesForm)
• layers/pages/collections/pages/app/components/List.vue
...
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
1. Create `lib/generators/{name}.ts`
2. Export async function that returns file content string
3. Import in `lib/generate-collection.ts`
4. Call generator in appropriate step

### Add a new field type
1. Add type mapping in `lib/utils/helpers.ts` (getTypeMapping function)
2. Update Zod schema in `lib/generators/composable.ts`
3. Update form component in `lib/generators/form-component.ts`
4. Add Drizzle type in `lib/utils/dialects.ts`

### Image and File Field Types
- `image` → renders `<CroutonAssetsPicker v-model="..." :crop="true" />` in forms, stores `VARCHAR(255)` (asset ID)
- `file` → renders `<CroutonAssetsPicker v-model="..." />` in forms (no crop), stores `VARCHAR(255)` (asset ID)
- Both are auto-detected by `asset-detector.ts` as asset references (like `refTarget: "assets"`)

### Add new CLI option
1. Add option to `bin/crouton-generate.js` using Commander
2. Pass to `generateCollection()` in flags object
3. Handle in `lib/generate-collection.ts`

### Debug generation
1. Use `--dry-run` to preview output
2. Check `lib/generate-collection.ts` for step order
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

With `collab: true` (in config):
- Adds `show-collab-presence` prop to List.vue
- Adds `useSession()` and `collabConfig` computed to script
- Requires `@fyit/crouton-collab` to be extended

## Team Authentication

All generated collections are team-scoped. The generator:
- Imports team auth from `@fyit/crouton-auth/server/utils/team`
- Uses `resolveTeamAndCheckMembership()` for membership validation
- Requires the core `@fyit/crouton` package (which bundles auth, admin, and i18n)

**Note:** The core package (`@fyit/crouton`) automatically includes:
- `@fyit/crouton-auth` - Team-based authentication
- `@fyit/crouton-admin` - Admin dashboard
- `@fyit/crouton-i18n` - Internationalization

You only need to add the core package to your `nuxt.config.ts` extends array.

**Note**: The `useTeamUtility` flag has been removed. All collections are now team-scoped by default.

## Dependencies

- **Extends**: None (standalone CLI)
- **Works with**: `@fyit/crouton`
- **CLI deps**: citty (CLI framework), @clack/prompts (interactive prompts), consola (logging), c12 (config loading), magicast (AST config modification)

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
| `lib/utils/helpers.ts` | Case conversion, type mapping, seed generators |
| `lib/generators/types.ts` | TypeScript type generation (snapshot) |
| `lib/generators/composable.ts` | Composable generation (snapshot) |

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

- [ ] **FormPreview.vue** (if form-component.ts changed)
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
node scripts/validate-field-types-sync.ts
```

These tools will:
1. Extract field types from `lib/utils/helpers.ts`
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
- [ ] `/sync-check` command passed (or `node scripts/validate-field-types-sync.ts`)
- [ ] `npx nuxt typecheck` passed
```
