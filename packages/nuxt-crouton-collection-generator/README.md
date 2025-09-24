# 🥖 Nuxt Crouton Collection Generator

A powerful CLI tool for generating complete CRUD collections in Nuxt Crouton applications. Generate API endpoints, components, database schemas, and more with a single command.

## Features

- 🚀 **Complete CRUD Generation** - API endpoints, Vue components, database schemas
- 🗄️ **Multi-Database Support** - PostgreSQL and SQLite
- 🎯 **Type-Safe** - Full TypeScript support with Zod validation
- 🔧 **Customizable** - Modify generated code to fit your needs
- 📦 **Zero Config** - Works out of the box with sensible defaults

## Installation

### Global Installation (Recommended)

```bash
npm install -g @friendlyinternet/nuxt-crouton-collection-generator
```

### Or use with npx

```bash
npx @friendlyinternet/nuxt-crouton-collection-generator <command>
```

## Quick Start

### 1. Create a Schema

First, create a JSON schema file defining your collection fields:

```bash
# Create an example schema
crouton-generate init

# Or create manually
cat > product-schema.json << EOF
{
  "id": {
    "type": "string",
    "meta": {
      "primaryKey": true
    }
  },
  "name": {
    "type": "string",
    "meta": {
      "required": true,
      "maxLength": 255
    }
  },
  "price": {
    "type": "decimal",
    "meta": {
      "precision": 10,
      "scale": 2
    }
  },
  "inStock": {
    "type": "boolean"
  }
}
EOF
```

### 2. Generate the Collection

```bash
crouton-generate shop products --fields-file=product-schema.json
```

This generates:
- Vue components (Form.vue, List.vue)
- Composables with Zod schemas
- API endpoints (GET, POST, PATCH, DELETE)
- Database schema and queries
- TypeScript types

### 3. Update Your Project

After generation:

1. Export the new schema in `server/database/schema/index.ts`:
   ```typescript
   export * from '~/layers/shop/collections/products/server/database/schema'
   ```

2. Run database migrations

3. Restart your Nuxt dev server

## Usage

### Basic Command

```bash
crouton-generate <layer> <collection> [options]
```

### Options

- `--fields-file <path>` - Path to JSON schema file
- `--dialect <pg|sqlite>` - Database dialect (default: pg)
- `--config <path>` - Use a config file
- `--dry-run` - Preview what will be generated
- `--auto-relations` - Add relation stubs in comments

### Using a Config File

Create `crouton.config.js`:

```javascript
export default {
  layer: 'shop',
  collection: 'products',
  fields: {
    id: { type: "string", meta: { primaryKey: true } },
    name: { type: "string", meta: { required: true } },
    price: { type: "decimal", meta: { precision: 10, scale: 2 } }
  },
  dialect: 'pg'
}
```

Then run:
```bash
crouton-generate --config=crouton.config.js
```

## Schema Format

### Supported Types

- `string` - VARCHAR/TEXT field
- `text` - Long text field
- `number` - Integer field
- `decimal` - Decimal/float field
- `boolean` - Boolean field
- `date` - Timestamp field
- `json` - JSON/JSONB field

### Field Metadata

```json
{
  "fieldName": {
    "type": "string",
    "meta": {
      "primaryKey": true,      // Mark as primary key
      "required": true,         // Field is required
      "unique": true,          // Add unique constraint
      "maxLength": 255,        // Maximum string length
      "precision": 10,         // Decimal precision
      "scale": 2              // Decimal scale
    }
  }
}
```

## Generated Structure

```
layers/[layer]/collections/[collection]/
├── app/
│   ├── components/
│   │   ├── Form.vue         # CRUD form with validation
│   │   └── List.vue         # Data table with actions
│   └── composables/
│       └── use[Collection].ts   # Zod schema, columns, config
├── server/
│   ├── api/teams/[id]/[collection]/
│   │   ├── index.get.ts     # GET all/by IDs
│   │   ├── index.post.ts    # CREATE
│   │   ├── [id].patch.ts    # UPDATE
│   │   └── [id].delete.ts   # DELETE
│   └── database/
│       ├── queries.ts       # Database query functions
│       └── schema.ts        # Drizzle schema
├── types.ts                 # TypeScript interfaces
└── nuxt.config.ts          # Layer configuration
```

## Examples

### E-commerce Products

```bash
# Create schema
cat > products.json << EOF
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "name": { "type": "string", "meta": { "required": true } },
  "description": { "type": "text" },
  "price": { "type": "decimal", "meta": { "precision": 10, "scale": 2 } },
  "inStock": { "type": "boolean" },
  "categoryId": { "type": "string" }
}
EOF

# Generate
crouton-generate shop products --fields-file=products.json
```

### User Management

```bash
# Create schema
cat > users.json << EOF
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "email": { "type": "string", "meta": { "required": true, "unique": true } },
  "name": { "type": "string", "meta": { "required": true } },
  "role": { "type": "string" },
  "active": { "type": "boolean" },
  "createdAt": { "type": "date" }
}
EOF

# Generate
crouton-generate admin users --fields-file=users.json
```

## Requirements

- Node.js 18+
- Nuxt 3 or 4
- @friendlyinternet/nuxt-crouton installed
- Drizzle ORM configured

## Integration with Nuxt Crouton

This generator is designed to work seamlessly with [@friendlyinternet/nuxt-crouton](https://www.npmjs.com/package/@friendlyinternet/nuxt-crouton).

First, install and configure Nuxt Crouton:

```bash
pnpm add @friendlyinternet/nuxt-crouton
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton']
})
```

Then use this generator to create collections that automatically integrate with the Crouton layer.

## Tips

- Collections auto-register with Nuxt Crouton - no manual registration needed
- Generated forms include Zod validation
- API endpoints use team-based access control
- All TypeScript types are properly generated
- Components use Nuxt UI 4 components

## Customization

After generation, you can:
- Modify Form.vue for custom layouts
- Adjust List.vue columns
- Add custom query methods
- Extend API endpoints
- Add business logic

The generated code is yours to modify!

## License

MIT © FYIT

## Links

- [GitHub Repository](https://github.com/pmcp/nuxt-crouton)
- [Nuxt Crouton Package](https://www.npmjs.com/package/@friendlyinternet/nuxt-crouton)
- [Report Issues](https://github.com/pmcp/nuxt-crouton/issues)