# 🥖 Nuxt Crouton

> Crispy, reusable CRUD layers for Nuxt 3 applications

Nuxt Crouton is a collection of Nuxt Layers that provide instant CRUD functionality, multi-language support, and rich text editing for your Nuxt applications. Built as layers (not modules), they're simple, composable, and just work.

## 📦 Packages

### Core

#### [@fyit/crouton](./packages/nuxt-crouton)
Base CRUD layer with essential components and composables for data management.

#### [@fyit/crouton-cli](./packages/nuxt-crouton-cli)
CLI tool to generate complete CRUD collections with API endpoints, components, and database schema.

### Addon Layers

#### [@fyit/crouton-i18n](./packages/nuxt-crouton-i18n)
Multi-language support extending the base layer with i18n capabilities.

#### [@fyit/crouton-editor](./packages/nuxt-crouton-editor)
Rich text editor integration extending the base layer with Tiptap.

#### [@fyit/crouton-ai](./packages/nuxt-crouton-ai)
AI integration layer with chat, completion, and multi-provider support (OpenAI, Anthropic).

#### [@fyit/crouton-assets](./packages/nuxt-crouton-assets)
Centralized asset management with NuxtHub blob storage integration.

#### [@fyit/crouton-events](./packages/nuxt-crouton-events)
Event management with calendar integration and scheduling capabilities.

#### [@fyit/crouton-maps](./packages/nuxt-crouton-maps)
Map integration with location fields and geocoding support.

#### [@fyit/crouton-flow](./packages/nuxt-crouton-flow)
Visual flow builder with drag-and-drop workflow creation.

#### [@fyit/crouton-devtools](./packages/nuxt-crouton-devtools)
Development tools and debugging utilities for Crouton applications.

## 🚀 Quick Start

### Installation

```bash
# Core (always required)
pnpm add @fyit/crouton

# CLI scaffolding tool (dev dependency)
pnpm add -D @fyit/crouton-cli

# Addon layers (install as needed)
pnpm add @fyit/crouton-i18n       # Multi-language support
pnpm add @fyit/crouton-editor    # Rich text editing
pnpm add @fyit/crouton-ai        # AI chat/completion
pnpm add @fyit/crouton-assets    # Asset management
pnpm add @fyit/crouton-events    # Event/calendar features
pnpm add @fyit/crouton-maps      # Map integration
pnpm add @fyit/crouton-flow      # Visual flow builder
pnpm add @fyit/crouton-devtools  # Dev tools
```

### Configuration

Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    // Base layer (always required)
    '@fyit/crouton',

    // Optional addon layers (add only what you need)
    '@fyit/crouton-i18n',      // Multi-language support
    '@fyit/crouton-editor',    // Rich text editing
    '@fyit/crouton-ai',        // AI chat/completion
    '@fyit/crouton-assets',    // Asset management
    '@fyit/crouton-events',    // Event/calendar features
    '@fyit/crouton-maps',      // Map integration
    '@fyit/crouton-flow',      // Visual flow builder
    '@fyit/crouton-devtools',  // Dev tools
  ]
})
```

### Usage

All components and composables are auto-imported:

```vue
<template>
  <!-- CRUD Components (from base) -->
  <CrudButton action="create" collection="products" />
  <CroutonReferenceSelect v-model="category" collection="categories" />

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
@fyit/crouton (base layer - always required)
    │
    ├── @fyit/crouton-i18n        (addon - multi-language)
    ├── @fyit/crouton-editor      (addon - rich text)
    ├── @fyit/crouton-ai          (addon - AI chat)
    ├── @fyit/crouton-assets      (addon - asset management)
    ├── @fyit/crouton-events      (addon - events/calendar)
    ├── @fyit/crouton-maps        (addon - maps/location)
    ├── @fyit/crouton-flow        (addon - visual flows)
    └── @fyit/crouton-devtools    (addon - dev tools)
```

**Explicit Configuration**: Always include the base layer plus any addons you need. This makes dependencies clear and explicit.

**Development Tools**:
- `@fyit/crouton-cli` - CLI for scaffolding collections

## 🎯 Features

### Base Layer (`@fyit/crouton`)
- ✅ **CrudButton** - Generic action buttons
- ✅ **CroutonReferenceSelect** - Entity selection dropdowns
- ✅ **ExpandableSlideover** - Expandable panels
- ✅ **Table Components** - Search, pagination, actions
- ✅ **useCrud()** - Complete CRUD operations
- ✅ **useCollections()** - Collection management

### i18n Layer (`@fyit/crouton-i18n`)
- ✅ Everything from base layer
- ✅ **CroutonI18nInput** - Multi-language input fields
- ✅ **CroutonI18nLanguageSwitcher** - Language selection
- ✅ **useT()** - Translation composable
- ✅ **i18n** - Pre-configured with EN, NL, FR

### Editor Layer (`@fyit/crouton-editor`)
- ✅ Everything from base layer
- ✅ **Rich Text Editor** - Tiptap integration
- ✅ **Toolbar** - Formatting options
- ✅ **Commands** - Keyboard shortcuts

### Collection Generator (`@fyit/crouton-cli`)
- ✅ **CLI Scaffolding** - Generate complete CRUD collections
- ✅ **Form Generation** - Auto-generate forms from schema
- ✅ **List Generation** - Auto-generate tables and lists
- ✅ **API Generation** - Create endpoints and validation
- ✅ **Rollback Support** - Undo generated collections

### AI Layer (`@fyit/crouton-ai`)
- ✅ **useChat()** - Streaming chat with conversation history
- ✅ **useCompletion()** - Text completion for single-turn AI
- ✅ **AIChatbox** - Complete chat interface component
- ✅ **Multi-Provider** - OpenAI and Anthropic support
- ✅ **Server Utilities** - Provider factory and streaming

### Assets Layer (`@fyit/crouton-assets`)
- ✅ **CroutonAssetsPicker** - Visual asset browser
- ✅ **CroutonAssetsUploader** - File upload with metadata
- ✅ **useAssetUpload()** - Programmatic upload handling
- ✅ **NuxtHub Integration** - Cloudflare blob storage

### Events Layer (`@fyit/crouton-events`)
- ✅ **Calendar Components** - Event scheduling UI
- ✅ **Date/Time Fields** - Calendar-aware form inputs
- ✅ **Recurring Events** - Schedule patterns support

### Maps Layer (`@fyit/crouton-maps`)
- ✅ **Map Components** - Interactive map display
- ✅ **Location Fields** - Address input with geocoding
- ✅ **Marker Support** - Pin locations on maps

### Flow Layer (`@fyit/crouton-flow`)
- ✅ **Visual Editor** - Drag-and-drop flow builder
- ✅ **Node Types** - Configurable workflow nodes
- ✅ **Flow Execution** - Runtime workflow engine

### DevTools Layer (`@fyit/crouton-devtools`)
- ✅ **Debug Panel** - Inspect collections and state
- ✅ **API Explorer** - Test generated endpoints
- ✅ **Schema Viewer** - View collection schemas

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

## 📄 License

MIT © FYIT

---

<p align="center">
  Made with ❤️ for the Nuxt community
</p>