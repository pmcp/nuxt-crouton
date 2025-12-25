# Features Overview

This section covers advanced features in Nuxt Crouton. Each feature has a stability status indicating its readiness for production use.

## Stability Status

All features in this section are labeled with their current stability status:

::alert{type="info"}
**Stability Legend**

- **Stable** ✅ - Production-ready, fully tested, breaking changes rare
- **Beta** 🔬 - Feature-complete but may have minor changes, safe for non-critical use
- **Experimental** ⚠️ - Under active development, API may change, use with caution
::

## Available Features

### 1. Internationalization (i18n)
**File**: `1.internationalization.md` | **Status**: Stable ✅

Multi-language support for your Nuxt Crouton applications:
- Translatable fields in collections
- Language switching UI
- Translation management interface
- Fallback language support
- Integration with Nuxt i18n module

**Use case**: Multi-language applications, global products, localized content

---

### 2. Rich Text Editor
**File**: `6.rich-text.md` | **Status**: Beta 🔬

Rich text editing capabilities:
- WYSIWYG editor integration
- Markdown support
- Custom formatting options
- Image embedding
- Code blocks and syntax highlighting

**Use case**: Blog posts, documentation, content management systems

---

### 3. Assets & File Management
**File**: `7.assets.md` | **Status**: Experimental ⚠️

File upload and asset management:
- File upload fields
- Image optimization
- Asset storage (local, cloud)
- File type validation
- Asset gallery views

**Use case**: Image galleries, document management, media libraries

**Note**: API may change in future releases. Use storage adapters for production.

---

### 4. SuperSaaS Integration
**File**: `8.supersaas-integration.md` | **Status**: Stable ✅

SuperSaaS integration layer for team-based applications:
- SuperSaaS connector (team-based user management)
- App-level i18n locale files (common UI strings)
- External collection utilities
- API endpoint helpers

**Use case**: Building multi-tenant apps with SuperSaaS for team/user management

---

### 5. AI Integration
**File**: `13.ai.md` | **Status**: Stable ✅

AI chat and completion capabilities:
- useChat() composable for streaming conversations
- useCompletion() for text generation
- AIChatbox, AIMessage, AIInput components
- Multi-provider support (OpenAI, Anthropic)
- Server-side provider factory
- Chat conversation persistence schema

**Use case**: AI assistants, chatbots, content generation, code assistants

---

### 6. Events System
**File**: `9.events.md` | **Status**: Experimental ⚠️

Event-driven architecture for collections:
- Lifecycle hooks (beforeCreate, afterUpdate, etc.)
- Custom event handlers
- Event bus integration
- Webhooks support
- Real-time updates

**Use case**: Audit logging, notifications, data synchronization, workflow automation

**Note**: API under active development. Event patterns may change.

---

### 7. Maps Integration
**File**: `10.maps.md` | **Status**: Beta 🔬

Location and map features:
- Map field types
- Location picker UI
- Geocoding support
- Map providers (Leaflet, Mapbox, Google Maps)
- Custom map styles

**Use case**: Store locators, delivery tracking, location-based services

---

### 8. DevTools
**File**: `11.devtools.md` | **Status**: Beta 🔬

Enhanced development experience:
- Collection inspector
- Schema validator
- Generated code viewer
- Performance profiler
- Database query inspector

**Use case**: Debugging, optimization, understanding generated code

---

### 9. Flow Visualization
**File**: `12.flow.md` | **Status**: Beta 🔬

Interactive graph visualization with real-time collaboration:
- DAG/tree visualization with Vue Flow
- Drag-and-drop node positioning with persistence
- **Real-time multiplayer sync** (Yjs + Durable Objects)
- Presence indicators (cursors, selections)
- Custom node components per collection
- Auto-layout with Dagre

**Use case**: Workflow builders, decision trees, entity relationships, collaborative editing

**Note**: Sync mode requires Cloudflare Durable Objects infrastructure.

---

### 10. Data Export
**File**: `15.export.md` | **Status**: Stable ✅

Export collection data to CSV and JSON formats:
- CSV and JSON export formats
- Custom field selection and labeling
- Field and row transformations
- Server-side query exports
- Ready-to-use export button component
- i18n support for labels

**Use case**: Reporting, data backups, data migration, audit exports

---

## Choosing the Right Features

### For Production Apps
Use **Stable** features with confidence. These are thoroughly tested and have stable APIs.

**Recommended**:
- Internationalization for multi-language needs
- AI Integration for chat and content generation
- SuperSaaS Integration for team-based applications
- Any stable features you need

### For Non-Critical Apps
**Beta** features are safe to use but may have minor API changes in future releases.

**Consider**:
- Rich Text Editor for content-heavy apps
- Maps Integration for location features
- Flow Visualization for workflows and decision trees
- External Connectors for API integrations
- DevTools during development

### For Experimentation
**Experimental** features are under active development. Use in development/staging, but be prepared for API changes.

**Use with caution**:
- Assets & File Management (storage patterns may evolve)
- Events System (hook signatures may change)

## Feature Combinations

Many features work great together:

- **i18n + Rich Text**: Multilingual content with rich formatting
- **AI + i18n**: AI-powered content generation with translations
- **Maps + Assets**: Location-based image galleries
- **Events + External Connectors**: Sync data to external systems on changes
- **Flow + Events**: Trigger actions on workflow step changes
- **AI + Flow**: AI-assisted workflow creation and optimization
- **DevTools + Any Feature**: Debug and optimize during development

## Migration Path

As features mature:

1. **Experimental** features get refined based on feedback
2. **Beta** features stabilize with consistent APIs
3. **Stable** features guarantee backward compatibility

We'll provide migration guides for any breaking changes in experimental/beta features.

## Where to Go Next

After exploring features:

- **API Reference** → Detailed API docs for feature composables and components
- **Guides** → Best practices and troubleshooting
- **Customization** → Customize features to match your needs

## Prerequisites

Before using advanced features:
- Completed [Getting Started](/getting-started)
- Understand [Fundamentals](/fundamentals)
- Familiarity with [Generation](/generation) workflow

## External Resources

Feature-specific external resources:

- **i18n**: [Nuxt i18n Module](https://i18n.nuxtjs.org/)
- **Rich Text**: [Tiptap Editor](https://tiptap.dev/)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/docs), [OpenAI API](https://platform.openai.com/docs), [Anthropic API](https://docs.anthropic.com)
- **Assets**: [Cloudflare R2](https://developers.cloudflare.com/r2/), [AWS S3](https://aws.amazon.com/s3/)
- **Maps**: [Leaflet](https://leafletjs.com/), [Mapbox](https://www.mapbox.com/)
- **Flow**: [Vue Flow](https://vueflow.dev/), [Yjs](https://docs.yjs.dev/), [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Events**: [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

## Feedback & Contributions

Help us improve features:

- Report bugs for any stability level
- Suggest API improvements for beta/experimental features
- Share use cases to help prioritize stabilization
- Contribute documentation improvements

Features graduate to stable status based on:
- Production usage and feedback
- API stability over time
- Comprehensive test coverage
- Complete documentation
