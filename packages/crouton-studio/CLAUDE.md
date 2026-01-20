# CLAUDE.md - @fyit/crouton-studio

## Package Purpose

AI-powered studio for building Nuxt applications through conversation. Adds a `/_studio` route to any Crouton app where developers can chat with AI to create collections, adapt components, and build pages - all within their running app.

## Key Files

| File | Purpose |
|------|---------|
| `app/pages/_studio/index.vue` | Main studio interface with scanner UI |
| `app/composables/useAppScanner.ts` | Composable for scanning host app structure |
| `app/types/studio.ts` | TypeScript types for AppContext, collections, etc. |
| `server/api/_studio/scan.get.ts` | API endpoint for scanning host app |
| `server/utils/scanner.ts` | Server-side scanning utility |
| `nuxt.config.ts` | Layer configuration, extends crouton-ai |

## Architecture

```
Host App                        Studio Layer
────────                        ────────────
nuxt.config.ts
  extends: ['@fyit/crouton-studio']
          │
          └──► /_studio route added
                    │
                    ├──► App Scanner discovers:
                    │    - Layers (local & packages)
                    │    - Collections with fields
                    │    - Components
                    │    - Pages
                    │
                    └──► Uses crouton-ai for chat (future)
```

## App Scanner (Sprint 2)

The scanner discovers the host app's structure:

```typescript
interface AppContext {
  appRoot: string
  layers: LayerInfo[]           // Local layers and Crouton packages
  collections: CollectionInfo[] // With fields, components, composables, endpoints
  components: ComponentInfo[]   // App-level components
  pages: PageInfo[]             // App-level pages
  scannedAt: Date
}
```

### Scanner API

```
GET /api/_studio/scan

Returns discovered artifacts:
- layers: Extended layers (local and packages)
- collections: With fields parsed from types.ts
- components: From app/components/
- pages: From app/pages/
```

### Using the Scanner

```typescript
const {
  scan,
  loading,
  error,
  collections,
  layers,
  buildAIContext
} = useAppScanner()

// Scan on mount
onMounted(() => scan())

// Get context for AI system prompt
const aiContext = buildAIContext()
```

## Configuration

```typescript
// apps/my-app/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-studio'  // Adds /_studio routes
  ]
})
```

## Usage

```bash
# Start your app as normal
pnpm dev

# Visit Studio
open http://localhost:3000/_studio
```

## Route Convention

Studio uses underscore prefix (`/_studio`) to indicate it's an internal/development route, not part of the app's public routes.

## Dependencies

- **Extends**: `@fyit/crouton-ai` - Provides chat composables and AI integration
- **Peer**: `nuxt ^4.0.0`

## Completed Features

### Sprint 1: Package Scaffold
- Package structure with /_studio route
- Extends crouton-ai
- Basic two-panel layout placeholder

### Sprint 2: App Scanner
- Server endpoint to scan host app (`/api/_studio/scan`)
- Discovers layers, collections, components, pages
- Parses collection fields from types.ts
- Reactive composable (`useAppScanner`)
- UI displays discovered artifacts with stats

## Planned Features (Future Sprints)

### Sprint 3: Chat + Artifacts
- Chat interface using `useChat()`
- Parse AI responses into artifacts
- Artifact cards with status indicators

### Sprint 4: CLI Integration
- Server endpoint to run `crouton generate`
- Write schemas, execute CLI
- Hot reload integration

### Sprint 5: Component Adaptation
- AI reads generated components
- Suggests enhancements
- Write adapted components

### Sprint 6: Polish
- Settings page
- Error handling
- Code syntax highlighting

## Component Naming

All components auto-import with `Studio` prefix:
- `Layout.vue` → `<StudioLayout />`
- `ChatPanel.vue` → `<StudioChatPanel />`
- `ArtifactCard.vue` → `<StudioArtifactCard />`

## Common Tasks

### Test Studio integration
1. Add `@fyit/crouton-studio` to your app's extends
2. Run `pnpm dev`
3. Visit `http://localhost:3000/_studio`

### Add new Studio component
1. Create `app/components/{Name}.vue`
2. Component auto-imports with `Studio` prefix
3. Use in pages with `<Studio{Name} />`

### Add new Studio composable
1. Create `app/composables/use{Name}.ts`
2. Auto-imports, use directly: `const { ... } = use{Name}()`

## Testing

```bash
# Test app for Studio
cd apps/studio-test && pnpm dev

# Verify scanner endpoint
curl http://localhost:3000/api/_studio/scan

# Verify types (note: some auto-import errors expected in monorepo)
npx nuxt typecheck
```
