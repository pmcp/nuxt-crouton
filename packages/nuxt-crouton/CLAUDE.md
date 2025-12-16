# CLAUDE.md - @friendlyinternet/nuxt-crouton

## Package Purpose

Core CRUD layer for Nuxt applications. Provides composables, components, and server utilities for building data-driven admin panels with team-scoped access, nested forms, and smart caching.

## Key Files

| File | Purpose |
|------|---------|
| `app/composables/useCrouton.ts` | Modal/slideover state management (nested up to 5 levels) |
| `app/composables/useCollectionQuery.ts` | Async data fetching with query-based caching |
| `app/composables/useCollectionMutation.ts` | Create/update/delete with auto cache invalidation |
| `app/composables/useCollections.ts` | Collection config registry from `app.config.croutonCollections` |
| `app/components/Collection.vue` | Multi-layout display (table, list, grid, cards, tree) |
| `app/components/Form.vue` | Main CRUD form handler with nested modal support |
| `server/utils/team-auth.ts` | Team membership validation utilities |

## Architecture

```
useCrouton()          → Modal state (open/close/nesting)
useCollectionQuery()  → Data fetching (SSR-safe, cached)
useCollectionMutation() → CRUD operations (auto-refresh cache)
useCollections()      → Config registry (componentMap, apiPath, references)
```

## Component Naming

All components auto-import with `Crouton` prefix:
- `Form.vue` → `<CroutonForm />`
- `Collection.vue` → `<CroutonCollection />`
- `Table.vue` → `<CroutonTable />`

## Collection Config Pattern

```typescript
// app.config.ts
export default defineAppConfig({
  croutonCollections: {
    products: {
      layer: 'shop',
      apiPath: '/api/teams/{teamId}/products',
      references: { categoryId: 'categories' }, // Auto-refresh on mutation
      dependentFieldComponents: { slots: 'SlotPicker' }
    }
  }
})
```

## API Patterns

- **Team-scoped**: `/api/teams/[id]/{collection}/*`
- **Super admin**: `/api/super-admin/{collection}/*`
- **Fetch strategies**: `?ids=` (query) or `/{id}` (RESTful)

## Cache Keys

```
collection:{name}:{queryJSON}     # List queries
collection-item:{name}:{id}       # Single items
```

Mutations invalidate ALL cache keys for the collection.

## Hooks

```typescript
// Listen for mutations (for event tracking)
useNuxtApp().hook('crouton:mutation', ({ operation, collection, itemId, data }) => {
  // operation: 'create' | 'update' | 'delete' | 'move' | 'reorder'
})
```

## Common Tasks

### Add a new composable
1. Create file in `app/composables/use{Name}.ts`
2. Export function with `use` prefix
3. Auto-imported globally

### Add a new component
1. Create file in `app/components/{Name}.vue`
2. Use `<script setup lang="ts">`
3. Auto-imports as `Crouton{Name}`

### Modify team-auth logic
1. Edit `server/utils/team-auth.ts`
2. Functions: `resolveTeamAndCheckMembership()`, `isTeamMember()`

### Add collection config option
1. Edit types in `app/composables/useCollections.ts`
2. Handle new option in relevant composables
3. Update type exports

## Dependencies

- **Extends**: None (base layer)
- **Required by**: All other crouton packages
- **Peer deps**: `@nuxt/ui ^4.0.0`, `nuxt ^4.0.0`

## Type Definitions

```typescript
// Key types from app/types/table.ts
type LayoutType = 'table' | 'list' | 'grid' | 'cards' | 'tree'
interface PaginationData { currentPage, pageSize, totalItems, sortBy, sortDirection }
interface HierarchyConfig { enabled, parentField?, orderField?, pathField? }
```

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
pnpm build          # Verify build works
```
