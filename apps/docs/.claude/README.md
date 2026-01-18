# Nuxt Crouton Documentation - Project Briefing

## Overview
This is the documentation site for **Nuxt Crouton**, a code generator and composable library for building CRUD applications in Nuxt 4. The site is built with Nuxt Content and Nuxt UI.

**Live Site**: https://nuxt-crouton.dev/

## Monorepo Context
This documentation app is part of the nuxt-crouton monorepo at `apps/docs/`.

**Related packages** (in `packages/`):
- `nuxt-crouton` - Core CRUD composables and components
- `nuxt-crouton-cli` - CLI code generator
- `nuxt-crouton-i18n` - Internationalization support
- `nuxt-crouton-editor` - Rich text editor integration
- `nuxt-crouton-assets` - Asset management
- `crouton-mcp-server` - MCP server for AI-assisted generation
- `crouton-auth` - Authentication utilities

**AI tooling** (in root `.claude/`):
- `settings.json` - MCP server configuration (crouton)
- `skills/crouton.md` - Collection generation skill
- `agents/sync-checker.md` - Documentation sync verification

## What is Nuxt Crouton?
Nuxt Crouton generates working CRUD interfaces (forms, lists, tables, types, composables) in 30 seconds. It follows the philosophy: **Generate → Customize → Own**. Built on the SuperSaaS starter template for Nuxt 4.

## Project Structure

```
crouton-docs/
├── content/                    # All documentation markdown files
│   ├── 1.getting-started/     # Installation & basic usage
│   ├── 2.core-concepts/       # Collections, caching, data operations
│   ├── 3.generators/          # CLI commands & schema format
│   ├── 4.working-with-data/   # Relations, forms, tables, Drizzle
│   ├── 5.customization/       # Custom fields, components, layouts
│   ├── 6.advanced/            # Performance, testing, TypeScript
│   ├── 7.api-reference/       # Composables, components, types
│   └── 8.guides/              # Troubleshooting, migration, best practices
├── app/                       # Nuxt app configuration
├── public/                    # Static assets
│   └── llms.txt              # AI-optimized documentation index
└── nuxt.config.ts            # Nuxt configuration with llms module

Total: 41 markdown documentation files
```

## Key Architecture Concepts

### Two-Layer Architecture (Important!)
Nuxt Crouton has two distinct layers:

1. **Generated Code** (User's code):
   - Forms, lists, tables
   - Lives in user's project
   - User owns and customizes freely
   - Can diverge from templates

2. **Core Library** (Stable):
   - Composables (useCollectionQuery, useCollectionMutation, useCrouton)
   - Modal management
   - Caching built on useFetch
   - Updates via npm
   - Stays consistent

### Domain-Driven Layers
Uses Nuxt layers to organize collections by domain:
- `layers/shop/` - E-commerce (products, orders, inventory)
- `layers/blog/` - Content (posts, authors, comments)
- `layers/admin/` - Administration (users, roles, permissions)

## Common Tasks

### Development
```bash
pnpm dev              # Start dev server on http://localhost:3000
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
```

### Content Updates
- All docs are in `content/` as markdown files
- Uses Nuxt Content for rendering
- Files are numbered for navigation order (1.getting-started, 2.core-concepts, etc.)
- Edit markdown files directly, changes hot-reload in dev mode

### AI Optimization
- `/public/llms.txt` - Quick navigation index for AI models
- `nuxt-llms` module configured in `nuxt.config.ts` with sections
- Generates both `/llms.txt` and `/llms-full.txt` routes

## Key Features Documented

1. **Code Generation**: CLI generates forms, lists, types, composables
2. **Smart Caching**: Automatic cache invalidation on mutations
3. **Modal Management**: useCrouton for modals/slideovers/dialogs
4. **Validation**: Zod schemas for every collection
5. **i18n Support**: Per-field localization (optional)
6. **Team Auth**: Multi-tenant with automatic team scoping (optional)
7. **TypeScript**: Full type safety throughout

## Generator Command Example
```bash
pnpm crouton-generate shop products --fields product-schema.json

# Generates:
# ✅ List.vue - Table/grid/card views
# ✅ _Form.vue - Create/edit/delete forms
# ✅ useProducts.ts - Validation & config
# ✅ types.ts - Full TypeScript support
```

## Important Relationships

- **SuperSaaS**: Starter template Nuxt Crouton is designed for
- **Nuxt 4**: Framework version
- **Nuxt UI**: Component library used
- **Drizzle ORM**: Database ORM integration
- **Zod**: Validation library
- **useFetch**: Nuxt composable that caching is built on

## Common Documentation Patterns

### When updating docs:
1. Use clear, concise language
2. Include code examples for new features
3. Show both basic and advanced usage
4. Link to related concepts
5. Update the relevant section in content/

### Content structure:
- Each file has frontmatter (title, description, navigation)
- Use heading levels properly (##, ###)
- Code blocks with syntax highlighting
- Internal links use relative paths

## Navigation Structure
Docs are organized in this order:
1. Getting Started (What, Installation, Usage)
2. Core Concepts (Architecture, patterns)
3. Generators (CLI usage)
4. Working with Data (Forms, tables, relations)
5. Customization (Extend and customize)
6. Advanced (Performance, testing, TypeScript)
7. API Reference (Technical specs)
8. Guides (Troubleshooting, migration)

## Tech Stack
- **Nuxt 4**: Framework
- **Nuxt Content**: Documentation engine
- **Nuxt UI**: Component library
- **nuxt-llms**: AI optimization module
- **nuxt-og-image**: Social cards
- **TypeScript**: Type safety

## Goals
- Help developers understand Nuxt Crouton quickly
- Provide clear examples and patterns
- Optimize for both human readers and AI assistants
- Keep docs in sync with core library updates
- Show the "Generate → Customize → Own" philosophy clearly

## Not Goals
- This is NOT the Nuxt Crouton library code (that's in a separate repo)
- This is NOT a demo application (demos link to examples elsewhere)
- This is NOT a tutorial site (focused on reference documentation)

## For Claude Code Users
When working on this documentation:
- Reference actual Nuxt Crouton features accurately
- Keep the two-layer architecture concept clear
- Show code examples that work with SuperSaaS
- Link to related concepts when relevant
- Update llms.txt if major structure changes occur
- Use the established numbering system for new sections
