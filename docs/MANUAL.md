# Nuxt Crouton - Complete Manual

The complete guide to building fast, maintainable CRUD applications with Nuxt Crouton.

---

## Table of Contents

1. [What is Nuxt Crouton?](#what-is-nuxt-crouton)
2. [Philosophy & Mental Model](#philosophy--mental-model)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Core Concepts](#core-concepts)
6. [Generator Commands](#generator-commands)
7. [Working with Collections](#working-with-collections)
8. [Customizing Generated Code](#customizing-generated-code)
9. [Data Operations (Mutations)](#data-operations-mutations)
10. [Querying Data](#querying-data)
11. [Working with Relations](#working-with-relations)
12. [Forms & Modals](#forms--modals)
13. [Multi-Collection Configuration](#multi-collection-configuration)
14. [Rich Text Editor](#rich-text-editor)
15. [Translations & i18n](#translations--i18n)
16. [Team-Based Authentication](#team-based-authentication)
17. [Advanced Patterns](#advanced-patterns)
18. [Troubleshooting](#troubleshooting)
19. [Migration Guides](#migration-guides)
20. [API Reference](#api-reference)

---

## What is Nuxt Crouton?

**Nuxt Crouton** is a code generator and composable library for building CRUD (Create, Read, Update, Delete) applications in Nuxt 3.

### What It Does

**Generates:**me t
- ✅ List views (table, grid, cards)
- ✅ Forms (create, edit, delete)
- ✅ TypeScript types
- ✅ Composables with validation
- ✅ Database migrations (optional)

**Provides:**
- ✅ Smart data caching (Nuxt's useFetch)
- ✅ Modal/slideover management
- ✅ Toast notifications
- ✅ Automatic cache invalidation
- ✅ Translation support
- ✅ Team-based auth utilities

### What It's NOT

- ❌ Not a runtime admin panel (like Strapi/Directus)
- ❌ Not a framework (works with Nuxt)
- ❌ Not a database (generates code for YOUR database)
- ❌ Not a backend (generates frontend + backend stubs)

### Key Principle

**Generate → Customize → Own**

1. **Generate** - Get 80% working in 30 seconds
2. **Customize** - Edit generated code freely
3. **Own** - It's your code, you maintain it

---

## Philosophy & Mental Model

### The Rails Scaffold Approach

Nuxt Crouton works like Rails scaffolding:

```bash
# Rails
rails generate scaffold Post title:string body:text

# Nuxt Crouton
pnpm crouton-generate blog posts --fields post-schema.json
```

Both:
1. Generate starting code
2. You own it immediately
3. Customize as needed
4. Core framework stays stable

### The Two-Layer Architecture

```
┌─────────────────────────────────────┐
│  Generated Code (Yours)             │
│  - Forms, Lists, Tables             │
│  - You customize freely             │
│  - Lives in YOUR project            │
└─────────────────────────────────────┘
            ↓ uses
┌─────────────────────────────────────┐
│  Core Library (Stable)              │
│  - Composables, utilities           │
│  - Modal management, caching        │
│  - Updates via npm                  │
└─────────────────────────────────────┘
```

**Key insight:** Generated code can diverge. Core library stays consistent.

### Domain-Driven Design with Layers

Organize collections by domain:

```
layers/
  ├── shop/        # E-commerce domain
  │   ├── components/
  │   │   ├── products/
  │   │   ├── orders/
  │   │   └── inventory/
  │   └── composables/
  │
  ├── blog/        # Content domain
  │   ├── components/
  │   │   ├── posts/
  │   │   ├── authors/
  │   │   └── comments/
  │   └── composables/
  │
  └── admin/       # Admin domain
      ├── components/
      │   ├── users/
      │   ├── roles/
      │   └── permissions/
      └── composables/
```

Each layer is self-contained and can be deployed independently.

---

## Installation

### Prerequisites

- Node.js 18+ or 20+
- pnpm (recommended) or npm
- Nuxt 4.x
- Nuxt UI 4.x

### Install Nuxt Crouton

```bash
# Install core package
pnpm add @friendlyinternet/nuxt-crouton

# Install generator (dev dependency)
pnpm add -D @friendlyinternet/nuxt-crouton-collection-generator

# Optional: i18n support
pnpm add @friendlyinternet/nuxt-crouton-i18n

# Optional: Rich text editor
pnpm add @friendlyinternet/nuxt-crouton-editor
```

### Configure Nuxt

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    // '@friendlyinternet/nuxt-crouton-i18n',     // If using translations
    // '@friendlyinternet/nuxt-crouton-editor',   // If using rich text editor
  ],

  // Recommended: Enable hot reload for development
  vite: {
    server: {
      watch: {
        ignored: ['!**/node_modules/@friendlyinternet/**']
      }
    },
    optimizeDeps: {
      exclude: ['@friendlyinternet/nuxt-crouton']
    }
  }
})
```

### Verify Installation

```bash
pnpm crouton-generate --help

# Should show:
# Usage: crouton-generate <layer> <collection> [options]
```

---

## Quick Start

### 1. Create Your First Collection

```bash
# Create a schema file
cat > product-schema.json << 'EOF'
[
  { "name": "name", "type": "string" },
  { "name": "description", "type": "text" },
  { "name": "price", "type": "number" },
  { "name": "inStock", "type": "boolean" }
]
EOF

# Generate the collection
pnpm crouton-generate shop products --fields product-schema.json
```

**Generated files:**
```
layers/shop/
  ├── components/
  │   └── products/
  │       ├── List.vue       # Table/list view
  │       ├── Form.vue       # Create/edit form
  │       └── Table.vue      # Table component
  ├── composables/
  │   └── useProducts.ts     # Validation, columns, defaults
  └── types/
      └── products.ts        # TypeScript types
```

### 2. Register Collection

```typescript
// app.config.ts
export default defineAppConfig({
  croutonCollections: {
    shopProducts: {
      name: 'shopProducts',
      layer: 'shop',
      componentName: 'ShopProductsForm',
      apiPath: 'shop-products',
    }
  }
})
```

### 3. Create API Route

```typescript
// server/api/teams/[team]/shop-products/index.get.ts
export default defineEventHandler(async (event) => {
  // Your database query
  const products = await db.select().from(products)
  return products
})
```

### 4. Use in Your App

```vue
<!-- pages/products.vue -->
<template>
  <ShopProductsList />
</template>
```

**That's it!** You now have:
- ✅ Working CRUD interface
- ✅ Modal forms (create/edit/delete)
- ✅ Table with sorting
- ✅ Type-safe code
- ✅ Validation

### 5. Customize the Form

```vue
<!-- layers/shop/components/products/Form.vue -->
<template>
  <UForm :state="state" :schema="schema" @submit="handleSubmit">
    <!-- Generated fields -->
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <!-- Add your custom field -->
    <UFormField label="Category" name="categoryId">
      <USelectMenu
        v-model="state.categoryId"
        :options="categories"
        option-attribute="name"
      />
    </UFormField>

    <!-- Keep generated submit button -->
    <CroutonButton
      :action="action"
      :collection="collection"
      :loading="loading"
    />
  </UForm>
</template>

<script setup lang="ts">
// Your custom logic
const { items: categories } = await useCollectionQuery('shopCategories')

// Keep generated mutation logic
const { create, update, deleteItems } = useCollectionMutation(collection)

const handleSubmit = async () => {
  if (props.action === 'create') {
    await create(state.value)
  } else if (props.action === 'update') {
    await update(state.value.id, state.value)
  }
  close()
}
</script>
```

**The code is yours now. Edit freely!**

---

## Core Concepts

### Collections

A **collection** is a group of related data (think: database table).

**Examples:**
- `products` - E-commerce products
- `posts` - Blog posts
- `users` - User accounts
- `orders` - Customer orders

**Convention:** Use plural names (`products`, not `product`).

### Layers

A **layer** is a domain or module in your app.

**Examples:**
- `shop` - E-commerce features
- `blog` - Content management
- `admin` - User administration
- `marketing` - Campaigns, newsletters

**Benefits:**
- Separation of concerns
- Reusable across projects
- Independent deployment

### Generated vs Core Code

| Generated Code | Core Library |
|----------------|--------------|
| Lives in YOUR project | Lives in node_modules |
| You customize freely | You don't edit |
| Can diverge | Stays consistent |
| Regenerate to update | npm update to update |
| Forms, lists, types | Composables, utilities |

---

## Generator Commands

### Single Collection

```bash
# Basic
pnpm crouton-generate <layer> <collection> --fields <schema-file>

# Example
pnpm crouton-generate shop products --fields ./schemas/product-schema.json
```

**Options:**
- `--fields` - Path to schema JSON file (required)
- `--force` - Overwrite existing files
- `--no-db` - Skip database generation
- `--dry-run` - Preview without creating files

### Multi-Collection (Config File)

```bash
# Generate from config
npx crouton-generate config ./crouton.config.js

# With options
npx crouton-generate config ./crouton.config.js --force --preview
```

**Config file format:**
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
    force: false,
    noTranslations: false,
    noDb: false
  }
}
```

### Schema File Format

```json
[
  {
    "name": "title",
    "type": "string",
    "required": true
  },
  {
    "name": "description",
    "type": "text"
  },
  {
    "name": "price",
    "type": "number",
    "default": 0
  },
  {
    "name": "inStock",
    "type": "boolean",
    "default": true
  },
  {
    "name": "publishedAt",
    "type": "date"
  }
]
```

**Supported types:**
- `string` - Short text (VARCHAR)
- `text` - Long text (TEXT)
- `number` - Integer or decimal
- `boolean` - True/false
- `date` - Timestamp
- `decimal` - Precise decimal (for money)

**Field Metadata (`meta` property):**

Fields can include a `meta` object with additional configuration:

```json
{
  "title": {
    "type": "string",
    "meta": {
      "required": true,
      "label": "Article Title",
      "maxLength": 200,
      "component": "CustomInput",
      "area": "main"
    }
  }
}
```

**Supported metadata properties:**
- `required` - Field is required (validation)
- `label` - Human-readable label for forms
- `maxLength` - Maximum length for strings
- `component` - Custom component to use instead of default input
- `area` - Logical grouping for form layout (see below)

**Form Areas:**

The `area` property lets you organize fields into logical sections for future layout improvements:

```json
{
  "title": {
    "type": "string",
    "meta": {
      "area": "main"  // Primary content area
    }
  },
  "status": {
    "type": "string",
    "meta": {
      "area": "sidebar"  // Sidebar metadata
    }
  },
  "publishedAt": {
    "type": "date",
    "meta": {
      "area": "meta"  // SEO/publishing info
    }
  }
}
```

**Common area values:**
- `main` - Primary content (default if not specified)
- `sidebar` - Secondary metadata, status, categories
- `meta` - SEO, publishing dates, technical fields
- `advanced` - Advanced options

**Note:** Currently, all fields render in a single list regardless of `area`. This property sets up the infrastructure for future layout features where fields can be organized into columns, tabs, or sections.

---

## Working with Collections

### Directory Structure

After generating a collection, you'll have:

```
layers/[layer]/
  ├── components/
  │   └── [collection]/
  │       ├── List.vue       # Main list view
  │       ├── Form.vue       # Create/edit/delete form
  │       └── Table.vue      # Table component
  │
  ├── composables/
  │   └── use[Collection].ts # Validation & config
  │
  └── types/
      └── [collection].ts    # TypeScript types
```

### List Component

**Purpose:** Display collection items in a table, grid, or list.

**Usage:**
```vue
<template>
  <ShopProductsList layout="table" />
  <!-- or -->
  <ShopProductsList layout="grid" />
  <!-- or -->
  <ShopProductsList layout="cards" />
</template>
```

**Features:**
- ✅ Automatic data fetching
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling
- ✅ Responsive layouts

**Customization:**
```vue
<!-- layers/shop/components/products/List.vue -->
<script setup lang="ts">
// Generated query
const { items: products, pending } = await useCollectionQuery('shopProducts')

// Add custom filtering
const searchQuery = ref('')
const filteredProducts = computed(() =>
  products.value.filter(p =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)
</script>

<template>
  <!-- Add search -->
  <div>
    <UInput v-model="searchQuery" placeholder="Search products..." />

    <!-- Use filtered data -->
    <CroutonList
      :rows="filteredProducts"
      :loading="pending"
      :columns="columns"
    />
  </div>
</template>
```

### Form Component

**Purpose:** Create, edit, or delete items.

**Props:**
```typescript
interface Props {
  action: 'create' | 'update' | 'delete'
  activeItem?: any
  items?: string[]
  loading: string
  collection: string
}
```

**Usage (automatic via useCrouton):**
```typescript
const { open } = useCrouton()

// Create
open('create', 'shopProducts')

// Edit
open('update', 'shopProducts', ['product-id-123'])

// Delete
open('delete', 'shopProducts', ['id1', 'id2'])
```

**Customization:**
```vue
<!-- layers/shop/components/products/Form.vue -->
<script setup lang="ts">
// Keep generated props
const props = defineProps<ShopProductsFormProps>()

// Add custom state
const uploadingImage = ref(false)
const imagePreview = ref<string | null>(null)

// Add custom methods
const handleImageUpload = async (file: File) => {
  uploadingImage.value = true
  const url = await uploadToCloudinary(file)
  state.value.imageUrl = url
  imagePreview.value = url
  uploadingImage.value = false
}

// Keep generated mutation logic
const { create, update } = useCollectionMutation(props.collection)
</script>

<template>
  <UForm @submit="handleSubmit">
    <!-- Generated fields -->
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <!-- Your custom field -->
    <UFormField label="Product Image" name="imageUrl">
      <img v-if="imagePreview" :src="imagePreview" class="w-32 h-32 object-cover" />
      <UButton @click="triggerFileInput" :loading="uploadingImage">
        Upload Image
      </UButton>
    </UFormField>

    <!-- Keep generated button -->
    <CroutonButton :action="action" :loading="loading" />
  </UForm>
</template>
```

### Composable

**Purpose:** Validation, column definitions, defaults.

**Generated file:**
```typescript
// layers/shop/composables/useProducts.ts
import { z } from 'zod'

export function useShopProducts() {
  const { t } = useI18n()

  // Validation schema
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    price: z.number().min(0, 'Price must be positive'),
    inStock: z.boolean()
  })

  // Table columns
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' },
    { key: 'inStock', label: 'In Stock' }
  ]

  // Default values for new items
  const defaultValue = {
    name: '',
    price: 0,
    inStock: true
  }

  return {
    schema,
    columns,
    defaultValue,
    collection: 'shopProducts'
  }
}
```

**Customization:**
```typescript
// Add custom validation
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().min(0, 'Price must be positive'),

  // Add custom rule
  sku: z.string()
    .regex(/^[A-Z]{3}-\d{4}$/, 'SKU must be format: ABC-1234'),

  // Add custom validator
  discountPrice: z.number().optional()
}).refine((data) => {
  // Custom cross-field validation
  if (data.discountPrice && data.discountPrice >= data.price) {
    return false
  }
  return true
}, {
  message: 'Discount price must be less than regular price',
  path: ['discountPrice']
})

// Add computed columns
const columns = computed(() => [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  {
    key: 'profit',
    label: 'Profit',
    // Virtual column
    render: (row) => row.price - row.cost
  }
])
```

---

## Customizing Generated Code

### The Golden Rule

**Generated code is YOUR code. Edit it freely.**

After generation:
1. Files are in your project
2. You own them
3. Customize as needed
4. Don't regenerate unless you want to lose changes

### Common Customizations

#### Add Custom Fields

```vue
<!-- Form.vue -->
<script setup lang="ts">
// Fetch related data
const { items: categories } = await useCollectionQuery('shopCategories')
</script>

<template>
  <UForm>
    <!-- Generated fields -->
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <!-- Add custom field -->
    <UFormField label="Category" name="categoryId">
      <USelectMenu
        v-model="state.categoryId"
        :options="categories"
        option-attribute="name"
      />
    </UFormField>
  </UForm>
</template>
```

#### Add Custom Validation

```typescript
// composables/useProducts.ts
const schema = z.object({
  name: z.string().min(1),

  // Add async validation
  sku: z.string().refine(async (sku) => {
    const exists = await $fetch(`/api/products/check-sku?sku=${sku}`)
    return !exists
  }, 'SKU already exists')
})
```

#### Add Custom Columns

```typescript
// composables/useProducts.ts
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },

  // Add computed column
  {
    key: 'status',
    label: 'Status',
    render: (row) => row.inStock ? 'Available' : 'Out of Stock'
  },

  // Add custom component
  {
    key: 'actions',
    label: '',
    component: 'ProductActions'  // Your custom component
  }
]
```

#### Add Image Upload

```vue
<script setup lang="ts">
const uploadingImage = ref(false)

const handleImageUpload = async (file: File) => {
  uploadingImage.value = true

  // Upload to your storage (Cloudinary, S3, etc.)
  const formData = new FormData()
  formData.append('file', file)

  const { url } = await $fetch('/api/upload', {
    method: 'POST',
    body: formData
  })

  state.value.imageUrl = url
  uploadingImage.value = false
}
</script>

<template>
  <UFormField label="Product Image" name="imageUrl">
    <img v-if="state.imageUrl" :src="state.imageUrl" class="w-32 h-32" />

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleImageUpload($event.target.files[0])"
    />

    <UButton @click="$refs.fileInput.click()" :loading="uploadingImage">
      Upload Image
    </UButton>
  </UFormField>
</template>
```

#### Add Rich Text Editor (Simplified)

**Using the Editor Layer:**

Nuxt Crouton provides an optional rich text editor layer powered by Tiptap.

**1. Install:**
```bash
pnpm add @friendlyinternet/nuxt-crouton-editor @nuxt/icon
```

**2. Configure:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-editor'  // Add this
  ]
})
```

**3. Use in Forms:**
```vue
<script setup lang="ts">
const state = ref({
  title: '',
  content: '<p></p>'
})
</script>

<template>
  <UFormField label="Content" name="content">
    <EditorSimple v-model="state.content" />
  </UFormField>
</template>
```

**Generator Integration:**

Mark fields to use the editor in your schema:
```json
{
  "content": {
    "type": "text",
    "meta": {
      "component": "EditorSimple"
    }
  }
}
```

**Features:**
- Text formatting (bold, italic, strikethrough)
- Headings (H1, H2, H3)
- Lists (bullet, numbered)
- Code blocks & blockquotes
- Text colors
- Floating toolbar
- Dark mode support

#### Add Multi-Step Form

```vue
<script setup lang="ts">
const currentStep = ref(1)
const totalSteps = 3

const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSubmit = async () => {
  if (currentStep.value < totalSteps) {
    nextStep()
  } else {
    // Final submit
    await create(state.value)
    close()
  }
}
</script>

<template>
  <UForm @submit="handleSubmit">
    <!-- Step indicator -->
    <div class="flex justify-between mb-4">
      <div v-for="step in totalSteps" :key="step"
           :class="{ 'font-bold': step === currentStep }">
        Step {{ step }}
      </div>
    </div>

    <!-- Step 1: Basic info -->
    <div v-if="currentStep === 1">
      <UFormField label="Name" name="name">
        <UInput v-model="state.name" />
      </UFormField>
    </div>

    <!-- Step 2: Details -->
    <div v-if="currentStep === 2">
      <UFormField label="Description" name="description">
        <UTextarea v-model="state.description" />
      </UFormField>
    </div>

    <!-- Step 3: Pricing -->
    <div v-if="currentStep === 3">
      <UFormField label="Price" name="price">
        <UInput v-model.number="state.price" type="number" />
      </UFormField>
    </div>

    <!-- Navigation -->
    <div class="flex justify-between">
      <UButton v-if="currentStep > 1" @click="prevStep" variant="ghost">
        Back
      </UButton>
      <UButton type="submit">
        {{ currentStep < totalSteps ? 'Next' : 'Submit' }}
      </UButton>
    </div>
  </UForm>
</template>
```

---

## Data Operations (Mutations)

Nuxt Crouton provides two ways to mutate data:

### Quick Way: useCroutonMutate()

**Use when:** One-off actions, utilities, prototyping

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

// Create
await mutate('create', 'shopProducts', {
  name: 'New Product',
  price: 29.99
})

// Update
await mutate('update', 'shopProducts', {
  id: 'product-123',
  name: 'Updated Name'
})

// Delete
await mutate('delete', 'shopProducts', ['id1', 'id2'])
</script>
```

### Optimized Way: useCollectionMutation()

**Use when:** Forms, repeated operations

```vue
<script setup lang="ts">
const { create, update, deleteItems } = useCollectionMutation('shopProducts')

// Create
await create({
  name: 'New Product',
  price: 29.99
})

// Update
await update('product-123', {
  name: 'Updated Name'
})

// Delete
await deleteItems(['id1', 'id2'])
</script>
```

### When to Use Which?

| Scenario | Use This |
|----------|----------|
| Toggle button | `useCroutonMutate()` |
| Quick add button | `useCroutonMutate()` |
| Utility function | `useCroutonMutate()` |
| Generated form | `useCollectionMutation()` |
| Multi-step wizard | `useCollectionMutation()` |
| Bulk operations (same collection) | `useCollectionMutation()` |

**See:** [Mutations Guide](./guides/mutations-guide.md) for comprehensive examples.

---

## Querying Data

### Basic Query

```vue
<script setup lang="ts">
const { items, pending, error, refresh } = await useCollectionQuery('shopProducts')
</script>

<template>
  <div v-if="pending">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else>
    <div v-for="product in items" :key="product.id">
      {{ product.name }}
    </div>
  </div>
</template>
```

### With Query Parameters

```vue
<script setup lang="ts">
const page = ref(1)
const search = ref('')

const { items, pending } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    page: page.value,
    search: search.value
  }))
})
</script>
```

### With Translations

```vue
<script setup lang="ts">
const { locale } = useI18n()

const { items } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    locale: locale.value
  }))
})

// Auto-refetches when locale changes!
</script>
```

### Manual Refetch

```vue
<script setup lang="ts">
const { items, refresh } = await useCollectionQuery('shopProducts')

// Manually refetch
const handleRefresh = async () => {
  await refresh()
}
</script>

<template>
  <UButton @click="handleRefresh">Refresh</UButton>
</template>
```

### How Caching Works

```typescript
// Each unique query gets its own cache entry
collection:shopProducts:{}                      // All products
collection:shopProducts:{"page":1}              // Page 1
collection:shopProducts:{"page":2}              // Page 2
collection:shopProducts:{"locale":"en"}         // English products
collection:shopProducts:{"page":1,"locale":"fr"} // Page 1, French

// After mutation, all matching caches refresh automatically
await create({ name: 'New Product' })
// → Triggers refetch for all shopProducts queries
```

---

## Working with Relations

Relations are how you connect data between collections (e.g., products → categories, posts → authors).

### The Simple Approach: Foreign Keys Only

**Most apps can just store IDs and query manually:**

```typescript
// Store the relationship
const product = {
  id: '123',
  name: 'Widget',
  categoryId: 'cat-456'  // ← Just store the ID
}

// Query when needed
const category = await db.select()
  .from(categories)
  .where(eq(categories.id, product.categoryId))
```

**When to use this:**
- ✅ Simple CRUD apps
- ✅ You only need relations occasionally
- ✅ You prefer explicit queries
- ✅ Learning/prototyping

This is the **recommended starting point** for most applications.

---

### Advanced: Drizzle Relations

**For apps with lots of related data queries:**

Drizzle relations let you fetch related data in one query, avoiding N+1 query problems:

```typescript
// Define relation (one-time setup in schema.ts)
import { relations } from 'drizzle-orm'

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  })
}))

// Query with automatic join
const product = await db.query.products.findFirst({
  where: eq(products.id, '123'),
  with: { category: true }  // ← Drizzle handles the join
})

// Now product.category is populated in ONE query
console.log(product.category.name)
```

**When to use this:**
- ✅ Fetching lists with related data (100 products + their categories = 1 query, not 101)
- ✅ Nested data (Product → Category → ParentCategory)
- ✅ Complex filtering ("Get products WHERE category.name = 'Electronics'")
- ✅ Performance critical queries

---

### Form Pattern: Relation Dropdowns

**Generated forms don't include relation fields** - you add them manually as needed.

**Example: Add category dropdown to product form**

```vue
<!-- layers/shop/components/products/Form.vue -->
<script setup lang="ts">
// Keep generated form setup
const props = defineProps<ShopProductsFormProps>()
const { create, update } = useCollectionMutation('shopProducts')

// Add: Fetch related collection for dropdown
const { items: categories } = await useCollectionQuery('shopCategories')
</script>

<template>
  <UForm :state="state" :schema="schema" @submit="handleSubmit">
    <!-- Generated fields -->
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <UFormField label="Price" name="price">
      <UInput v-model.number="state.price" type="number" />
    </UFormField>

    <!-- Add: Category dropdown -->
    <UFormField label="Category" name="categoryId">
      <USelectMenu
        v-model="state.categoryId"
        :options="categories"
        option-attribute="name"
        value-attribute="id"
        placeholder="Select category"
      />
    </UFormField>

    <CroutonButton :action="action" :loading="loading" />
  </UForm>
</template>
```

**With search/filter:**

```vue
<script setup lang="ts">
const { items: categories } = await useCollectionQuery('shopCategories')
const searchQuery = ref('')

const filteredCategories = computed(() =>
  categories.value.filter(c =>
    c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)
</script>

<template>
  <UFormField label="Category" name="categoryId">
    <UInput v-model="searchQuery" placeholder="Search categories..." class="mb-2" />
    <USelectMenu
      v-model="state.categoryId"
      :options="filteredCategories"
      option-attribute="name"
      value-attribute="id"
    />
  </UFormField>
</template>
```

---

### Table Pattern: Display Related Data

**Option 1: Fetch separately (simple, works for small datasets)**

```vue
<script setup lang="ts">
const { items: products } = await useCollectionQuery('shopProducts')
const { items: categories } = await useCollectionQuery('shopCategories')

// Map categories by ID for quick lookup
const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map(c => [c.id, c]))
)

const columns = [
  { key: 'name', label: 'Product' },
  { key: 'price', label: 'Price' },
  {
    key: 'category',
    label: 'Category',
    // Look up category name
    render: (row) => categoryMap.value[row.categoryId]?.name || 'N/A'
  }
]
</script>

<template>
  <CroutonList :rows="products" :columns="columns" />
</template>
```

**Option 2: Server-side join (efficient, scales better)**

```typescript
// server/api/teams/[team]/shop-products-with-category.get.ts
import { db } from '~/server/database'
import { shopProducts, shopCategories } from '~/layers/shop/server/database/schema'

export default defineEventHandler(async (event) => {
  const teamId = getRouterParam(event, 'team')

  // Drizzle relations query (if you set up relations)
  const products = await db.query.shopProducts.findMany({
    where: eq(shopProducts.teamId, teamId),
    with: { category: true }  // Join automatically
  })

  return products
})
```

```vue
<script setup lang="ts">
// Custom endpoint with joined data
const { data: products } = await useFetch('/api/teams/current/shop-products-with-category')

const columns = [
  { key: 'name', label: 'Product' },
  { key: 'price', label: 'Price' },
  {
    key: 'category.name',  // Access nested data
    label: 'Category'
  }
]
</script>

<template>
  <CroutonList :rows="products" :columns="columns" />
</template>
```

---

### Manual Drizzle Setup (Optional)

If you want Drizzle relations for performance, set them up manually:

**Step 1: Add foreign key to schema**

```json
// schemas/product-schema.json
[
  { "name": "name", "type": "string" },
  { "name": "price", "type": "number" },
  { "name": "categoryId", "type": "string" }
]
```

**Step 2: Define relations in schema files**

```typescript
// layers/shop/server/database/schema.ts
import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const shopProducts = sqliteTable('shop_products', {
  id: text('id').primaryKey(),
  teamId: text('teamId').notNull(),
  categoryId: text('categoryId'),  // Foreign key
  name: text('name').notNull(),
  price: real('price')
})

export const shopCategories = sqliteTable('shop_categories', {
  id: text('id').primaryKey(),
  teamId: text('teamId').notNull(),
  name: text('name').notNull()
})

// Define relations
export const shopProductsRelations = relations(shopProducts, ({ one }) => ({
  category: one(shopCategories, {
    fields: [shopProducts.categoryId],
    references: [shopCategories.id]
  })
}))

export const shopCategoriesRelations = relations(shopCategories, ({ many }) => ({
  products: many(shopProducts)
}))
```

**Step 3: Create query helper (optional)**

```typescript
// layers/shop/server/database/queries.ts
export async function getShopProductsWithCategories(teamId: string) {
  const db = useDB()

  return await db.query.shopProducts.findMany({
    where: eq(shopProducts.teamId, teamId),
    with: { category: true },
    orderBy: desc(shopProducts.createdAt)
  })
}

export async function getShopProductWithCategory(productId: string, teamId: string) {
  const db = useDB()

  return await db.query.shopProducts.findFirst({
    where: and(
      eq(shopProducts.id, productId),
      eq(shopProducts.teamId, teamId)
    ),
    with: { category: true }
  })
}
```

**Step 4: Use in API route**

```typescript
// server/api/teams/[team]/shop-products/index.get.ts
import { getShopProductsWithCategories } from '~/layers/shop/server/database/queries'

export default defineEventHandler(async (event) => {
  const teamId = getRouterParam(event, 'team')
  return await getShopProductsWithCategories(teamId)
})
```

**Step 5: Add TypeScript types**

```typescript
// layers/shop/types/products.ts
import type { shopProducts, shopCategories } from '../server/database/schema'

export type ShopProduct = typeof shopProducts.$inferSelect
export type ShopCategory = typeof shopCategories.$inferSelect

// With relations
export interface ShopProductWithCategory extends ShopProduct {
  category?: ShopCategory | null
}
```

---

### Best Practices

**✅ DO:**
- **Start simple** - Store foreign keys, query manually when needed
- **Add relations later** - Only if you have performance problems or N+1 queries
- Use `useCollectionQuery` to fetch related collections for dropdowns
- Add database indexes on foreign key columns for performance
- Document your relation patterns in code comments

**❌ DON'T:**
- Over-engineer with Drizzle relations unless you need them
- Forget to handle null/missing relations (`category?.name || 'N/A'`)
- Mix manual joins and Drizzle relations in the same query (pick one approach)
- Skip validation on foreign keys (ensure referenced item exists)

---

### Common Patterns

#### belongsTo (many-to-one)

**Use case:** Many products belong to one category

```typescript
// Schema
export const shopProducts = sqliteTable('shop_products', {
  id: text('id').primaryKey(),
  categoryId: text('categoryId')  // Foreign key
})

// Drizzle relation
export const shopProductsRelations = relations(shopProducts, ({ one }) => ({
  category: one(shopCategories, {
    fields: [shopProducts.categoryId],
    references: [shopCategories.id]
  })
}))

// Query
const product = await db.query.shopProducts.findFirst({
  where: eq(shopProducts.id, '123'),
  with: { category: true }
})
console.log(product.category.name)
```

#### hasMany (one-to-many)

**Use case:** One category has many products

```typescript
// Drizzle relation
export const shopCategoriesRelations = relations(shopCategories, ({ many }) => ({
  products: many(shopProducts)
}))

// Query
const category = await db.query.shopCategories.findFirst({
  where: eq(shopCategories.id, 'cat-123'),
  with: { products: true }
})
console.log(category.products.length)  // All products in this category
```

#### hasOne (one-to-one)

**Use case:** One user has one profile

```typescript
// Schema
export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().unique()  // One-to-one
})

// Drizzle relation
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  })
}))
```

#### manyToMany (advanced)

**Use case:** Products can have many tags, tags can belong to many products

```typescript
// Junction table
export const productTags = sqliteTable('product_tags', {
  productId: text('productId').notNull(),
  tagId: text('tagId').notNull()
})

// Relations
export const shopProductsRelations = relations(shopProducts, ({ many }) => ({
  productTags: many(productTags)
}))

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(shopProducts, {
    fields: [productTags.productId],
    references: [shopProducts.id]
  }),
  tag: one(tags, {
    fields: [productTags.tagId],
    references: [tags.id]
  })
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  productTags: many(productTags)
}))

// Query (requires nested relations)
const product = await db.query.shopProducts.findFirst({
  with: {
    productTags: {
      with: {
        tag: true
      }
    }
  }
})
```

---

### When to Query Relations

**In the component (Option 1):**
- ✅ Simple queries
- ✅ Data already cached
- ✅ Quick prototypes

```vue
<script setup lang="ts">
const { items: products } = await useCollectionQuery('shopProducts')
const { items: categories } = await useCollectionQuery('shopCategories')
// Map in component
</script>
```

**In the API route (Option 2):**
- ✅ Complex joins
- ✅ Performance critical
- ✅ Large datasets
- ✅ Filtering by related fields

```typescript
// server/api/teams/[team]/products-full.get.ts
export default defineEventHandler(async (event) => {
  // Join on server, return combined data
  return await db.query.products.findMany({
    with: { category: true }
  })
})
```

**Rule of thumb:** Start with Option 1, move to Option 2 when you see performance issues.

---

## Forms & Modals

### Opening Forms

```vue
<script setup lang="ts">
const { open } = useCrouton()

// Create new item
const handleCreate = () => {
  open('create', 'shopProducts')
}

// Edit existing item
const handleEdit = (productId: string) => {
  open('update', 'shopProducts', [productId])
}

// Delete items
const handleDelete = (productIds: string[]) => {
  open('delete', 'shopProducts', productIds)
}
</script>

<template>
  <UButton @click="handleCreate">New Product</UButton>
  <UButton @click="handleEdit('product-123')">Edit</UButton>
  <UButton @click="handleDelete(['id1', 'id2'])" color="red">Delete</UButton>
</template>
```

### Container Types

```typescript
// Slideover (default)
open('create', 'shopProducts', [], 'slideover')

// Modal
open('create', 'shopProducts', [], 'modal')

// Dialog
open('delete', 'shopProducts', ['id1'], 'dialog')
```

### Nested Forms

```vue
<script setup lang="ts">
// Open product form
open('create', 'shopProducts')

// From inside product form, open category form
open('create', 'shopCategories')  // Opens on top of product form

// Supports up to 5 levels deep
</script>
```

### Programmatic Control

```vue
<script setup lang="ts">
const { open, close, closeAll, showCrouton } = useCrouton()

// Check if any form is open
if (showCrouton.value) {
  console.log('Form is open')
}

// Close current form
close()

// Close all forms
closeAll()
</script>
```

---

## Multi-Collection Configuration

### Config File Structure

```javascript
// crouton.config.js
export default {
  // Define all collections
  collections: [
    { name: 'products', fieldsFile: './schemas/product.json' },
    { name: 'categories', fieldsFile: './schemas/category.json' },
    { name: 'orders', fieldsFile: './schemas/order.json' },
    { name: 'posts', fieldsFile: './schemas/post.json' },
    { name: 'users', fieldsFile: './schemas/user.json' },
    { name: 'roles', fieldsFile: './schemas/role.json' },
  ],

  // Organize into layers
  targets: [
    {
      layer: 'shop',
      collections: ['products', 'categories', 'orders']
    },
    {
      layer: 'blog',
      collections: ['posts']
    },
    {
      layer: 'admin',
      collections: ['users', 'roles']
    }
  ],

  // Database
  dialect: 'sqlite',  // or 'postgres', 'mysql'

  // Flags
  flags: {
    force: false,           // Overwrite existing files?
    noTranslations: false,  // Skip translations?
    noDb: false,           // Skip database generation?
    dryRun: false,         // Preview only?
    autoRelations: true,   // Generate relation stubs?
    useTeamUtility: true,  // Enable team-based auth?
    useMetadata: true      // Add createdAt/updatedAt?
  }
}
```

### Generate from Config

```bash
# Generate all collections
npx crouton-generate config ./crouton.config.js

# With flags
npx crouton-generate config ./crouton.config.js --force --dry-run
```

### Project Templates

Create reusable templates:

```javascript
// templates/saas-starter.config.js
export default {
  collections: [
    { name: 'users', fieldsFile: './schemas/user.json' },
    { name: 'teams', fieldsFile: './schemas/team.json' },
    { name: 'subscriptions', fieldsFile: './schemas/subscription.json' },
    { name: 'billing', fieldsFile: './schemas/billing.json' },
  ],
  targets: [
    {
      layer: 'admin',
      collections: ['users', 'teams', 'subscriptions', 'billing']
    }
  ],
  flags: {
    useTeamUtility: true,
    useMetadata: true
  }
}
```

Use in new projects:

```bash
cp templates/saas-starter.config.js ./crouton.config.js
npx crouton-generate config ./crouton.config.js
```

---

## Rich Text Editor

Nuxt Crouton provides an optional rich text editor layer powered by **Tiptap**, perfect for blog posts, content management, and any text-heavy forms.

### Installation

```bash
# Install the editor package
pnpm add @friendlyinternet/nuxt-crouton-editor

# Install required peer dependencies
pnpm add @nuxt/icon
```

### Configure Nuxt

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-editor'  // Add this layer
  ]
})
```

### Components

#### EditorSimple

The main editor component with a full-featured toolbar.

**Basic Usage:**

```vue
<script setup lang="ts">
const content = ref('<p>Hello world!</p>')
</script>

<template>
  <EditorSimple v-model="content" />
</template>
```

**In Collection Forms:**

```vue
<!-- layers/blog/components/posts/Form.vue -->
<script setup lang="ts">
const state = ref({
  title: '',
  content: '<p></p>',
  excerpt: ''
})
</script>

<template>
  <UForm :state="state" :schema="schema" @submit="handleSubmit">
    <UFormField label="Title" name="title">
      <UInput v-model="state.title" />
    </UFormField>

    <UFormField label="Content" name="content">
      <EditorSimple v-model="state.content" />
    </UFormField>

    <UFormField label="Excerpt" name="excerpt">
      <UTextarea v-model="state.excerpt" rows="3" />
    </UFormField>

    <CroutonButton :action="action" :loading="loading" />
  </UForm>
</template>
```

### Generator Integration

Automatically use the editor for specific fields by marking them in your schema:

```json
// schemas/post-schema.json
{
  "title": {
    "type": "string",
    "meta": {
      "required": true,
      "label": "Post Title"
    }
  },
  "content": {
    "type": "text",
    "meta": {
      "component": "EditorSimple",
      "label": "Post Content"
    }
  },
  "excerpt": {
    "type": "text",
    "meta": {
      "label": "Excerpt"
    }
  }
}
```

When you generate this collection, the `content` field will automatically use `EditorSimple`.

### Editor Features

- ✅ **Text Formatting**: Bold, italic, strikethrough
- ✅ **Headings**: H1, H2, H3
- ✅ **Lists**: Bullet points and numbered lists
- ✅ **Code Blocks**: Inline code and code blocks
- ✅ **Blockquotes**: Quote formatting
- ✅ **Text Colors**: Custom text coloring
- ✅ **Floating Toolbar**: Appears on text selection
- ✅ **Dark Mode**: Automatic dark mode support
- ✅ **Keyboard Shortcuts**: Standard shortcuts (Cmd+B for bold, etc.)

### Styling

The editor respects your Nuxt UI theme and includes dark mode support. You can customize with CSS:

```vue
<template>
  <EditorSimple
    v-model="content"
    class="my-editor"
  />
</template>

<style>
.my-editor :deep(.tiptap) {
  min-height: 300px;
  padding: 1rem;
}

.my-editor :deep(.tiptap h1) {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}
</style>
```

### Advanced: Custom Tiptap Extensions

If you need additional Tiptap extensions:

```vue
<script setup lang="ts">
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'

const content = ref('<p></p>')

const editor = useEditor({
  content: content.value,
  extensions: [
    StarterKit,
    Image.configure({
      inline: true,
      allowBase64: true
    }),
    Link.configure({
      openOnClick: false
    })
  ],
  onUpdate: ({ editor }) => {
    content.value = editor.getHTML()
  }
})
</script>

<template>
  <div>
    <!-- Custom toolbar -->
    <EditorToolbar :editor="editor" />

    <!-- Editor content -->
    <TiptapEditorContent :editor="editor" class="prose" />
  </div>
</template>
```

### With Translations

Combine the editor with i18n for multilingual content:

```vue
<script setup lang="ts">
const state = ref({
  title: '',
  content: '',
  translations: {}
})

const translatableContent = {
  title: state.value.title,
  content: state.value.content
}
</script>

<template>
  <UForm>
    <!-- Default language -->
    <UFormField label="Title (English)" name="title">
      <UInput v-model="state.title" />
    </UFormField>

    <UFormField label="Content (English)" name="content">
      <EditorSimple v-model="state.content" />
    </UFormField>

    <!-- Translations -->
    <TranslationsInputWithEditor
      v-model="state.translations"
      :fields="['title', 'content']"
      :default-values="translatableContent"
      :editor-fields="['content']"
    />
  </UForm>
</template>
```

### Database Storage

The editor outputs HTML. Store it in a `TEXT` field in your database:

```typescript
// Drizzle schema
export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),  // HTML from editor
  excerpt: text('excerpt'),
  createdAt: integer('createdAt', { mode: 'timestamp' })
})
```

### Display Rendered Content

On the frontend, render the HTML safely:

```vue
<script setup lang="ts">
const { items: posts } = await useCollectionQuery('blogPosts')
</script>

<template>
  <div v-for="post in posts" :key="post.id">
    <h1>{{ post.title }}</h1>
    <!-- Render HTML (ensure it's sanitized on the backend!) -->
    <div class="prose" v-html="post.content" />
  </div>
</template>

<style>
/* Use Tailwind Typography for nice formatting */
.prose {
  @apply max-w-none;
}
</style>
```

**Security Note:** Always sanitize HTML on the backend before saving to prevent XSS attacks:

```typescript
// server/api/blog-posts/index.post.ts
import sanitizeHtml from 'sanitize-html'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Sanitize HTML content
  const sanitized = sanitizeHtml(body.content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class']
    }
  })

  // Save to database
  await db.insert(blogPosts).values({
    ...body,
    content: sanitized
  })
})
```

### Best Practices

**✅ DO:**
- Sanitize HTML on the backend before storing
- Use the `prose` class (Tailwind Typography) for consistent rendering
- Mark editor fields in your schema for automatic generation
- Keep editor content in a `TEXT` database field

**❌ DON'T:**
- Render unsanitized HTML (XSS risk)
- Store editor content in a `VARCHAR` (may truncate)
- Mix editor HTML with plain text fields
- Forget to add `@nuxt/icon` dependency

---

## Translations & i18n

### Install i18n Support

```bash
pnpm add @friendlyinternet/nuxt-crouton-i18n
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-i18n'
  ]
})
```

### Mark Fields as Translatable

```javascript
// crouton.config.js
export default {
  translations: {
    collections: {
      products: ['name', 'description'],  // These fields are translatable
      posts: ['title', 'body', 'excerpt']
    }
  }
}
```

### Generated Form with Translations

```vue
<!-- Auto-generated when using --no-translations=false -->
<template>
  <UForm @submit="handleSubmit">
    <!-- Regular fields -->
    <UFormField label="SKU" name="sku">
      <UInput v-model="state.sku" />
    </UFormField>

    <!-- Translatable fields -->
    <TranslationsInput
      v-model="state.translations"
      :fields="['name', 'description']"
      :default-values="{
        name: state.name,
        description: state.description
      }"
    />
  </UForm>
</template>
```

### Query with Locale

```vue
<script setup lang="ts">
const { locale } = useI18n()

// Auto-fetches for current locale
const { items } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({ locale: locale.value }))
})

// Auto-refetches when locale changes!
</script>
```

### Display Translated Fields

```vue
<script setup lang="ts">
const { t } = useEntityTranslations()
const product = { name: 'Product', translations: { fr: { name: 'Produit' } } }
</script>

<template>
  <!-- Shows "Product" in English, "Produit" in French -->
  <div>{{ t(product, 'name') }}</div>
</template>
```

---

## Team-Based Authentication

### Enable Team Utilities

```javascript
// crouton.config.js
flags: {
  useTeamUtility: true
}
```

### Use in Components

```vue
<script setup lang="ts">
const { currentTeam } = useTeam()

// All API calls include team context
const { items } = await useCollectionQuery('shopProducts')
// → Fetches /api/teams/[teamId]/shop-products
</script>
```

### API Routes

```typescript
// server/api/teams/[team]/shop-products/index.get.ts
export default defineEventHandler(async (event) => {
  const teamId = getRouterParam(event, 'team')

  // Query scoped to team
  const products = await db
    .select()
    .from(products)
    .where(eq(products.teamId, teamId))

  return products
})
```

### Team Switching

```vue
<script setup lang="ts">
const { currentTeam, teams, switchTeam } = useTeam()

const handleSwitchTeam = async (teamId: string) => {
  await switchTeam(teamId)
  // All queries auto-refetch for new team!
}
</script>

<template>
  <USelectMenu
    v-model="currentTeam"
    :options="teams"
    @update:model-value="handleSwitchTeam"
  />
</template>
```

---

## Advanced Patterns

### Conditional Fields

```vue
<template>
  <UForm>
    <UFormField label="Product Type" name="type">
      <USelectMenu
        v-model="state.type"
        :options="['physical', 'digital']"
      />
    </UFormField>

    <!-- Show only for physical products -->
    <UFormField v-if="state.type === 'physical'" label="Weight" name="weight">
      <UInput v-model.number="state.weight" type="number" />
    </UFormField>

    <!-- Show only for digital products -->
    <UFormField v-if="state.type === 'digital'" label="Download URL" name="downloadUrl">
      <UInput v-model="state.downloadUrl" />
    </UFormField>
  </UForm>
</template>
```

### Dependent Dropdowns

```vue
<script setup lang="ts">
const { items: categories } = await useCollectionQuery('shopCategories')
const selectedCategory = ref<string | null>(null)

// Fetch subcategories when category changes
const { items: subcategories } = await useCollectionQuery('shopSubcategories', {
  query: computed(() => ({
    categoryId: selectedCategory.value
  }))
})
</script>

<template>
  <UFormField label="Category" name="categoryId">
    <USelectMenu
      v-model="selectedCategory"
      :options="categories"
      option-attribute="name"
    />
  </UFormField>

  <UFormField v-if="selectedCategory" label="Subcategory" name="subcategoryId">
    <USelectMenu
      v-model="state.subcategoryId"
      :options="subcategories"
      option-attribute="name"
    />
  </UFormField>
</template>
```

### Bulk Operations

```vue
<script setup lang="ts">
const selectedIds = ref<string[]>([])
const { update } = useCollectionMutation('shopProducts')

const handleBulkUpdate = async (updates: any) => {
  for (const id of selectedIds.value) {
    await update(id, updates)
  }
  selectedIds.value = []
}
</script>

<template>
  <div>
    <!-- Selection UI -->
    <CroutonList
      v-model:selected="selectedIds"
      selectable
    />

    <!-- Bulk actions -->
    <UButton
      v-if="selectedIds.length > 0"
      @click="handleBulkUpdate({ featured: true })"
    >
      Mark {{ selectedIds.length }} as Featured
    </UButton>
  </div>
</template>
```

### Optimistic Updates

While mutations automatically invalidate cache and refetch, you can add optimistic updates for instant feedback:

```vue
<script setup lang="ts">
const { items } = await useCollectionQuery('shopProducts')
const { update } = useCollectionMutation('shopProducts')

const toggleFeatured = async (product: Product) => {
  // Optimistic: Update UI immediately
  const index = items.value.findIndex(p => p.id === product.id)
  if (index !== -1) {
    items.value[index].featured = !items.value[index].featured
  }

  try {
    // API call
    await update(product.id, {
      featured: !product.featured
    })
    // Cache auto-refetches on success
  } catch (error) {
    // Rollback on error
    if (index !== -1) {
      items.value[index].featured = !items.value[index].featured
    }
  }
}
</script>
```

### Custom Validation

```typescript
// composables/useProducts.ts
const schema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  discountPrice: z.number().optional()
})
.refine((data) => {
  // Cross-field validation
  if (data.discountPrice && data.discountPrice >= data.price) {
    return false
  }
  return true
}, {
  message: 'Discount must be less than price',
  path: ['discountPrice']
})
.refine(async (data) => {
  // Async validation
  const exists = await $fetch(`/api/products/check-name?name=${data.name}`)
  return !exists
}, {
  message: 'Product name already exists'
})
```

---

## Troubleshooting

### Data Not Updating After Save

**Problem:** Table doesn't refresh after create/update/delete.

**Solution:** Check cache invalidation:

```typescript
// In useCollectionMutation
const invalidateCache = async () => {
  await refreshNuxtData(`collection:${collection}:{}`)
}
```

**Debug:**
```vue
<script setup>
// Check cache key format
const { items } = await useCollectionQuery('shopProducts')
// Console should show: collection:shopProducts:{}
</script>
```

### Hot Reload Not Working

**Problem:** Changes to core library don't reload.

**Solution:** Configure Vite watch:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    server: {
      watch: {
        ignored: ['!**/node_modules/@friendlyinternet/**']
      }
    },
    optimizeDeps: {
      exclude: ['@friendlyinternet/nuxt-crouton']
    }
  }
})
```

Then restart dev server.

### Form Not Opening

**Problem:** Click button, nothing happens.

**Debug:**
```vue
<script setup>
const { open, showCrouton } = useCrouton()

const handleClick = () => {
  console.log('Before:', showCrouton.value)
  open('create', 'shopProducts')
  console.log('After:', showCrouton.value)
}
</script>
```

**Common causes:**
- Collection not registered in `app.config.ts`
- Typo in collection name
- Modal component not imported

### Type Errors After Generation

**Problem:** TypeScript complains about missing types.

**Solution:** Run typecheck:

```bash
npx nuxt typecheck
```

**Common fixes:**
- Restart TypeScript server (VS Code: Cmd+Shift+P → "Restart TS Server")
- Clear `.nuxt` folder: `rm -rf .nuxt`
- Regenerate types: `npx nuxt prepare`

### Delete Button Error

**Problem:** `send is not a function` error when deleting.

**Cause:** Using old generated code with new core library.

**Solution:** Regenerate form:

```bash
pnpm crouton-generate shop products --fields schema.json --force
```

Or manually update Form.vue to use new API (see Migration Guide).

### Cache Not Invalidating

**Problem:** Multiple views, only one updates.

**Debug:**
```typescript
// Check all cache keys
const { items } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    page: page.value  // Different cache per page!
  }))
})
```

**Solution:** Invalidation matches all queries:

```typescript
// useCollectionMutation already does this:
await refreshNuxtData((key) => key.startsWith(`collection:${collection}:`))
```

---

## Migration Guides

### v1.x → v2.0

**Breaking Changes:**

#### 1. `send()` Removed

**Before:**
```vue
<script setup>
const { send } = useCrouton()
await send('create', 'shopProducts', data)
</script>
```

**After (Option 1 - Quick):**
```vue
<script setup>
const { mutate } = useCroutonMutate()
await mutate('create', 'shopProducts', data)
</script>
```

**After (Option 2 - Optimized):**
```vue
<script setup>
const { create } = useCollectionMutation('shopProducts')
await create(data)
</script>
```

#### 2. Global State Removed

**Before:**
```vue
<script setup>
const { shopProducts } = useCollections()
const { data } = await useFetch('/api/products')
shopProducts.value = data.value
</script>
```

**After:**
```vue
<script setup>
const { items } = await useCollectionQuery('shopProducts')
</script>
```

#### 3. Button Component Updated

**Before:**
```vue
<CroutonButton
  :action="action"
  :collection="collection"
  @submit="send(action, collection, state)"
/>
```

**After:**
```vue
<CroutonButton
  :action="action"
  :collection="collection"
  type="submit"
/>
<!-- Form handles submission now -->
```

**Migration Steps:**

1. Update forms:
```bash
# Regenerate all collections (backup first!)
npx crouton-generate config ./crouton.config.js --force
```

2. Or manually update each Form.vue:
   - Replace `send()` with `useCollectionMutation()`
   - Update Button component usage
   - Add `handleSubmit` function

3. Update custom code using `send()`:
   - Find: `const { send } = useCrouton()`
   - Replace: `const { mutate } = useCroutonMutate()`

4. Test thoroughly!

---

## API Reference

### Core Composables

#### useCollectionQuery

Fetch collection data with caching.

```typescript
function useCollectionQuery<T>(
  collection: string,
  options?: {
    query?: ComputedRef<Record<string, any>>
    watch?: boolean
  }
): Promise<{
  items: ComputedRef<T[]>
  data: Ref<any>
  pending: Ref<boolean>
  error: Ref<any>
  refresh: () => Promise<void>
}>
```

**Example:**
```typescript
const { items, pending, refresh } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({ page: 1 }))
})
```

#### useCollectionMutation

Mutate collection data (create/update/delete).

```typescript
function useCollectionMutation(collection: string): {
  create: (data: any) => Promise<any>
  update: (id: string, data: any) => Promise<any>
  deleteItems: (ids: string[]) => Promise<void>
}
```

**Example:**
```typescript
const { create, update, deleteItems } = useCollectionMutation('shopProducts')
await create({ name: 'New Product' })
```

#### useCroutonMutate

Quick mutation API for one-off operations.

```typescript
function useCroutonMutate(): {
  mutate: (
    action: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ) => Promise<any>
}
```

**Example:**
```typescript
const { mutate } = useCroutonMutate()
await mutate('create', 'shopProducts', { name: 'Product' })
```

#### useCrouton

Modal and form state management.

```typescript
function useCrouton(): {
  open: (
    action: 'create' | 'update' | 'delete',
    collection: string,
    ids?: string[],
    container?: 'slideover' | 'modal' | 'dialog',
    initialData?: any
  ) => Promise<void>
  close: (stateId?: string) => void
  closeAll: () => void
  showCrouton: ComputedRef<boolean>
  loading: ComputedRef<string>
  action: ComputedRef<string | null>
}
```

**Example:**
```typescript
const { open, close, showCrouton } = useCrouton()
open('create', 'shopProducts')
```

### Components

#### CroutonList

Display collection items.

```vue
<CroutonList
  :rows="items"
  :columns="columns"
  :loading="pending"
  layout="table"
  collection="shopProducts"
/>
```

**Props:**
- `rows` - Array of items
- `columns` - Column definitions
- `loading` - Loading state
- `layout` - 'table' | 'grid' | 'list' | 'cards'
- `collection` - Collection name

#### CroutonButton

Submit button for forms.

```vue
<CroutonButton
  :action="action"
  :collection="collection"
  :loading="loading"
  type="submit"
/>
```

**Props:**
- `action` - 'create' | 'update' | 'delete'
- `collection` - Collection name
- `loading` - Loading state

---

## Next Steps

### Learn More

- [Mutations Guide](./guides/mutations-guide.md) - Comprehensive mutation examples
- [Feature Ideas](./FEATURE_IDEAS.md) - Roadmap and future features
- [GitHub](https://github.com/pmcp/nuxt-crouton) - Source code and issues

### Get Help

- [GitHub Issues](https://github.com/pmcp/nuxt-crouton/issues) - Report bugs
- [Discussions](https://github.com/pmcp/nuxt-crouton/discussions) - Ask questions
- [Examples](https://github.com/pmcp/nuxt-crouton/tree/main/examples) - Sample apps

### Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

**Built with ❤️ by solo developers, for solo developers.**
