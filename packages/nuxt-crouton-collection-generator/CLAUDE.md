# CLAUDE.md - @friendlyinternet/nuxt-crouton-collection-generator

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
├── types.mjs               → TypeScript interfaces
├── nuxt-config.mjs         → Layer config
└── field-components.mjs    → Dependent field components
```

## Schema Format

```json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "name": { "type": "string", "meta": { "required": true, "maxLength": 255 } },
  "price": { "type": "decimal", "meta": { "precision": 10, "scale": 2 } },
  "categoryId": { "type": "string", "refTarget": "categories" }
}
```

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
│       └── queries.ts
├── types.ts
└── nuxt.config.ts
```

## Config File Format

```javascript
// crouton.config.js
export default {
  collections: [
    { name: 'products', fieldsFile: './schemas/products.json', hierarchy: true }
  ],
  dialect: 'sqlite',
  targets: [
    { layer: 'shop', collections: ['products'] }
  ],
  flags: {
    noTranslations: false,
    force: false
  }
}
```

## Common Tasks

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
- `teamId` - Team association
- `createdAt`, `updatedAt` - Timestamps
- `createdBy`, `updatedBy` - User tracking

With `--hierarchy`:
- `parentId`, `path`, `depth`, `order`

## Dependencies

- **Extends**: None (standalone CLI)
- **Works with**: `@friendlyinternet/nuxt-crouton`
- **Dev deps**: commander, chalk, inquirer, ora, fs-extra

## Testing

```bash
# Test generation (dry run)
crouton shop products --fields-file=schema.json --dry-run

# Test with config
crouton config ./crouton.config.js --dry-run

# Verify generated code
npx nuxt typecheck
```
