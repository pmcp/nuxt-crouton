# 🥖 Nuxt Crouton

> Crispy, reusable CRUD layers for Nuxt 3 applications

Nuxt Crouton is a collection of Nuxt Layers that provide instant CRUD functionality, multi-language support, and rich text editing for your Nuxt applications. Built as layers (not modules), they're simple, composable, and just work.

## 📦 Packages

### Core

#### [@friendlyinternet/nuxt-crouton](./packages/nuxt-crouton)
Base CRUD layer with essential components and composables for data management.

#### [@friendlyinternet/nuxt-crouton-cli](./packages/nuxt-crouton-cli)
CLI tool to generate complete CRUD collections with API endpoints, components, and database schema.

### Addon Layers

#### [@friendlyinternet/nuxt-crouton-i18n](./packages/nuxt-crouton-i18n)
Multi-language support extending the base layer with i18n capabilities.

#### [@friendlyinternet/nuxt-crouton-editor](./packages/nuxt-crouton-editor)
Rich text editor integration extending the base layer with Tiptap.

#### [@friendlyinternet/nuxt-crouton-supersaas](./packages/nuxt-crouton-supersaas)
SuperSaaS integration layer - connectors, translations, and utilities for SuperSaaS applications.

#### [@friendlyinternet/nuxt-crouton-ai](./packages/nuxt-crouton-ai)
AI integration layer with chat, completion, and multi-provider support (OpenAI, Anthropic).

#### [@friendlyinternet/nuxt-crouton-assets](./packages/nuxt-crouton-assets)
Centralized asset management with NuxtHub blob storage integration.

#### [@friendlyinternet/nuxt-crouton-events](./packages/nuxt-crouton-events)
Event management with calendar integration and scheduling capabilities.

#### [@friendlyinternet/nuxt-crouton-maps](./packages/nuxt-crouton-maps)
Map integration with location fields and geocoding support.

#### [@friendlyinternet/nuxt-crouton-flow](./packages/nuxt-crouton-flow)
Visual flow builder with drag-and-drop workflow creation.

#### [@friendlyinternet/nuxt-crouton-devtools](./packages/nuxt-crouton-devtools)
Development tools and debugging utilities for Crouton applications.

## 🚀 Quick Start

### Installation

```bash
# Core (always required)
pnpm add @friendlyinternet/nuxt-crouton

# CLI scaffolding tool (dev dependency)
pnpm add -D @friendlyinternet/nuxt-crouton-cli

# Addon layers (install as needed)
pnpm add @friendlyinternet/nuxt-crouton-i18n       # Multi-language support
pnpm add @friendlyinternet/nuxt-crouton-editor    # Rich text editing
pnpm add @friendlyinternet/nuxt-crouton-supersaas # SuperSaaS integration
pnpm add @friendlyinternet/nuxt-crouton-ai        # AI chat/completion
pnpm add @friendlyinternet/nuxt-crouton-assets    # Asset management
pnpm add @friendlyinternet/nuxt-crouton-events    # Event/calendar features
pnpm add @friendlyinternet/nuxt-crouton-maps      # Map integration
pnpm add @friendlyinternet/nuxt-crouton-flow      # Visual flow builder
pnpm add @friendlyinternet/nuxt-crouton-devtools  # Dev tools
```

### Configuration

Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    // Base layer (always required)
    '@friendlyinternet/nuxt-crouton',

    // Optional addon layers (add only what you need)
    '@friendlyinternet/nuxt-crouton-i18n',      // Multi-language support
    '@friendlyinternet/nuxt-crouton-editor',    // Rich text editing
    '@friendlyinternet/nuxt-crouton-supersaas', // SuperSaaS integration
    '@friendlyinternet/nuxt-crouton-ai',        // AI chat/completion
    '@friendlyinternet/nuxt-crouton-assets',    // Asset management
    '@friendlyinternet/nuxt-crouton-events',    // Event/calendar features
    '@friendlyinternet/nuxt-crouton-maps',      // Map integration
    '@friendlyinternet/nuxt-crouton-flow',      // Visual flow builder
    '@friendlyinternet/nuxt-crouton-devtools',  // Dev tools
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

  <!-- External Collections (from supersaas layer) -->
  <CroutonReferenceSelect v-model="userId" collection="users" />

  <!-- Translation Components (from i18n layer) -->
  <CroutonI18nInput v-model="translations" :fields="['name', 'description']" />
  <CroutonI18nLanguageSwitcher />

  <!-- Editor Components (from editor layer) -->
  <EditorSimple v-model="content" />
</template>

<script setup>
// Composables are auto-imported
const { items, create, update } = useCrud('products')
const { users } = useUsers() // From supersaas layer
const { t } = useT()
</script>
```

## 🏗️ Architecture

```
@friendlyinternet/nuxt-crouton (base layer - always required)
    │
    ├── @friendlyinternet/nuxt-crouton-i18n        (addon - multi-language)
    ├── @friendlyinternet/nuxt-crouton-editor      (addon - rich text)
    ├── @friendlyinternet/nuxt-crouton-supersaas   (addon - SuperSaaS)
    ├── @friendlyinternet/nuxt-crouton-ai          (addon - AI chat)
    ├── @friendlyinternet/nuxt-crouton-assets      (addon - asset management)
    ├── @friendlyinternet/nuxt-crouton-events      (addon - events/calendar)
    ├── @friendlyinternet/nuxt-crouton-maps        (addon - maps/location)
    ├── @friendlyinternet/nuxt-crouton-flow        (addon - visual flows)
    └── @friendlyinternet/nuxt-crouton-devtools    (addon - dev tools)
```

**Explicit Configuration**: Always include the base layer plus any addons you need. This makes dependencies clear and explicit.

**Development Tools**:
- `@friendlyinternet/nuxt-crouton-cli` - CLI for scaffolding collections

## 🎯 Features

### Base Layer (`@friendlyinternet/nuxt-crouton`)
- ✅ **CrudButton** - Generic action buttons
- ✅ **CroutonReferenceSelect** - Entity selection dropdowns
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

### SuperSaaS Layer (`@friendlyinternet/nuxt-crouton-supersaas`)
- ✅ Everything from base layer
- ✅ **SuperSaaS Connector** - Team-based user management
- ✅ **NuxSaaS Connector** - Admin-level user management
- ✅ **useUsers()** - External user collection composable
- ✅ **External Collection API** - Ready-to-use endpoints
- ✅ **App-level i18n** - Common translation strings

### Collection Generator (`@friendlyinternet/nuxt-crouton-cli`)
- ✅ **CLI Scaffolding** - Generate complete CRUD collections
- ✅ **Form Generation** - Auto-generate forms from schema
- ✅ **List Generation** - Auto-generate tables and lists
- ✅ **API Generation** - Create endpoints and validation
- ✅ **Connector Detection** - Auto-detect and install connectors
- ✅ **Rollback Support** - Undo generated collections

### AI Layer (`@friendlyinternet/nuxt-crouton-ai`)
- ✅ **useChat()** - Streaming chat with conversation history
- ✅ **useCompletion()** - Text completion for single-turn AI
- ✅ **AIChatbox** - Complete chat interface component
- ✅ **Multi-Provider** - OpenAI and Anthropic support
- ✅ **Server Utilities** - Provider factory and streaming

### Assets Layer (`@friendlyinternet/nuxt-crouton-assets`)
- ✅ **CroutonAssetsPicker** - Visual asset browser
- ✅ **CroutonAssetsUploader** - File upload with metadata
- ✅ **useAssetUpload()** - Programmatic upload handling
- ✅ **NuxtHub Integration** - Cloudflare blob storage

### Events Layer (`@friendlyinternet/nuxt-crouton-events`)
- ✅ **Calendar Components** - Event scheduling UI
- ✅ **Date/Time Fields** - Calendar-aware form inputs
- ✅ **Recurring Events** - Schedule patterns support

### Maps Layer (`@friendlyinternet/nuxt-crouton-maps`)
- ✅ **Map Components** - Interactive map display
- ✅ **Location Fields** - Address input with geocoding
- ✅ **Marker Support** - Pin locations on maps

### Flow Layer (`@friendlyinternet/nuxt-crouton-flow`)
- ✅ **Visual Editor** - Drag-and-drop flow builder
- ✅ **Node Types** - Configurable workflow nodes
- ✅ **Flow Execution** - Runtime workflow engine

### DevTools Layer (`@friendlyinternet/nuxt-crouton-devtools`)
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