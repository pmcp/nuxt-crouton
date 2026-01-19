# CLAUDE.md - @friendlyinternet/nuxt-crouton-pages

## Package Purpose

CMS-like page management system for Nuxt Crouton. Provides:
- Page types from app packages (Bookings, Sales, etc.)
- Tree/sortable layout for page ordering in admin
- Public page rendering at `/[team]/[slug]`
- Regular pages with rich text editor content
- App-specific page types (e.g., Booking Calendar)
- **Custom domain support** with automatic team resolution

## Key Files

| File | Purpose |
|------|---------|
| `app/composables/usePageTypes.ts` | Aggregate page types from all registered apps |
| `app/composables/useDomainContext.ts` | Custom domain detection and context |
| `app/composables/useNavigation.ts` | Build navigation from published pages |
| `app/composables/usePageBlocks.ts` | Block manipulation utilities |
| `app/components/Renderer.vue` | `CroutonPagesRenderer` - Renders page based on type |
| `app/components/RegularContent.vue` | `CroutonPagesRegularContent` - Rich text content display |
| `app/components/BlockContent.vue` | `CroutonPagesBlockContent` - Block-based content display |
| `app/components/Editor/BlockEditor.vue` | Block-based page editor |
| `app/components/Form.vue` | Page creation/editing form |
| `app/types/blocks.ts` | Block type definitions |
| `app/utils/block-registry.ts` | Block definitions and schemas |
| `app/utils/content-detector.ts` | JSON vs HTML content detection |
| `app/editor/extensions/page-blocks.ts` | TipTap extensions bundle |
| `app/pages/[team]/[...slug].vue` | Public page catch-all route |
| `server/middleware/01-domain-resolver.ts` | Resolves custom domains to teams |
| `server/api/teams/[id]/pages.get.ts` | Get published pages for navigation |
| `server/api/teams/[id]/pages/[slug].get.ts` | Get single page by slug |
| `nuxt.config.ts` | Layer configuration |

## Architecture

```
App Package (e.g., Bookings)
    │
    │  registers pageTypes in app.config.ts
    ▼
usePageTypes() composable
    │
    │  aggregates all page types
    ▼
Admin: PageTypeSelector
    │
    │  admin creates page with selected type
    ▼
Database: pagesPages collection
    │
    │  stores page with pageType field
    ▼
Public: /[team]/[...slug].vue
    │
    │  fetches page by slug
    ▼
CroutonPagesRenderer
    │
    ├── pageType === 'core:regular' → CroutonPagesRegularContent
    └── pageType === 'bookings:calendar' → CroutonBookingsCalendar
```

## Package + Generated Layer Workflow

The pages system uses a split architecture where the **package provides UI components** and the **generated layer provides the data layer**.

### What the Package Provides

```
packages/nuxt-crouton-pages/
├── app/components/
│   ├── Form.vue          # CroutonPagesForm - admin CRUD form
│   ├── Card.vue          # CroutonPagesCard - tree view card
│   ├── List.vue          # CroutonPagesList - convenience wrapper
│   ├── Renderer.vue      # Public page display
│   └── Editor/, Blocks/  # Block editor components
├── app/pages/
│   └── admin/[team]/pages.vue  # Admin page management route
├── app/composables/      # usePageTypes, useDomainContext, etc.
├── app/app.config.ts     # Registers componentName: 'CroutonPagesForm'
└── server/api/           # Public read APIs
```

### What the Generated Layer Provides

```
apps/{app}/layers/pages/collections/pages/
├── types.ts                          # Generated TypeScript types
├── app/composables/usePagesPages.ts  # Columns, schema, config
├── server/api/.../                   # Admin CRUD APIs
└── server/database/                  # Schema + queries
```

### How Form Resolution Works

1. **Package registers component**: In `app/app.config.ts`:
   ```typescript
   croutonCollections: {
     pagesPages: {
       componentName: 'CroutonPagesForm'
     }
   }
   ```

2. **Admin route uses CroutonCollection**: The package's `/admin/[team]/pages.vue` uses `CroutonCollection` with tree layout

3. **Form resolution**: When user clicks create/edit, `CroutonForm` resolves to `CroutonPagesForm` via the `componentName` registration

4. **Data from generated layer**: The form uses composables and APIs from the generated layer

### Using Pages in a New App

1. **Install package**: Add to `nuxt.config.ts`:
   ```typescript
   extends: ['@friendlyinternet/nuxt-crouton-pages']
   ```

2. **Generate collection**: Create `schemas/pages.json` and run:
   ```bash
   pnpm crouton generate
   ```

3. **Run migrations**:
   ```bash
   pnpm db:migrate
   ```

4. **Use**: Navigate to `/admin/[team]/pages` - package provides the UI

### Important: No Generated Components Needed

The generated layer should **NOT** have a `Form.vue` or `List.vue` - these are provided by the package. If the CLI generates them, they can be deleted. The generated layer only needs:
- `types.ts` - TypeScript types
- `app/composables/usePagesPages.ts` - Columns and schema
- `server/api/` - CRUD APIs
- `server/database/` - Database schema and queries

## Page Type Registration

Apps register page types in `app.config.ts`:

```typescript
export default defineAppConfig({
  croutonApps: {
    bookings: {
      id: 'bookings',
      name: 'Bookings',
      pageTypes: [
        {
          id: 'calendar',
          name: 'Booking Calendar',
          component: 'CroutonBookingsCalendar',
          icon: 'i-lucide-calendar',
          category: 'customer',
          description: 'Interactive calendar for bookings'
        },
        {
          id: 'my-bookings',
          name: 'My Bookings',
          component: 'CroutonBookingsList',
          icon: 'i-lucide-list',
          requiresAuth: true
        }
      ]
    }
  }
})
```

## usePageTypes() Composable

```typescript
const {
  pageTypes,           // All aggregated page types
  pageTypesByApp,      // Grouped by source app
  pageTypesByCategory, // Grouped by category
  getPageType,         // Get by fullId (e.g., 'bookings:calendar')
  hasPageType,         // Check if exists
  getDefaultPageType   // Returns 'core:regular'
} = usePageTypes()
```

## Block-Based Page Editor

The package includes a block-based page editor using TipTap and Nuxt UI page components.

### Block Types

| Block | Component | Purpose |
|-------|-----------|---------|
| `heroBlock` | UPageHero | Title, description, CTA, image |
| `sectionBlock` | UPageSection | Feature grid with icons |
| `ctaBlock` | UPageCTA | Call-to-action banner |
| `cardGridBlock` | UPageGrid + UPageCard | Grid of cards |
| `separatorBlock` | USeparator | Visual divider |
| `richTextBlock` | prose div | Standard text content |

### Content Format

Content is stored as JSON in the `content` TEXT column:

```typescript
interface PageBlockContent {
  type: 'doc'
  content: PageBlock[]
}

interface PageBlock {
  type: 'heroBlock' | 'sectionBlock' | 'ctaBlock' | 'cardGridBlock' | 'separatorBlock'
  attrs: Record<string, any>
}
```

### Auto-Detection

The `Renderer.vue` component auto-detects content format:
- **JSON with `type: 'doc'`** → Renders as blocks via `BlockContent.vue`
- **HTML string** → Renders as legacy content via `RegularContent.vue`
- **Empty** → Shows empty state

### Using the Block Editor

```vue
<CroutonPagesEditorBlockEditor
  v-model="content"
  placeholder="Type / to insert a block..."
/>
```

### usePageBlocks() Composable

```typescript
const {
  parse,              // Parse JSON to blocks
  serialize,          // Serialize blocks to JSON
  detectFormat,       // Detect content format
  createEmpty,        // Create empty doc
  fromHtml,           // Convert HTML to blocks
  addBlock,           // Add block to content
  removeBlock,        // Remove block by index
  updateBlock,        // Update block attrs
  moveBlock,          // Reorder blocks
  getAvailableBlocks, // Get block menu items
  getBlockCategories, // Get blocks by category
  getDefinition,      // Get block definition
  getDefaults         // Get default attrs
} = usePageBlocks()
```

### Adding Custom Blocks

1. Define type in `app/types/blocks.ts`
2. Add definition in `app/utils/block-registry.ts`
3. Create TipTap extension in `app/editor/extensions/`
4. Create view component in `app/components/Blocks/Views/`
5. Create render component in `app/components/Blocks/Render/`

## Component Naming

Components auto-import with `CroutonPages` prefix:
- `Renderer.vue` → `<CroutonPagesRenderer />`
- `RegularContent.vue` → `<CroutonPagesRegularContent />`
- `BlockContent.vue` → `<CroutonPagesBlockContent />`
- `Editor/BlockEditor.vue` → `<CroutonPagesEditorBlockEditor />`
- `Blocks/Render/HeroBlock.vue` → `<CroutonPagesBlocksRenderHeroBlock />`

## URL Structure

- **Public pages**: `/[team]/[slug]` (e.g., `/acme/about`, `/acme/book`)
- **Admin**: `/admin/[team]/pages` (uses CroutonCollection with tree layout)
- **Homepage**: `/[team]/` (slug is empty string)

## Page Record Schema

```typescript
interface PageRecord {
  id: string
  teamId: string
  title: string
  slug: string
  pageType: string        // 'core:regular' or 'appId:pageTypeId'
  content?: string        // For regular pages (HTML from editor)
  config?: object         // For app pages (type-specific settings)
  status: 'draft' | 'published' | 'archived'
  visibility: 'public' | 'members' | 'hidden'
  showInNavigation: boolean
  parentId?: string       // For hierarchy
  order: number           // For sorting
  path?: string           // Materialized path
  depth?: number          // Nesting level
}
```

## Common Tasks

### Add a new page type in your app

1. Add to `pageTypes` array in your app's `app.config.ts`
2. Ensure the component is globally registered
3. The component receives `page` prop with the page record

### Create admin page list

```vue
<CroutonCollection
  collection="pagesPages"
  layout="tree"
  :columns="['title', 'slug', 'pageType', 'status']"
/>
```

### Render a page programmatically

```vue
<CroutonPagesRenderer :page="pageData" />
```

## Custom Domain Support

The package includes automatic custom domain resolution via server middleware.

### How It Works

```
Custom Domain Request:
booking.acme.com/about
    │
    ▼
01-domain-resolver.ts middleware
    │
    │  looks up 'booking.acme.com' in domain table
    │  finds: organizationId → org with slug 'acme'
    │
    ▼
URL Rewrite: /about → /acme/about
    │
    ▼
Normal routing: [team]/[...slug].vue
```

### useDomainContext() Composable

```typescript
const {
  isCustomDomain,    // Whether request is from custom domain
  resolvedDomain,    // The custom domain hostname
  resolvedTeamId,    // Team ID from domain lookup
  hideTeamInUrl,     // true on custom domains (hide team in links)
  hostname,          // Current hostname
  isAppDomain        // Whether hostname is known app domain
} = useDomainContext()
```

### useNavigation() Composable

```typescript
const {
  navigation,        // Hierarchical navigation tree
  flatNavigation,    // Flat list of all nav items
  isLoading,         // Loading state
  currentPage,       // Current active page
  isActive,          // Check if nav item is active
  refresh,           // Refresh navigation data
  team               // Current team slug
} = useNavigation()
```

### Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      croutonPages: {
        // Domains to skip (not custom domains)
        appDomains: ['myapp.com', 'staging.myapp.com'],
        // Enable debug logging
        debug: false
      }
    }
  }
})
```

### Domain Setup

1. Add domain to team in admin (`/admin/[team]/settings/domains`)
2. Add DNS TXT record for verification
3. Verify domain via UI
4. Point domain DNS to your app
5. Requests to that domain automatically resolve to the team

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/teams/[id]/pages` | GET | List published pages (for navigation) |
| `/api/teams/[id]/pages/[slug]` | GET | Get single page by slug |

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton`, `@friendlyinternet/nuxt-crouton-editor`
- **Uses**: Collection tree/sortable for admin page list
- **Uses**: Domain table from `@friendlyinternet/nuxt-crouton-auth`

## Dashboard Deprecation

The pages package replaces the dashboard with a pages-based system:

| Before (Dashboard) | After (Pages) |
|--------------------|---------------|
| `/dashboard/[team]` | `/[team]` (homepage page) |
| `/dashboard/[team]/bookings` | `/[team]/my-bookings` (page type) |
| `/dashboard/[team]/settings/*` | Keep (user settings still valid) |
| Collections in dashboard | Moved to `/admin/[team]/crouton/` |

### Migration

1. Install `nuxt-crouton-pages` layer
2. Generate pages collection: `pnpm crouton generate`
3. Create pages in admin: `/admin/[team]/pages`
4. Enable redirect (optional):

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      croutonPages: {
        redirectDashboard: true // Redirect /dashboard/[team] → /[team]
      }
    }
  }
})
```

### What Stays in Dashboard

- `/dashboard/[team]/settings/*` - User account settings (profile, security)
- Settings are user-focused; admin settings are at `/admin/[team]/settings/`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
