# 🥖 Nuxt Crouton

> Crispy, reusable CRUD layers for Nuxt 3 applications

Nuxt Crouton is a collection of Nuxt Layers that provide instant CRUD functionality, multi-language support, and rich text editing for your Nuxt applications. Built as layers (not modules), they're simple, composable, and just work.

## 📦 Packages

### [@friendlyinternet/nuxt-crouton](./packages/nuxt-crouton)
Base CRUD layer with essential components and composables for data management.

### [@friendlyinternet/nuxt-crouton-i18n](./packages/nuxt-crouton-i18n)
Multi-language support extending the base layer with i18n capabilities.

### [@friendlyinternet/nuxt-crouton-editor](./packages/nuxt-crouton-editor)
Rich text editor integration extending the base layer with Tiptap.

## 🚀 Quick Start

### Installation

```bash
# For CRUD + i18n (most common)
pnpm add @friendlyinternet/nuxt-crouton-i18n

# For just CRUD
pnpm add @friendlyinternet/nuxt-crouton

# For CRUD + Editor
pnpm add @friendlyinternet/nuxt-crouton-editor
```

### Configuration

Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    // Base layer (always required)
    '@friendlyinternet/nuxt-crouton',

    // Optional addon layers
    '@friendlyinternet/nuxt-crouton-i18n',   // For translations
    '@friendlyinternet/nuxt-crouton-editor'   // For rich text editing
  ]
})
```

### Usage

All components and composables are auto-imported:

```vue
<template>
  <!-- CRUD Components (from base) -->
  <CrudButton action="create" collection="products" />
  <CrudEntitySelect v-model="category" entity-type="category" />

  <!-- Translation Components (from i18n layer) -->
  <CroutonI18nInput v-model="translations" :fields="['name', 'description']" />
  <CroutonI18nLanguageSwitcher />

  <!-- Editor Components (from editor layer) -->
  <EditorSimple v-model="content" />
</template>

<script setup>
// Composables are auto-imported
const { items, create, update } = useCrud('products')
const { t } = useT()
</script>
```

## 🏗️ Architecture

```
@friendlyinternet/nuxt-crouton (base layer - always required)
    +
    ├── @friendlyinternet/nuxt-crouton-i18n (addon - adds i18n)
    └── @friendlyinternet/nuxt-crouton-editor (addon - adds editor)
```

**Explicit Configuration**: Always include the base layer plus any addons you need. This makes dependencies clear and explicit.

## 🎯 Features

### Base Layer (`@friendlyinternet/nuxt-crouton`)
- ✅ **CrudButton** - Generic action buttons
- ✅ **CrudEntitySelect** - Entity selection dropdowns
- ✅ **ExpandableSlideover** - Expandable panels
- ✅ **Table Components** - Search, pagination, actions
- ✅ **useCrud()** - Complete CRUD operations
- ✅ **useCollections()** - Collection management

### i18n Layer (`@friendlyinternet/nuxt-crouton-i18n`)
- ✅ Everything from base layer
- ✅ **CroutonI18nInput** - Multi-language input fields
- ✅ **CroutonI18nLanguageSwitcher** - Language selection
- ✅ **useT()** - Translation composable
- ✅ **i18n** - Pre-configured with EN, NL, FR

### Editor Layer (`@friendlyinternet/nuxt-crouton-editor`)
- ✅ Everything from base layer
- ✅ **Rich Text Editor** - Tiptap integration
- ✅ **Toolbar** - Formatting options
- ✅ **Commands** - Keyboard shortcuts

## 💡 Why Layers?

Unlike Nuxt Modules that require complex build steps and configurations, Nuxt Layers are just regular Nuxt applications that can be extended. This means:

- **No build step** - Publish directly to npm
- **Simple structure** - Just Vue components and composables
- **Auto-imports** - Everything just works
- **Easy to understand** - It's just a Nuxt app!

## 🔧 Development

### Setup

```bash
# Clone the repository
git clone https://github.com/pmcp/nuxt-crouton.git
cd nuxt-crouton

# Install dependencies
pnpm install

# Work on packages
cd packages/nuxt-crouton
```

### Publishing

```bash
# Publish all packages
pnpm publish:all

# Publish dry run (test)
pnpm publish:dry

# Bump versions
pnpm version:patch
```

## 📚 Examples

Check out the [examples](./examples) directory for complete implementations:

- **basic-crud** - Simple CRUD operations
- **with-translations** - Multi-language application
- **full-stack** - Complete application with all features

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

MIT © FYIT

---

<p align="center">
  Made with ❤️ for the Nuxt community
</p>