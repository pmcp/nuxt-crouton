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
| `app/components/Renderer.vue` | `CroutonPagesRenderer` - Renders page based on type |
| `app/components/RegularContent.vue` | `CroutonPagesRegularContent` - Rich text content display |
| `app/components/Admin/PageTypeSelector.vue` | Page type selection UI for admin |
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

## Component Naming

Components auto-import with `CroutonPages` prefix:
- `Renderer.vue` → `<CroutonPagesRenderer />`
- `RegularContent.vue` → `<CroutonPagesRegularContent />`
- `Admin/PageTypeSelector.vue` → `<CroutonPagesAdminPageTypeSelector />`

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
