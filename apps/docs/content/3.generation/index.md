# Generation Overview

This section explains how Nuxt Crouton's code generation system works. The CLI tools transform your collection schemas into fully functional CRUD interfaces with minimal configuration.

## What You'll Learn

The Generation section covers everything about the code generation workflow:

- **CLI Commands**: How to use the `crouton-generate` CLI
- **Schema Format**: How to define collection schemas in JSON
- **Multi-Collection**: Working with multiple collections at once
- **CLI Reference**: Complete reference of all CLI options and flags

## Section Contents

### 1. CLI Commands
**File**: `cli-commands.md`

Master the Nuxt Crouton CLI:
- `npx crouton-generate` - Generate collections from schemas
- Common workflows and best practices

### 2. Schema Format
**File**: `2.schema-format.md`

Learn the YAML schema format for defining collections:
- Collection metadata (name, description, icon)
- Field definitions and types
- Field validation rules
- Relationships between collections
- Advanced schema options

**Field Types**:
- Text fields (short text, long text, rich text)
- Number fields (integer, decimal)
- Date/time fields
- Boolean/checkbox fields
- Select/enum fields
- Reference fields (relationships)
- File/asset fields

**Schema Example**:
```yaml
name: products
description: Product catalog
icon: i-heroicons-shopping-bag
fields:
  - name: title
    type: text
    required: true
  - name: price
    type: number
    validation:
      min: 0
  - name: category
    type: select
    options:
      - electronics
      - clothing
      - books
```

### 3. Multi-Collection
**File**: `3.multi-collection.md`

Work with multiple collections efficiently:
- Organizing schemas in `collections/` directory
- Generating all collections at once
- Managing relationships between collections
- Best practices for complex data models

### 4. CLI Reference (Old)
**File**: `4.cli-reference.md`

Legacy CLI reference (may be outdated - refer to `5.cli-reference.md` for latest).

### 5. CLI Reference (Current)
**File**: `5.cli-reference.md`

Complete reference of all CLI commands and options:
- Command syntax and usage
- All available flags and options
- Environment variables
- Configuration files
- Exit codes and error handling

## Code Generation Workflow

The typical workflow for generating collections:

1. **Define Schema**: Create a JSON file in `schemas/[name]-schema.json`
2. **Run Generator**: Execute `npx crouton-generate <layer> <collection> --fields-file schemas/[name]-schema.json`
3. **Review Output**: Check generated files in `layers/[name]/`
4. **Customize**: Override components or add custom logic
5. **Regenerate**: Re-run generator if schema changes

## What Gets Generated

When you run `npx crouton-generate`, Nuxt Crouton creates:

- **Components**:
  - `CroutonForm.vue` - Auto-generated form component
  - `CroutonTable.vue` - Table/list view component
  - `CroutonModal.vue` - Modal for create/edit operations
  - Field components for each field type

- **Composables**:
  - `useCollectionForm()` - Form state management
  - `useCollectionTable()` - Table data and pagination
  - `useCollection()` - CRUD operations
  - `useCollectionQuery()` - Advanced querying

- **Server API**:
  - `GET /api/[collection]` - List endpoint
  - `GET /api/[collection]/[id]` - Get single item
  - `POST /api/[collection]` - Create endpoint
  - `PUT /api/[collection]/[id]` - Update endpoint
  - `DELETE /api/[collection]/[id]` - Delete endpoint

- **Database**:
  - Drizzle schema definitions
  - Migration files
  - Database types

- **Pages** (optional):
  - List page with table view
  - Detail page for single items

### Extending API Endpoints

Generated list endpoints (`GET /api/[collection]`) support `?ids=xxx` by default for fetching specific items by ID. To add custom filtering (e.g., filtering by a parent entity like `eventId`), you need to extend both the query function and API handler.

**1. Add a query function** in `server/database/queries.ts`:

```ts
export async function getProductsByEventId(teamId: string, eventId: string) {
  const db = useDB()
  return await db
    .select({ ...tables.products })
    .from(tables.products)
    .where(
      and(
        eq(tables.products.teamId, teamId),
        eq(tables.products.eventId, eventId)
      )
    )
}
```

**2. Handle the query param** in `index.get.ts`:

```ts
import { getAllProducts, getProductsByIds, getProductsByEventId } from '...'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const query = getQuery(event)

  if (query.ids) {
    return await getProductsByIds(team.id, String(query.ids).split(','))
  }

  // Custom filter: eventId
  if (query.eventId) {
    return await getProductsByEventId(team.id, String(query.eventId))
  }

  return await getAllProducts(team.id)
})
```

**3. Pass the filter from the client** using `useCollectionQuery`:

```ts
const eventId = computed(() => event.value?.id)

const { items } = await useCollectionQuery('products', {
  query: computed(() => ({ eventId: eventId.value }))
})
```

The query object is automatically serialized to URL parameters (e.g., `?eventId=abc123`) and the API endpoint reads them via `getQuery(event)`.

## Generation Best Practices

- **Start Simple**: Begin with basic schemas, add complexity later
- **Use Conventions**: Follow naming conventions (collections plural, fields singular)
- **Version Control**: Commit schemas and generated code separately
- **Don't Edit Generated Files**: Use overrides and custom components instead
- **Regenerate Safely**: Generated code can be regenerated without losing customizations

## Where to Go Next

After understanding generation:

- **Patterns** → Learn common patterns for forms, tables, and relations
- **Customization** → Customize generated components and fields
- **Fundamentals** → Understand the architecture behind the generated code

## Prerequisites

Before working with generation:
- Installed Nuxt Crouton via [Getting Started](/getting-started)
- Basic understanding of YAML syntax
- Familiarity with Vue components (for customization)

## External Resources

For related concepts:
- [YAML Syntax Guide](https://yaml.org/spec/1.2.2/)
- [Drizzle Schema Reference](https://orm.drizzle.team/docs/sql-schema-declaration)
- [Nuxt Layers](https://nuxt.com/docs/guide/going-further/layers) - Understanding the layer architecture
