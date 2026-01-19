---
title: Generator Commands
description: Learn how to use Nuxt Crouton generator commands to create collections
icon: i-heroicons-command-line
---

Nuxt Crouton provides CLI commands to generate collections quickly. You can generate single collections or use a configuration file to generate multiple collections at once.

```bash
# Basic syntax
npx crouton-generate <layer> <collection> --fields-file <schema-file>

# Example
npx crouton-generate shop products --fields-file ./schemas/product-schema.json
```

## Single Collection

Use the basic command to generate a single collection. The `--fields-file` option (required) specifies the path to your schema JSON file. Additional options include `--force` to overwrite files, `--no-db` to skip database generation, and `--dry-run` to preview changes.

```bash
npx crouton-generate shop products --fields-file ./schemas/product-schema.json
```

The generator creates several files in your project:

```
layers/[layer]/
  ├── components/
  │   └── [collection]/
  │       ├── List.vue       # Table/list view
  │       ├── Form.vue       # Create/edit form
  │       └── Table.vue      # Table component
  ├── composables/
  │   └── use[Collection].ts # Validation, columns, defaults
  └── types/
      └── [collection].ts    # TypeScript types
```

## Multi-Collection Configuration

For larger projects with multiple collections, create a configuration file and generate everything at once:

```bash
# Generate from config
npx crouton-generate config ./crouton.config.js

# With options
npx crouton-generate config ./crouton.config.js --force --preview
```

### Config File Format

```javascript
// crouton.config.js
export default {
  collections: [
    { name: 'products', fieldsFile: './schemas/product-schema.json' },
    { name: 'categories', fieldsFile: './schemas/category-schema.json' },
  ],
  targets: [
    {
      layer: 'shop',
      collections: ['products', 'categories']
    }
  ],
  dialect: 'sqlite',
  flags: {
    useMetadata: true,       // Add createdAt/updatedAt timestamps
    force: false,
    noTranslations: false,
    noDb: false
  }
}
```

### Configuration Flags

::callout{icon="i-heroicons-information-circle" color="blue"}
**Team-Scoped by Default:** All generated collections include team-based authentication. The generator automatically adds `teamId` and `userId` fields and uses `@crouton/auth/server` for authentication.
::

::callout{icon="i-heroicons-exclamation-triangle" color="amber"}
**Important:** Do NOT define `teamId` or `userId` in your schema JSON files. The generator adds them automatically, and manual definitions will cause duplicate key errors.
::

See [Team-Based Authentication](/advanced/team-based-auth) for usage examples.

#### `useMetadata` (boolean, default: `true`)

Automatically adds timestamp fields to track record creation and updates. When set to `true`:

**Database schema changes:**
- Automatically adds `createdAt` timestamp field (auto-populated on record creation)
- Automatically adds `updatedAt` timestamp field (auto-updated on record modification)

**Database behavior:**
- `createdAt` is set automatically when a record is created
- `updatedAt` is set automatically whenever a record is modified
- Both fields use the database's native timestamp type

**When to disable (`false`):**
- You want to implement custom timestamp tracking
- You're integrating with an existing database schema
- You need different timestamp field names or behavior

::callout{icon="i-heroicons-exclamation-triangle" color="amber"}
**Important:** Do NOT define `createdAt` or `updatedAt` in your schema JSON files when this flag is enabled. The generator adds them automatically, and manual definitions will cause duplicate key errors.
::

### Example: Generate Multiple Collections

```bash
# Create config file
cat > crouton.config.js << 'EOF'
export default {
  collections: [
    { name: 'products', fieldsFile: './schemas/product-schema.json' },
    { name: 'categories', fieldsFile: './schemas/category-schema.json' },
    { name: 'orders', fieldsFile: './schemas/order-schema.json' },
  ],
  targets: [
    {
      layer: 'shop',
      collections: ['products', 'categories', 'orders']
    }
  ],
  dialect: 'sqlite'
}
EOF

# Generate all collections at once
npx crouton-generate config ./crouton.config.js
```

## Helper Commands

### Initialize Example Schema

Create an example schema file to get started:

```bash
crouton-generate init

# Output: Creates crouton-schema.json with example fields
```

**Custom output path**:
```bash
crouton-generate init --output=./schemas/product-schema.json
```

**Generated Schema**:
```json
{
  "id": {
    "type": "string",
    "meta": { "primaryKey": true }
  },
  "name": {
    "type": "string",
    "meta": { "required": true, "maxLength": 255 }
  },
  "description": {
    "type": "text"
  },
  "price": {
    "type": "decimal",
    "meta": { "precision": 10, "scale": 2 }
  },
  "inStock": {
    "type": "boolean"
  },
  "createdAt": {
    "type": "date"
  }
}
```

After creation, you can generate a collection:
```bash
crouton-generate shop products --fields-file=crouton-schema.json
```

### Install Required Modules

Install Nuxt Crouton and dependencies:

```bash
crouton-generate install
```

This installs:
- `@fyit/crouton`
- Required peer dependencies
- Updates nuxt.config.ts with extends

**Manual installation**:
```bash
pnpm add @fyit/crouton
```

Then update nuxt.config.ts:
```typescript
export default defineNuxtConfig({
  extends: ['@fyit/crouton']
})
```

## Rollback Commands

See [Rollback & Undo Guide](/guides/rollback) for complete documentation on removing collections.

**Quick reference**:
```bash
# Remove single collection
crouton-rollback <layer> <collection>

# Remove entire layer
crouton-rollback-bulk --layer=<name>

# Interactive removal
crouton-rollback-interactive
```

## Complete CLI Flags Reference

### Generation Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fields-file` | string | required | Path to JSON schema file |
| `--dialect` | string | `sqlite` | Database dialect: `sqlite` or `pg` |
| `--config` | string | - | Use config file instead of CLI args |
| `--dry-run` | boolean | `false` | **Preview mode** - Show what would be generated without creating files |
| `--force` | boolean | `false` | Force generation even if files exist (overwrites) |
| `--no-translations` | boolean | `false` | Skip translation field generation |
| `--no-db` | boolean | `false` | Skip database schema generation |
| `--auto-relations` | boolean | `false` | Add relation stub comments in generated code |

### Preview Mode (--dry-run)

See exactly what will be generated before creating any files:

```bash
crouton-generate shop products --fields-file=product-schema.json --dry-run

# Output:
📋 Preview: Would generate the following files:

layers/shop/
  ├── components/products/
  │   ├── List.vue (new)
  │   ├── _Form.vue (new)
  │   └── Table.vue (new)
  ├── composables/
  │   └── useProducts.ts (new)
  └── types/
      └── products.ts (new)

Total: 5 files (5 new)

Would also update:
  - app.config.ts (add products collection)

Proceed? (y/n)
```

**Use when**:
- First time generating a collection
- Unsure about file placement
- Checking if files will be overwritten
- Testing a new schema structure

### Force Mode (--force)

Overwrite existing files without prompting:

```bash
crouton-generate shop products --fields-file=product-schema.json --force
```

**⚠️ Warning**: This will overwrite any customizations you made to generated files.

**Safe workflow**:
```bash
# 1. Check what would be overwritten
crouton-generate shop products --fields-file=product-schema.json --dry-run

# 2. Commit your changes
git add .
git commit -m "Save customizations before regenerate"

# 3. Force regenerate
crouton-generate shop products --fields-file=product-schema.json --force
```

### Skip Translations (--no-translations)

Generate without i18n support:

```bash
crouton-generate shop products --fields-file=product-schema.json --no-translations
```

Useful when:
- Building a single-language app
- Adding translations later
- Faster generation for testing

### Skip Database (--no-db)

Generate UI components only, no database schema:

```bash
crouton-generate shop products --fields-file=product-schema.json --no-db
```

Useful when:
- Using an existing database
- Only need frontend components
- Database is managed separately

### Auto Relations (--auto-relations)

Add commented relation stubs in generated code:

```bash
crouton-generate shop products --fields-file=product-schema.json --auto-relations
```

Generates comments like:
```typescript
// TODO: Add relation
// export const productsRelations = relations(products, ({ one }) => ({
//   category: one(categories, {
//     fields: [products.categoryId],
//     references: [categories.id]
//   })
// }))
```

Useful when:
- Planning to add Drizzle relations later
- Want reminders about relation opportunities
- Learning relation patterns

### Config File Options

When using `--config` or `config` command, flags are set in the config file:

```javascript
// crouton.config.js
export default {
  dialect: 'sqlite',
  flags: {
    useMetadata: true,        // Timestamp fields (createdAt/updatedAt)
    force: false,
    noTranslations: false,
    noDb: false,
    autoRelations: true,
    dryRun: false
  }
}
```

CLI flags override config file settings:
```bash
# Config has force: false, but CLI overrides to true
crouton-generate config ./crouton.config.js --force
```

### Common Flag Combinations

**Safe First Generation**:
```bash
crouton-generate shop products --fields-file=schema.json --dry-run
# Review output, then run without --dry-run
```

**Standard SaaS Application**:
```bash
# All collections are team-scoped by default
crouton-generate config ./crouton.config.js
```

**Quick Testing (No DB)**:
```bash
crouton-generate shop products --fields-file=schema.json --no-db --no-translations
```

**Full Featured Generation**:
```bash
crouton-generate shop products --fields-file=schema.json --auto-relations
```

**Force Regenerate**:
```bash
crouton-generate shop products --fields-file=schema.json --force
```

## Next Steps

- Learn about the [Schema Format](/generation/schema-format) for defining your collections
- Explore [Multi-Collection Configuration](/generation/multi-collection) for complex projects
- See [Working with Collections](/fundamentals/collections) to understand the generated code
- Read the [Rollback Guide](/guides/rollback) to learn how to remove collections
