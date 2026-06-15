export default defineMcpResource({
  uri: 'crouton://getting-started',
  name: 'Crouton Getting Started Guide',
  description: 'Quick start guide for using Nuxt Crouton',
  mimeType: 'text/markdown',
  async handler() {
    return {
      contents: [{
        uri: 'crouton://getting-started',
        mimeType: 'text/markdown',
        text: `# Getting Started with Nuxt Crouton

## Prerequisites

- Node.js 18+
- Nuxt 4.x
- pnpm (recommended)

## Installation

\`\`\`bash
# Add Crouton to your Nuxt project
pnpm add nuxt-crouton

# Or using npm
npm install nuxt-crouton
\`\`\`

## Configuration

Add to your \`nuxt.config.ts\`:

\`\`\`typescript
export default defineNuxtConfig({
  modules: ['nuxt-crouton'],
  crouton: {
    // Optional configuration
  }
})
\`\`\`

## Create Your First Collection

### 1. Create a Schema File

Create \`schemas/products.yaml\`:

\`\`\`yaml
name: products
label: Products
icon: i-lucide-package

fields:
  - name: name
    type: string
    label: Product Name
    required: true
    showInTable: true
    sortable: true

  - name: description
    type: text
    label: Description

  - name: price
    type: number
    label: Price
    required: true
    showInTable: true

  - name: category
    type: select
    label: Category
    options:
      - Electronics
      - Clothing
      - Books
      - Home
    showInTable: true
    filterable: true

  - name: inStock
    type: boolean
    label: In Stock
    default: true
    showInTable: true
\`\`\`

### 2. Generate the Collection

\`\`\`bash
pnpm crouton generate
\`\`\`

### 3. Use the Generated Components

\`\`\`vue
<template>
  <div>
    <!-- Table with all products -->
    <ProductsTable />

    <!-- Create modal -->
    <ProductsCreateModal v-model="showCreate" />

    <!-- Edit modal -->
    <ProductsEditModal v-model="showEdit" :id="selectedId" />
  </div>
</template>

<script setup>
const showCreate = ref(false)
const showEdit = ref(false)
const selectedId = ref(null)

// Use the generated composable
const { data: products, pending } = useProducts()
</script>
\`\`\`

## Generated Files

After running the generator, you get:

\`\`\`
layers/products/
├── components/
│   ├── ProductsTable.vue
│   ├── ProductsForm.vue
│   ├── ProductsCreateModal.vue
│   └── ProductsEditModal.vue
├── composables/
│   ├── useProducts.ts
│   ├── useProduct.ts
│   ├── useCreateProduct.ts
│   ├── useUpdateProduct.ts
│   └── useDeleteProduct.ts
├── server/
│   └── api/
│       └── products/
│           ├── index.get.ts
│           ├── index.post.ts
│           ├── [id].get.ts
│           ├── [id].put.ts
│           └── [id].delete.ts
└── types/
    └── product.ts
\`\`\`

## Next Steps

1. **Customize Components**: Override generated components for custom UI
2. **Add Relations**: Link collections together
3. **Configure Auth**: Add team-based access control
4. **Explore Features**: i18n, assets, maps, and more

## Useful Commands

\`\`\`bash
# Generate all collections
pnpm crouton generate

# Generate specific collection
pnpm crouton generate products

# List available commands
pnpm crouton --help
\`\`\`
`
      }]
    }
  }
})
