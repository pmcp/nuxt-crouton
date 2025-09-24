# 🥖 Nuxt Crouton

> Crispy, reusable CRUD layers for Nuxt 3 applications

Nuxt Crouton is a collection of Nuxt Layers that provide instant CRUD functionality, multi-language support, and rich text editing for your Nuxt applications. Built as layers (not modules), they're simple, composable, and just work.

## 📦 Packages

### [@fyit/nuxt-crouton](./packages/nuxt-crouton)
Base CRUD layer with essential components and composables for data management.

### [@fyit/nuxt-crouton-translations](./packages/nuxt-crouton-translations)
Multi-language support extending the base layer with i18n capabilities.

### [@fyit/nuxt-crouton-editor](./packages/nuxt-crouton-editor)
Rich text editor integration extending the base layer with Tiptap.

## 🚀 Quick Start

### Installation

```bash
# For CRUD + Translations (most common)
npm install @fyit/nuxt-crouton-translations

# For just CRUD
npm install @fyit/nuxt-crouton

# For CRUD + Editor
npm install @fyit/nuxt-crouton-editor
```

### Configuration

Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    '@fyit/nuxt-crouton-translations' // Includes base CRUD + i18n
    // OR
    '@fyit/nuxt-crouton' // Just base CRUD
    // OR
    '@fyit/nuxt-crouton-editor' // CRUD + Editor
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

  <!-- Translation Components (from translations layer) -->
  <TranslationsInput v-model="translations" :fields="['name', 'description']" />
  <LanguageSwitcher />

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
@fyit/nuxt-crouton (base layer)
    ↑
    ├── @fyit/nuxt-crouton-translations (extends base + adds i18n)
    └── @fyit/nuxt-crouton-editor (extends base + adds editor)
```

When you extend a higher-level layer, you automatically get all features from the layers it extends.

## 🎯 Features

### Base Layer (`@fyit/nuxt-crouton`)
- ✅ **CrudButton** - Generic action buttons
- ✅ **CrudEntitySelect** - Entity selection dropdowns
- ✅ **ExpandableSlideover** - Expandable panels
- ✅ **Table Components** - Search, pagination, actions
- ✅ **useCrud()** - Complete CRUD operations
- ✅ **useCollections()** - Collection management

### Translations Layer (`@fyit/nuxt-crouton-translations`)
- ✅ Everything from base layer
- ✅ **TranslationsInput** - Multi-language input fields
- ✅ **LanguageSwitcher** - Language selection
- ✅ **useT()** - Translation composable
- ✅ **i18n** - Pre-configured with EN, NL, FR

### Editor Layer (`@fyit/nuxt-crouton-editor`)
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
npm run publish:all

# Publish dry run (test)
npm run publish:dry

# Bump versions
npm run version:patch
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