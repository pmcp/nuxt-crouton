# @friendlyinternet/nuxt-crouton

Base CRUD layer for FYIT scaffolded collections. Built as a Nuxt Layer for simplicity and reusability.

## What is a Nuxt Layer?

Nuxt Layers are a powerful way to share and reuse partial Nuxt applications. They work like regular Nuxt apps but can be extended by other projects. Components, composables, and utilities are automatically available without complex module building.

## Features

- 🎯 Auto-imported CRUD components
- 📊 Data tables with search and pagination
- 📝 Form handling utilities
- 🔄 Collection management composables
- ⚡ Zero configuration required
- 🏗️ Works as foundation for other layers

## Installation

```bash
pnpm add @friendlyinternet/nuxt-crouton
```

## Configuration

Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton'
  ]
})
```

That's it! All components and composables are now auto-imported.

## Components

### CroutonButton
Generic CRUD action button:
```vue
<CroutonButton
  :action="action"
  :collection="collection"
  :items="selectedItems"
  :loading="loading"
/>
```

### CroutonEntitySelect
Entity selection dropdown:
```vue
<CroutonEntitySelect
  v-model="state.categoryId"
  label="Category"
  entity-type="category"
  collection="categories"
  api-path="categories"
/>
```

### ExpandableSlideover
Expandable panel for forms and details:
```vue
<ExpandableSlideover
  v-model="isOpen"
  :title="title"
  :expandable="true"
  @close="handleClose"
>
  <!-- Content -->
</ExpandableSlideover>
```

### Image Upload Components

**Requires NuxtHub blob storage:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton'],
  hub: {
    blob: true  // Enable NuxtHub blob storage
  }
})
```

#### CroutonImageUpload
Full-size image uploader with preview:
```vue
<template>
  <CroutonImageUpload
    v-model="imageUrl"
    @file-selected="handleUpload"
  />
</template>

<script setup>
const imageUrl = ref('')

const handleUpload = async (file) => {
  if (!file) return

  const formData = new FormData()
  formData.append('image', file)

  const pathname = await $fetch('/api/upload-image', {
    method: 'POST',
    body: formData
  })

  imageUrl.value = `/images/${pathname}`
}
</script>
```

#### CroutonAvatarUpload
Compact avatar uploader:
```vue
<CroutonAvatarUpload
  v-model="avatarUrl"
  :avatar-size="'2xl'"
  @file-selected="handleUpload"
/>
```

**Using in generated forms:**
```json
{
  "imageUrl": {
    "type": "string",
    "meta": {
      "component": "CroutonImageUpload"
    }
  }
}
```

For full asset management (centralized media library), see [@friendlyinternet/nuxt-crouton-assets](https://www.npmjs.com/package/@friendlyinternet/nuxt-crouton-assets).

## Composables

### useCrouton()
Complete CRUD operations:
```typescript
const {
  items,
  loading,
  error,
  create,
  update,
  remove,
  refresh
} = useCrud('products')
```

### useCollections()
Manage collections registry:
```typescript
const {
  getCollection,
  registerCollection,
  collections
} = useCollections()
```

## Using with Addons

This is the base layer. Use it with addon layers for additional features:

```typescript
// Your app's nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',        // Base (this package)
    '@friendlyinternet/nuxt-crouton-i18n',   // Optional: Add translations
    '@friendlyinternet/nuxt-crouton-editor', // Optional: Add rich text editor
    '@friendlyinternet/nuxt-crouton-assets'  // Optional: Add asset management
  ]
})
```

## Architecture

```
@friendlyinternet/nuxt-crouton (base - this layer)
    +
    ├── @friendlyinternet/nuxt-crouton-i18n (addon)
    ├── @friendlyinternet/nuxt-crouton-editor (addon)
    └── @friendlyinternet/nuxt-crouton-assets (addon)
```

**Explicit pattern**: Always include base + any addons you need

## Publishing

This layer can be published directly to npm:

```bash
pnpm publish --access public
```

No build step required - it's just a regular Nuxt app structure!

## License

MIT