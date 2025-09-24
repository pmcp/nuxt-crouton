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

### CrudButton
Generic CRUD action button:
```vue
<CrudButton
  :action="action"
  :collection="collection"
  :items="selectedItems"
  :loading="loading"
/>
```

### CrudEntitySelect
Entity selection dropdown:
```vue
<CrudEntitySelect
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

## Composables

### useCrud()
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

## Extending This Layer

Other layers can build upon nuxt-crouton:

```typescript
// nuxt-crouton-translations/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton'],
  // Add translation-specific features...
})
```

## Architecture

```
@friendlyinternet/nuxt-crouton (this layer)
    ↑
    ├── @friendlyinternet/nuxt-crouton-translations
    └── @friendlyinternet/nuxt-crouton-editor
```

## Publishing

This layer can be published directly to npm:

```bash
pnpm publish --access public
```

No build step required - it's just a regular Nuxt app structure!

## License

MIT