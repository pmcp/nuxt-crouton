# Nuxt Crouton User Manual

## Table of Contents
- [Introduction](#introduction)
- [Installation](#installation)
- [Critical Setup Steps](#critical-setup-steps)
- [Collection Generator (Scaffolding)](#collection-generator-scaffolding)
- [Core Concepts](#core-concepts)
- [Components](#components)
- [Composables](#composables)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Introduction

Nuxt Crouton is a powerful CRUD (Create, Read, Update, Delete) layer for Nuxt applications that provides automatic UI generation for managing data collections. It offers a complete solution with tables, forms, and state management out of the box.

### Key Features
- 🚀 Automatic CRUD UI generation
- 📊 Data tables with sorting, filtering, and pagination
- 📝 Dynamic form generation
- 🎨 Customizable components with Nuxt UI 4
- 🔄 Optimistic UI updates
- 🎯 Type-safe with TypeScript support
- 🧩 Modular architecture with optional addons (i18n, editor)

## Installation

### 1. Install the packages

```bash
# Core package
npm install @friendlyinternet/nuxt-crouton
# or
pnpm add @friendlyinternet/nuxt-crouton
# or
yarn add @friendlyinternet/nuxt-crouton

# Optional: Collection generator for scaffolding
npm install -g @friendlyinternet/nuxt-crouton-collection-generator
# or use with npx without installing globally
```

### 2. Add to your Nuxt config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton'
  ],
  // ... other config
})
```

## Critical Setup Steps

### ⚠️ IMPORTANT: Add the CroutonContainer Component

**The most critical step**: You MUST add the `<CroutonContainer />` component to your app for the CRUD operations to display properly. Without this component, clicking create/update/delete buttons will not show any UI.

#### Option 1: Add to app.vue (Recommended for most apps)

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Add this line - it renders the CRUD modals/slideovers -->
  <CroutonContainer />
</template>
```

#### Option 2: Add to specific layouts

If you only need CRUD functionality in certain parts of your app:

```vue
<!-- layouts/dashboard.vue -->
<template>
  <div>
    <slot />
    <!-- Add the container to layouts where you need CRUD -->
    <CroutonContainer />
  </div>
</template>
```

#### Option 3: Add to specific pages

For fine-grained control, add it only to pages that need CRUD:

```vue
<!-- pages/admin/products.vue -->
<template>
  <div>
    <CroutonTable :collection="products" />
    <CroutonContainer />
  </div>
</template>
```

### Why is this necessary?

The `CroutonContainer` component is responsible for rendering the modals, slideovers, and dialogs that appear when you click create, update, or delete buttons. Without it:
- The button clicks will register (you'll see console logs if enabled)
- The state will be updated internally
- **But no UI will appear** because there's no container to render the forms

## Collection Generator (Scaffolding)

Nuxt Crouton includes a powerful generator tool that can scaffold complete CRUD collections with all necessary files, including API endpoints, database schemas, components, and composables.

### Quick Start with Generator

#### 1. Create a schema file

```json
// product-schema.json
{
  "name": {
    "type": "string",
    "meta": {
      "required": true,
      "label": "Product Name"
    }
  },
  "price": {
    "type": "decimal",
    "meta": {
      "precision": 10,
      "scale": 2,
      "label": "Price"
    }
  },
  "inStock": {
    "type": "boolean",
    "meta": {
      "label": "In Stock"
    }
  }
}
```

#### 2. Generate the collection

```bash
# Using CLI arguments
npx crouton-generate shop products --fields-file=product-schema.json --dialect=sqlite

# Or using a config file (recommended)
npx crouton-generate config ./crouton.config.js
```

### Using Configuration Files

For complex projects with multiple collections, use a configuration file:

```javascript
// crouton.config.js
export default {
  // Path to your JSON schema file
  schemaPath: './schemas/product.json',

  // Database dialect: 'pg' or 'sqlite'
  dialect: 'sqlite',

  // Target layers and collections to generate
  targets: [
    {
      layer: 'shop',
      collections: ['products', 'categories']
    },
    {
      layer: 'blog',
      collections: ['posts']
    }
  ],

  // Optional flags
  flags: {
    noTranslations: true,    // Skip i18n fields
    force: true,             // Overwrite existing files
    noDb: false,            // Skip database migrations
    dryRun: false,          // Preview without creating
    autoRelations: false,   // Generate relation stubs
    useMetadata: true       // Add timestamps
  }
}
```

Then generate all collections with:

```bash
# Using default config file (crouton.config.js)
npx crouton-generate config

# Or specify a custom config
npx crouton-generate config ./my-config.js
```

### Multiple Schemas Configuration

For different collections with unique schemas:

```javascript
// crouton.config.js
export default {
  // Define collections with their schema files
  collections: [
    { name: 'products', fieldsFile: './schemas/product.json' },
    { name: 'categories', fieldsFile: './schemas/category.json' },
    { name: 'posts', fieldsFile: './schemas/post.json' }
  ],

  // Specify which collections go in which layers
  targets: [
    {
      layer: 'shop',
      collections: ['products', 'categories']
    },
    {
      layer: 'blog',
      collections: ['posts']
    }
  ],

  dialect: 'sqlite',
  flags: {
    noTranslations: true,
    force: true
  }
}
```

### Generated Structure

The generator creates:

```
layers/[layer]/collections/[collection]/
├── app/
│   ├── components/
│   │   ├── Form.vue         # CRUD form with validation
│   │   └── List.vue         # Data table with actions
│   └── composables/
│       └── use[Collection].ts   # Zod schemas and config
├── server/
│   ├── api/teams/[id]/[collection]/
│   │   ├── index.get.ts     # GET endpoint
│   │   ├── index.post.ts    # CREATE endpoint
│   │   ├── [id].patch.ts    # UPDATE endpoint
│   │   └── [id].delete.ts   # DELETE endpoint
│   └── database/
│       ├── queries.ts       # Database queries
│       └── schema.ts        # Drizzle schema
├── types.ts                 # TypeScript types
└── nuxt.config.ts          # Layer config
```

### Supported Field Types

- `string` - Text field
- `text` - Long text/textarea
- `number` - Integer field
- `decimal` - Decimal/float
- `boolean` - Checkbox/switch
- `date` - Date picker
- `json` - JSON data
- `uuid` - UUID field with references

### Generator Options

| Option | Description |
|--------|-------------|
| `--fields-file <path>` | Path to JSON schema file |
| `--config <path>` | Use configuration file |
| `--dialect <pg\|sqlite>` | Database dialect |
| `--no-translations` | Skip translation fields |
| `--force` | Overwrite existing files |
| `--no-db` | Skip database migrations |
| `--dry-run` | Preview without creating |
| `--auto-relations` | Add relation comments |

## Core Concepts

### Collections

Collections are the core data structures in Nuxt Crouton. Each collection represents a type of data you want to manage (e.g., users, posts, products).

```typescript
// composables/useCollections.ts
export default function() {
  const posts = ref<Post[]>([])
  const users = ref<User[]>([])

  return {
    posts,
    users,
    // Configuration for each collection
    getConfig(collection: string) {
      const configs = {
        posts: {
          apiPath: 'posts',
          displayName: 'Blog Posts',
          singularName: 'Post'
        },
        users: {
          apiPath: 'users',
          displayName: 'Users',
          singularName: 'User'
        }
      }
      return configs[collection]
    }
  }
}
```

### CRUD Operations

Nuxt Crouton handles three main operations:
- **Create**: Add new items to a collection
- **Update**: Edit existing items
- **Delete**: Remove items from a collection

These operations are triggered through the `useCrouton` composable:

```javascript
const { open, send, close } = useCrouton()

// Open create form
open('create', 'posts')

// Open update form for a specific item
open('update', 'posts', ['item-id'])

// Open delete confirmation
open('delete', 'posts', ['item-id-1', 'item-id-2'])
```

### State Management

Nuxt Crouton uses a state-based system to manage CRUD operations. Each operation creates a state object that tracks:
- The action being performed (create/update/delete)
- The collection being modified
- The data being processed
- Loading states
- UI container type (modal/slideover/dialog)

## Components

### CroutonTable

The main table component for displaying collection data.

```vue
<template>
  <CroutonTable
    :collection="collectionName"
    :columns="tableColumns"
    :rows="collectionData"
  >
    <template #header>
      <CroutonTableHeader
        title="My Collection"
        :collection="collectionName"
        :create-button="true"
      />
    </template>
  </CroutonTable>
</template>

<script setup>
const { posts } = useCollections()
const collectionData = posts
const collectionName = 'posts'
const tableColumns = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'status', label: 'Status' }
]
</script>
```

### CroutonTableHeader

Provides a header with title and optional create button.

```vue
<CroutonTableHeader
  title="Products"
  :collection="'products'"
  :create-button="true"
/>
```

Properties:
- `title`: Display title for the header
- `collection`: Collection name for the create action
- `create-button`: Whether to show the create button

### CroutonList

A simplified wrapper around CroutonTable.

```vue
<CroutonList
  :collection="'products'"
  :columns="columns"
  :rows="products"
/>
```

### CroutonContainer

**Critical component** that renders the CRUD UI (modals/slideovers). Must be included in your app as shown in the setup section.

### CroutonDynamicFormLoader

Automatically loads the appropriate form component for a collection.

```vue
<CroutonDynamicFormLoader
  :collection="'posts'"
  :action="'create'"
  :active-item="itemData"
/>
```

## Composables

### useCrouton

The main composable for CRUD operations.

```javascript
const {
  // State
  showCrouton,      // Whether any CRUD UI is showing
  loading,          // Current loading state
  action,           // Current action (create/update/delete)
  activeCollection, // Current collection being edited

  // Methods
  open,             // Open CRUD UI
  send,             // Send CRUD operation to API
  close,            // Close CRUD UI
  getCollection,    // Fetch collection data
} = useCrouton()

// Examples
// Open create form
open('create', 'posts')

// Open update form
open('update', 'posts', ['post-123'])

// Send data to API
await send('create', 'posts', { title: 'New Post', content: '...' })

// Close current UI
close()
```

### useCollections

Manages collection data and configuration.

```javascript
const collections = useCollections()

// Access collection data
const posts = collections.posts
const users = collections.users

// Get collection configuration
const config = collections.getConfig('posts')
```

### useCroutonError

Handles error checking and validation.

```javascript
const { foundErrors, activeToast } = useCroutonError()

// Check if there are blocking errors
if (foundErrors()) {
  // Handle errors (network offline, not logged in, etc.)
}
```

## Configuration

### Collection Configuration

Each collection can be configured with:

```javascript
{
  apiPath: 'posts',           // API endpoint path
  displayName: 'Blog Posts',  // Display name for UI
  singularName: 'Post',        // Singular form
  defaultPagination: {        // Pagination settings
    pageSize: 10,
    sortBy: 'createdAt',
    sortDirection: 'desc'
  }
}
```

### Custom Forms

Create custom form components for collections:

```vue
<!-- components/PostsForm.vue -->
<template>
  <UForm :state="formData" @submit="handleSubmit">
    <UFormField label="Title" name="title">
      <UInput v-model="formData.title" />
    </UFormField>

    <UFormField label="Content" name="content">
      <UTextarea v-model="formData.content" />
    </UFormField>

    <UButton type="submit">Save</UButton>
  </UForm>
</template>

<script setup>
const props = defineProps(['action', 'activeItem'])
const { send } = useCrouton()

const formData = ref({
  title: props.activeItem?.title || '',
  content: props.activeItem?.content || ''
})

const handleSubmit = () => {
  send(props.action, 'posts', formData.value)
}
</script>
```

## Troubleshooting

### Common Issues

#### 1. Create/Update/Delete buttons don't show any UI

**Problem**: Clicking CRUD buttons doesn't open any forms or dialogs.

**Solution**: You haven't added `<CroutonContainer />` to your app. See [Critical Setup Steps](#critical-setup-steps).

**Debug steps**:
1. Check browser console for errors
2. Look for logs like `[Crouton.open] Called with: {action: 'create'...}`
3. If you see the logs but no UI, you're missing the Container component

#### 2. Authentication errors blocking actions

**Problem**: Getting "You are not logged in" errors when trying to use CRUD operations.

**Solution**: Nuxt Crouton expects these composables to be available:
- `useUserSession()` from `@nuxt/auth-utils` or similar
- `useTeam()` for team-based contexts

If your app doesn't use authentication, you may need to modify the error checking in `useCroutonError`.

#### 3. API endpoints not found

**Problem**: 404 errors when trying to save data.

**Solution**: Ensure your API routes match the expected pattern:
- Create: `POST /api/[collection]`
- Read: `GET /api/[collection]`
- Update: `PATCH /api/[collection]/[id]`
- Delete: `DELETE /api/[collection]/[id]`

For team-based apps:
- `/api/teams/[teamId]/[collection]`

### Debug Logging

Enable debug logging to troubleshoot issues:

```javascript
// In your component or page
onMounted(() => {
  // This will log all CRUD operations
  window.DEBUG_CROUTON = true
})
```

## Examples

### Basic CRUD Implementation

```vue
<!-- pages/admin/products.vue -->
<template>
  <div>
    <!-- Table with CRUD operations -->
    <CroutonTable
      :collection="'products'"
      :columns="columns"
      :rows="products"
    >
      <template #header>
        <CroutonTableHeader
          title="Products"
          :collection="'products'"
          :create-button="true"
        />
      </template>
    </CroutonTable>

    <!-- CRITICAL: Add the container for CRUD UI -->
    <CroutonContainer />
  </div>
</template>

<script setup>
const { products } = useCollections()

// Fetch initial data
const { data } = await useFetch('/api/products')
if (data.value) {
  products.value = data.value
}

// Define table columns
const columns = [
  { key: 'name', label: 'Product Name' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: 'Actions' }
]
</script>
```

### Custom Actions

```vue
<template>
  <div>
    <UButton @click="handleBulkCreate">
      Import Products
    </UButton>

    <UButton @click="handleExport">
      Export Selected
    </UButton>
  </div>
</template>

<script setup>
const { open, send } = useCrouton()
const selectedRows = useState('selectedRows')

const handleBulkCreate = async () => {
  // Custom bulk create logic
  const products = await fetchProductsFromAPI()

  for (const product of products) {
    await send('create', 'products', product)
  }
}

const handleExport = () => {
  const ids = selectedRows.value.map(row => row.id)
  // Custom export logic
  exportToCSV(ids)
}
</script>
```

### Server-Side Pagination

```vue
<template>
  <CroutonTable
    :collection="'products'"
    :columns="columns"
    :rows="products"
    :server-pagination="true"
    :pagination-data="paginationData"
    :refresh-fn="refreshProducts"
  />
</template>

<script setup>
const { products } = useCollections()
const { setPagination, getPagination } = useCrouton()

const paginationData = computed(() => getPagination('products'))

const refreshProducts = async () => {
  const { data } = await $fetch('/api/products', {
    query: {
      page: paginationData.value.currentPage,
      limit: paginationData.value.pageSize,
      sortBy: paginationData.value.sortBy,
      sortDirection: paginationData.value.sortDirection
    }
  })

  products.value = data.items
  setPagination('products', data.pagination)
}

// Initial load
await refreshProducts()
</script>
```

## Best Practices

1. **Always include CroutonContainer** - Add it once at the app level rather than on every page
2. **Use collections consistently** - Define all collections in one place
3. **Handle errors gracefully** - Implement proper error handling in your API
4. **Optimize for performance** - Use server-side pagination for large datasets
5. **Customize forms when needed** - Create custom form components for complex data structures

## Support

For issues, questions, or contributions:
- GitHub: [https://github.com/pmcp/nuxt-crouton](https://github.com/pmcp/nuxt-crouton)
- Issues: [https://github.com/pmcp/nuxt-crouton/issues](https://github.com/pmcp/nuxt-crouton/issues)

---

*Last updated: December 2024*