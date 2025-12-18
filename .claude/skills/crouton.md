# Crouton CRUD Generation Skill

This skill helps generate complete CRUD collections for Nuxt Crouton applications.

## CRITICAL: Documentation First

**ALWAYS check the documentation before generating collections.** The docs are comprehensive (54+ pages) and contain the most up-to-date information.

### Documentation Tools (Use These First!)

| Tool | Purpose | Example |
|------|---------|---------|
| `crouton_list_docs` | List all doc pages | Filter by section: `crouton_list_docs({ section: "generation" })` |
| `crouton_search_docs` | Search for topics | `crouton_search_docs({ query: "config file" })` |
| `crouton_get_doc` | Read full doc page | `crouton_get_doc({ path: "generation/multi-collection" })` |

**Key Documentation Sections:**
- `getting-started/` - Installation and first collection
- `generation/` - Schema format, CLI commands, config files
- `patterns/` - Common collection patterns
- `api-reference/` - Composables, components, server utils

**Documentation Location:**
- Local: `apps/docs/content/`
- Live: https://nuxt-crouton-docs.pages.dev/

### When to Use Docs

1. **Before creating any config file** - Check `generation/multi-collection` for proper format
2. **When unsure about field types** - Check `generation/schema-format`
3. **For advanced features** - Check `features/` section
4. **For CLI options** - Check `generation/cli-reference`

## MCP Tools Available

If the Crouton MCP server is configured, you can use these tools for AI-assisted generation:

### Schema & Generation Tools

| Tool | Purpose |
|------|---------|
| `design_schema` | Get field types and schema guidelines |
| `validate_schema` | Validate schema before generation |
| `generate_collection` | Execute CLI generation |
| `list_collections` | List existing collections |
| `list_layers` | List available layers |

### CLI Integration Tools

| Tool | Purpose |
|------|---------|
| `cli_help` | Get CLI command help and usage |
| `dry_run` | Preview generation without writing files |
| `rollback` | Remove a generated collection |
| `init_schema` | Generate starter schema templates |

**MCP Workflow:**
1. Call `design_schema` with collection description (or use `init_schema` for templates)
2. Build schema using returned field types
3. Call `validate_schema` to check schema
4. Call `dry_run` to preview what will be generated
5. Call `generate_collection` to create files

**Quick Commands:**
- Need CLI help? Call `cli_help({ command: "generate" })`
- Want to start with a template? Call `init_schema({ template: "ecommerce" })`
- Made a mistake? Call `rollback({ layer, collection, dryRun: true })` to preview

If MCP tools are not available, follow the manual process below.

## Trigger Phrases

Use this skill when the user mentions:
- "create a collection"
- "generate crud for"
- "add a new collection"
- "scaffold [collection name]"
- "crouton generate"
- "need a [model/entity/table] for"

## Quick Reference

### CLI Options

| Option | Description |
|--------|-------------|
| `--fields-file <path>` | Schema JSON file |
| `--dialect <pg\|sqlite>` | Database dialect (default: sqlite) |
| `--hierarchy` | Enable tree structure |
| `--seed` | Generate seed data file |
| `--count <n>` | Seed record count (default: 25) |
| `--dry-run` | Preview without writing |

### Field Types

| User Says | Schema Type | Example |
|-----------|-------------|---------|
| text, string, name, title | `string` | `"name": { "type": "string" }` |
| long text, description, content | `text` | `"description": { "type": "text" }` |
| number, count, quantity | `number` | `"quantity": { "type": "number" }` |
| price, amount, decimal | `decimal` | `"price": { "type": "decimal", "meta": { "precision": 10, "scale": 2 } }` |
| boolean, yes/no, active | `boolean` | `"active": { "type": "boolean" }` |
| date, timestamp, when | `date` | `"startDate": { "type": "date" }` |
| json, object, settings | `json` | `"settings": { "type": "json" }` |
| list of items, repeater | `repeater` | `"items": { "type": "repeater" }` |
| tags, string list | `array` | `"tags": { "type": "array" }` |

### Common Field Meta Options

```json
{
  "fieldName": {
    "type": "string",
    "meta": {
      "required": true,
      "maxLength": 255,
      "unique": true,
      "component": "EditorSimple",
      "group": "seoSettings"
    },
    "refTarget": "categories"
  }
}
```

## Process

### Step 1: Gather Requirements

Ask the user:
1. Collection name (singular form, e.g., "product")
2. Fields needed (name, type, validation)
3. Layer name (default: use domain name, e.g., "shop" for products)
4. Special features needed:
   - Translations? (i18n for multiple languages)
   - Hierarchy? (parent-child tree structure)
   - Maps? (address/location fields)

### Step 2: Create Schema File

Create a JSON schema file:

```json
// schemas/{collection}.json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "name": { "type": "string", "meta": { "required": true, "maxLength": 255 } },
  "description": { "type": "text" },
  "price": { "type": "decimal", "meta": { "precision": 10, "scale": 2 } },
  "active": { "type": "boolean" },
  "categoryId": { "type": "string", "refTarget": "categories" }
}
```

### Step 3: Create/Update crouton.config.js

```javascript
// crouton.config.js
export default {
  collections: [
    { name: '{collection}', fieldsFile: './schemas/{collection}.json' },
    { name: 'products', fieldsFile: './schemas/products.json', seed: true },  // with seed data
    { name: 'categories', fieldsFile: './schemas/categories.json', seed: { count: 50 } }
  ],
  dialect: 'sqlite',  // or 'pg' for PostgreSQL
  seed: {
    defaultCount: 25,          // default records per collection
    defaultTeamId: 'seed-team' // team ID for seeded data
  },
  targets: [
    { layer: '{layer}', collections: ['{collection}'] }
  ],
  flags: {
    noTranslations: false,  // set true to skip i18n
    force: false
  }
}
```

### Step 4: Run Generator

```bash
# Using config file (recommended)
crouton config

# Or direct command
crouton {layer} {collection} --fields-file=./schemas/{collection}.json --dialect=sqlite
```

### Step 5: Post-Generation

1. Export schema in `server/database/schema/index.ts`:
   ```typescript
   export * from '~/layers/{layer}/collections/{collection}/server/database/schema'
   ```

2. Run database migration:
   ```bash
   pnpm db:generate
   ```

3. Restart dev server

4. Run typecheck:
   ```bash
   npx nuxt typecheck
   ```

## Generated Files

```
layers/{layer}/collections/{collection}/
├── app/
│   ├── components/
│   │   ├── Form.vue          # CRUD form with Zod validation
│   │   └── List.vue          # Data table with actions
│   └── composables/
│       └── use{Layer}{Collection}s.ts  # Schema, columns, config
├── server/
│   ├── api/teams/[id]/{layer}-{collection}s/
│   │   ├── index.get.ts      # GET all / by IDs
│   │   ├── index.post.ts     # CREATE
│   │   ├── [id].patch.ts     # UPDATE
│   │   └── [id].delete.ts    # DELETE
│   └── database/
│       ├── schema.ts         # Drizzle ORM schema
│       ├── queries.ts        # Database operations
│       └── seed.ts           # Seed data (with --seed flag)
├── types.ts                  # TypeScript interfaces
├── nuxt.config.ts           # Layer configuration
└── README.md                # Collection documentation
```

### Running Seed Files

```bash
# Execute seed file directly
npx tsx ./layers/{layer}/collections/{collection}/server/database/seed.ts

# Or import and call programmatically
import { seed{Layer}{Collection}s } from '.../seed'
await seed{Layer}{Collection}s({ count: 100, teamId: 'my-team', reset: true })
```

## Examples

### Simple Product Collection

User: "Create a products collection with name, price, and description"

```json
// schemas/products.json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "name": { "type": "string", "meta": { "required": true } },
  "description": { "type": "text" },
  "price": { "type": "decimal", "meta": { "precision": 10, "scale": 2 } }
}
```

```bash
crouton shop products --fields-file=./schemas/products.json --dialect=sqlite
```

### Collection with References

User: "Create a posts collection with title, content, and author reference"

```json
// schemas/posts.json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "title": { "type": "string", "meta": { "required": true } },
  "content": { "type": "text", "meta": { "component": "EditorSimple" } },
  "authorId": { "type": "string", "refTarget": "users", "refScope": "adapter" }
}
```

### Hierarchical Collection

User: "Create a categories collection with parent-child support"

```bash
crouton shop categories --fields-file=./schemas/categories.json --hierarchy --dialect=sqlite
```

### Collection with Translations

```javascript
// crouton.config.js
export default {
  collections: [
    { name: 'products', fieldsFile: './schemas/products.json' }
  ],
  translations: {
    collections: {
      products: ['name', 'description']
    }
  },
  dialect: 'sqlite',
  targets: [
    { layer: 'shop', collections: ['products'] }
  ]
}
```

## Common Issues

### "Collection not registered"
- Ensure collection is in `app.config.ts` croutonCollections
- Check collection name matches exactly (case-sensitive)

### Type errors after generation
- Run `npx nuxt typecheck`
- Export schema from `server/database/schema/index.ts`

### Form not showing fields
- Check schema JSON is valid
- Verify field types are supported
- Check for meta.primaryKey on id field

## Reference Documentation

- CLI: `packages/nuxt-crouton-cli/CLAUDE.md`
- MCP Server: `packages/nuxt-crouton-mcp-server/CLAUDE.md`
- Core Package: `packages/nuxt-crouton/CLAUDE.md`
- i18n Support: `packages/nuxt-crouton-i18n/CLAUDE.md`