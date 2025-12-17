# Patterns Overview

This section explores common patterns and best practices for working with data in Nuxt Crouton. Learn how to build forms, tables, relationships, and integrate with Drizzle ORM.

## What You'll Learn

The Patterns section provides practical guidance for common use cases:

- **Relations**: How to define and work with relationships between collections
- **Forms**: Patterns for building and customizing forms
- **Tables**: Patterns for tables, columns, and data display
- **Drizzle Integration**: Working directly with Drizzle ORM
- **List Layouts**: Alternative layouts for displaying collection data

## Section Contents

### 1. Relations
**File**: `1.relations.md`

Master relationships between collections:
- One-to-many relationships
- Many-to-many relationships
- Reference fields (`ref-target`)
- Querying related data
- Displaying related records in forms and tables

**Example**:
```yaml
# posts.yml
fields:
  - name: author
    type: reference
    ref-target: users
  - name: categories
    type: reference
    ref-target: categories
    multiple: true
```

### 2. Forms
**File**: `2.forms.md`

Form patterns and customization:
- Auto-generated forms from schemas
- Custom field components
- Form validation patterns
- Conditional fields
- Multi-step forms
- Form state management
- Error handling

**Key Composables**:
- `useCollectionForm()` - Form state and CRUD operations
- `useFormValidation()` - Custom validation logic

### 3. Tables
**File**: `3.tables.md`

Table patterns and composition:
- Auto-generated table columns
- Custom column components
- Sorting and filtering
- Pagination patterns
- Row actions (edit, delete, view)
- Bulk operations
- Table configuration

**Key Composables**:
- `useCollectionTable()` - Table data and pagination
- `useCollectionQuery()` - Advanced filtering and search

### 4. Drizzle Integration
**File**: `drizzle.md`

Working directly with Drizzle ORM:
- Understanding generated Drizzle schemas
- Writing custom queries
- Migrations and schema changes
- Advanced database operations
- Raw SQL when needed

**Example**:
```typescript
import { db } from '~/server/database/db'
import { posts } from '~/server/database/schema'
import { eq } from 'drizzle-orm'

// Custom query
const publishedPosts = await db.select()
  .from(posts)
  .where(eq(posts.published, true))
  .orderBy(posts.createdAt)
```

### 5. List Layouts
**File**: `5.list-layouts.md`

Alternative layouts for displaying collections:
- Card layouts (grid, masonry)
- List layouts (compact, detailed)
- Custom list components
- Responsive layout patterns
- Mini card components

## Common Patterns

### Creating with Relations
```typescript
const { create } = useCollection('posts')

await create({
  title: 'My Post',
  author: userId, // Reference to users collection
  categories: [categoryId1, categoryId2] // Multiple references
})
```

### Querying with Relations
```typescript
const { data } = await useCollectionQuery('posts', {
  include: ['author', 'categories'], // Include related data
  filters: {
    'author.name': 'John Doe'
  }
})
```

### Custom Form Fields
```vue
<script setup lang="ts">
const { formData, save } = useCollectionForm('products')
</script>

<template>
  <CroutonForm v-model="formData" @save="save">
    <!-- Override price field with custom component -->
    <template #field-price>
      <CustomPriceField v-model="formData.price" />
    </template>
  </CroutonForm>
</template>
```

### Custom Table Columns
```vue
<script setup lang="ts">
const { data, pagination } = useCollectionTable('products')
</script>

<template>
  <CroutonTable :data="data" :pagination="pagination">
    <!-- Override price column -->
    <template #column-price="{ row }">
      <span class="font-bold text-green-600">
        ${{ row.price.toFixed(2) }}
      </span>
    </template>
  </CroutonTable>
</template>
```

## Best Practices

1. **Use Generated Components First**: Start with auto-generated forms and tables, customize only when needed
2. **Leverage Composables**: Use `useCollectionForm()` and `useCollectionTable()` for state management
3. **Keep Schemas Simple**: Complex logic belongs in custom components, not schemas
4. **Use Slots for Customization**: Override specific fields/columns via slots instead of rebuilding entire components
5. **Follow Drizzle Patterns**: Use Drizzle's query builder for type-safe database operations

## Where to Go Next

After mastering patterns:

- **Customization** → Learn how to create custom fields and components
- **Features** → Explore advanced features like i18n, rich text, and file uploads
- **API Reference** → Deep dive into composables and components

## Prerequisites

Before diving into patterns:
- Completed [Getting Started](/getting-started)
- Understand [Fundamentals](/fundamentals) (especially collections and architecture)
- Familiarity with [Generation](/generation) workflow

## External Resources

For related technologies:
- [Nuxt UI Components](https://ui.nuxt.com) - Base component library
- [Drizzle ORM](https://orm.drizzle.team/) - Database toolkit
- [Vue Slots](https://vuejs.org/guide/components/slots.html) - Component customization
- [VueUse](https://vueuse.org/) - Utility composables
