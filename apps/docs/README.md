# Nuxt Crouton Documentation

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Documentation site for [Nuxt Crouton](https://github.com/pmcp/nuxt-crouton) - a code generator and composable library for building CRUD applications in Nuxt 4.

**Live Site**: https://nuxt-crouton.dev/

## About Nuxt Crouton

Nuxt Crouton generates working CRUD interfaces (forms, lists, tables, types, composables) in 30 seconds. It follows the philosophy: **Generate → Customize → Own**.

Key features:
- Generate 80% of CRUD code in 30 seconds
- Full TypeScript support with Zod validation
- Smart caching built on useFetch
- Optional i18n and team-based auth
- Domain-driven architecture with Nuxt Layers

## Monorepo Location

This documentation app is located at `apps/docs/` within the nuxt-crouton monorepo.

Related packages:
- `packages/nuxt-crouton` - Core composables and components
- `packages/nuxt-crouton-cli` - CLI code generator
- `packages/nuxt-crouton-i18n` - Internationalization support
- `packages/nuxt-crouton-editor` - Rich text editor
- `packages/crouton-mcp-server` - MCP server for AI-assisted generation

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm --filter @crouton/docs dev

# Or from this directory
pnpm dev
```

Development server runs on `http://localhost:3000`.

## Production

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Content Structure

Documentation content lives in `content/`:

```
content/
├── 1.getting-started/    # Installation & basic usage
├── 2.fundamentals/       # Core concepts
├── 3.generation/         # CLI commands & schema format
├── 4.patterns/           # Relations, forms, tables
├── 5.customization/      # Custom fields, components
├── 6.features/           # i18n, assets, maps, etc.
├── 7.advanced/           # Performance, auth, bulk ops
├── 8.api-reference/      # Composables, components, types
├── 9.reference/          # Conventions, FAQ, glossary
└── 10.guides/            # Troubleshooting, migration
```

## AI Features

This documentation site includes AI-friendly features:

- **nuxt-llms module** - Generates `/llms.txt` and `/llms-full.txt` endpoints
- **public/llms.txt** - Static LLM-friendly documentation index
- **.claude/README.md** - Project briefing for AI assistants

## Deployment

Deployed to Cloudflare Pages. See `wrangler.toml` for configuration.

## Related Links

- [Nuxt Crouton GitHub](https://github.com/pmcp/nuxt-crouton)
- [SuperSaaS](https://supersaas.dev/) - Starter template Crouton is designed for
- [Nuxt UI](https://ui.nuxt.com) - Component library used
