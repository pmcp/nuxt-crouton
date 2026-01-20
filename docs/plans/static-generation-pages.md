# Plan: Static Generation for Crouton Pages Package

**Status**: Draft - Pending Review
**Package**: `packages/crouton-pages`
**Author**: Claude
**Date**: 2025-01-20

---

## Executive Summary

Implement static generation for the crouton-pages package, enabling pre-rendered pages with edge middleware authentication. This provides fast page loads while maintaining security for member-only content.

### Goals

1. Pre-render all pages (public and member) as static HTML at build time
2. Protect member pages via edge middleware (unauthorized users never see HTML)
3. Load collection blocks client-side with loading skeletons
4. Maintain full CRUD functionality for collections
5. Use standard Nuxt/Nitro patterns (no bespoke solutions)

### Non-Goals

- Changing how CRUD operations work (they remain API-based)
- Modifying the block editor or admin interfaces
- Real-time content updates (content refreshes via SWR/rebuild)

---

## Background

### Current Architecture

Pages are rendered at `/[team]/[locale]/[...slug]` using SSR:

- **Block types**: heroBlock, sectionBlock, ctaBlock, cardGridBlock, separatorBlock, richTextBlock, collectionBlock
- **Visibility levels**: public, members
- **Content storage**: JSON blocks or legacy HTML in database
- **CRUD**: Collection blocks support create/read/update/delete via API

### Problem Statement

SSR works but has trade-offs:
- Every page request hits the server
- No CDN caching benefit for static content
- Higher compute costs at scale

### Proposed Solution

Hybrid static generation:
- Static HTML for page structure (layout, static blocks)
- Edge middleware for auth checks before serving
- Client-side rendering for dynamic collection blocks

---

## Architecture

### Request Flow

```
User Request: GET /acme/en/dashboard
                    │
                    ▼
        ┌───────────────────────┐
        │   Cloudflare Edge     │
        │   (Worker)            │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Server Middleware    │
        │  pageAuth.ts          │
        └───────────┬───────────┘
                    │
            ┌───────┴───────┐
            │               │
            ▼               ▼
      ┌──────────┐   ┌──────────────┐
      │ Auth OK  │   │ No Auth      │
      └────┬─────┘   └──────┬───────┘
           │                │
           ▼                ▼
    ┌─────────────┐  ┌─────────────────┐
    │ Serve Page  │  │ Redirect to     │
    │ (static)    │  │ /auth/login     │
    └─────────────┘  └─────────────────┘
```

### Block Classification

| Block Type | Category | Rendering Strategy |
|------------|----------|-------------------|
| heroBlock | Static | Pre-rendered in HTML |
| sectionBlock | Static | Pre-rendered in HTML |
| ctaBlock | Static | Pre-rendered in HTML |
| cardGridBlock | Static | Pre-rendered in HTML |
| separatorBlock | Static | Pre-rendered in HTML |
| richTextBlock | Static | Pre-rendered in HTML |
| **collectionBlock** | **Dynamic** | **ClientOnly + skeleton** |

### Security Model

| Visibility | Static HTML Generated | Who Can Access |
|------------|----------------------|----------------|
| `public` | Yes | Everyone |
| `members` | Yes (but guarded) | Authenticated team members only |

**Key Security Property**: Edge middleware intercepts requests BEFORE serving static HTML. Unauthorized users are redirected and never see page content.

---

## Implementation Details

### 1. Edge Auth Middleware

**File**: `packages/crouton-pages/server/middleware/pageAuth.ts`

**Purpose**: Check page visibility and user authentication at the edge before serving any content.

```typescript
import { getOrganizationMembershipDirect } from '@crouton/auth/server'
import { getPageVisibility } from '../utils/page-visibility'

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Skip non-page routes
  if (path.startsWith('/api/') || path.startsWith('/_nuxt/') || path.startsWith('/admin/')) {
    return
  }

  // Parse team and slug from path: /team/locale/slug
  const match = path.match(/^\/([^/]+)\/([^/]+)\/(.*)$/)
  if (!match) return

  const [, teamSlug, locale, slug] = match

  // Look up page visibility and teamId (cached at edge via KV)
  const { visibility, teamId } = await getPageVisibility(event, teamSlug, slug, locale)

  // Page not found
  if (!visibility || !teamId) {
    throw createError({ statusCode: 404, message: 'Page not found' })
  }

  // Public pages: allow through
  if (visibility === 'public') return

  // Member pages: require auth
  if (visibility === 'members') {
    const session = await getUserSession(event)

    if (!session?.user) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(path)}`
      return sendRedirect(event, redirectUrl)
    }

    // Check team membership using existing crouton-auth utility (direct DB query)
    const membership = await getOrganizationMembershipDirect(teamId, session.user.id)
    if (!membership) {
      throw createError({ statusCode: 403, message: 'Not a team member' })
    }
  }
})
```

### 2. Page Visibility Cache Helper

**File**: `packages/crouton-pages/server/utils/page-visibility.ts`

**Purpose**: Fast edge lookup of page visibility and teamId using Cloudflare KV cache.

```typescript
import { hubKV } from '#hub/kv'

interface PageVisibilityResult {
  visibility: 'public' | 'members' | null
  teamId: string | null
}

export async function getPageVisibility(
  event: H3Event,
  teamSlug: string,
  slug: string,
  locale: string
): Promise<PageVisibilityResult> {
  const cacheKey = `page-visibility:${teamSlug}:${locale}:${slug}`

  // Check KV cache first (fast edge lookup)
  const cached = await hubKV().get<PageVisibilityResult>(cacheKey)
  if (cached) return cached

  // Query database - returns both visibility and teamId in single query
  const db = hubDatabase()
  const result = await db
    .prepare(`
      SELECT p.visibility, o.id as teamId
      FROM pagesPages p
      JOIN organization o ON p.teamId = o.id
      WHERE o.slug = ? AND p.slug = ? AND p.status = 'published'
    `)
    .bind(teamSlug, slug)
    .first<{ visibility: string; teamId: string }>()

  const data: PageVisibilityResult = {
    visibility: result?.visibility as 'public' | 'members' | null,
    teamId: result?.teamId ?? null
  }

  // Cache for 5 minutes
  if (data.visibility) {
    await hubKV().set(cacheKey, data, { expirationTtl: 300 })
  }

  return data
}

export async function invalidatePageVisibilityCache(
  teamSlug: string,
  slug: string,
  locale: string
) {
  const cacheKey = `page-visibility:${teamSlug}:${locale}:${slug}`
  await hubKV().delete(cacheKey)
}
```

### 3. Collection Block Skeleton Component

**File**: `packages/crouton-pages/app/components/Blocks/Render/CollectionBlockSkeleton.vue`

**Purpose**: Loading placeholder shown while collection data fetches client-side.

```vue
<script setup lang="ts">
interface Props {
  layout?: 'table' | 'list' | 'grid' | 'cards'
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'table',
  pageSize: 10
})

const rows = computed(() => Math.min(props.pageSize, 5))
</script>

<template>
  <div class="animate-pulse">
    <!-- Table skeleton -->
    <template v-if="layout === 'table'">
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div v-for="i in rows" :key="i" class="h-12 bg-gray-100 dark:bg-gray-800 rounded mb-1" />
    </template>

    <!-- Grid/Cards skeleton -->
    <template v-else-if="layout === 'grid' || layout === 'cards'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in rows" :key="i" class="h-32 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    </template>

    <!-- List skeleton -->
    <template v-else>
      <div v-for="i in rows" :key="i" class="h-16 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
    </template>
  </div>
</template>
```

### 4. Collection Block Modification

**File**: `packages/crouton-pages/app/components/Blocks/Render/CollectionBlock.vue`

**Change**: Wrap collection rendering in `<ClientOnly>` with skeleton fallback.

```vue
<script setup lang="ts">
// ... existing props and setup
</script>

<template>
  <div class="collection-block my-8">
    <!-- Title renders in static HTML -->
    <h2 v-if="attrs.title" class="text-2xl font-bold mb-4">
      {{ attrs.title }}
    </h2>

    <!-- Collection data fetched client-side -->
    <ClientOnly>
      <template #fallback>
        <CollectionBlockSkeleton
          :layout="attrs.layout"
          :page-size="attrs.pageSize"
        />
      </template>

      <!-- Existing CroutonCollection with CRUD -->
      <CroutonCollection
        v-if="collectionConfig"
        :collection="attrs.collection"
        :layout="attrs.layout"
        :page-size="attrs.pageSize"
        :stateless="false"
      />
    </ClientOnly>
  </div>
</template>
```

### 5. Route Rules Configuration

**File**: `packages/crouton-pages/nuxt.config.ts`

**Change**: Add route rules for static generation and SWR caching.

```typescript
export default defineNuxtConfig({
  // ... existing config

  routeRules: {
    // Admin routes: client-side only (requires auth context)
    '/admin/**': { ssr: false },

    // API routes: always dynamic
    '/api/**': { prerender: false },

    // All page routes: prerender with SWR
    // Edge middleware handles auth BEFORE serving
    '/:team/:locale/**': {
      prerender: true,
      swr: 3600  // Revalidate hourly
    }
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  }
})
```

### 6. Prerender Routes Discovery

**File**: `packages/crouton-pages/server/plugins/prerender-pages.ts`

**Purpose**: Discover all published pages at build time for static generation.

```typescript
export default defineNitroPlugin((nitro) => {
  if (!import.meta.prerender) return

  nitro.hooks.hook('prerender:routes', async (routes) => {
    try {
      const db = hubDatabase()

      // Get all teams
      const teams = await db
        .prepare('SELECT id, slug FROM organization')
        .all()
        .then(r => r.results as Array<{ id: string; slug: string }>)

      const locales = ['en', 'nl', 'fr'] // From i18n config

      for (const team of teams) {
        // Get all published pages
        const pages = await db
          .prepare(`
            SELECT slug, translations
            FROM pagesPages
            WHERE teamId = ? AND status = 'published'
          `)
          .bind(team.id)
          .all()
          .then(r => r.results as Array<{ slug: string; translations?: string }>)

        for (const page of pages) {
          const translations = page.translations ? JSON.parse(page.translations) : {}

          for (const locale of locales) {
            const localizedSlug = translations[locale]?.slug || page.slug
            routes.add(`/${team.slug}/${locale}/${localizedSlug}`)
          }
        }
      }

      console.log(`[prerender] Added ${routes.size} page routes`)
    } catch (error) {
      console.warn('[prerender] Page discovery failed:', error)
    }
  })
})
```

### 7. Cache Invalidation

**Location**: Page update API endpoints

**Change**: Invalidate KV cache when page visibility changes.

```typescript
// In page update handler
await invalidatePageVisibilityCache(team.slug, page.slug, locale)
```

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `server/middleware/pageAuth.ts` | Create | Edge auth protection |
| `server/utils/page-visibility.ts` | Create | Cached visibility lookup |
| `app/components/Blocks/Render/CollectionBlockSkeleton.vue` | Create | Loading skeleton |
| `app/components/Blocks/Render/CollectionBlock.vue` | Modify | Add ClientOnly wrapper |
| `nuxt.config.ts` | Modify | Route rules for prerender + SWR |
| `server/plugins/prerender-pages.ts` | Create | Discover pages at build time |

---

## CRUD Flow (Unchanged)

Collection CRUD operations are unaffected by static generation:

```
User interacts with collection (create/edit/delete)
                    │
                    ▼
         POST/PATCH/DELETE /api/collections/[name]
                    │
                    ▼
         Server validates auth + permissions
                    │
                    ▼
         Database operation executes
                    │
                    ▼
         Response returned to client
```

API calls are always dynamic - static generation only affects initial page render.

---

## Implementation Order

1. **Create auth middleware** - `server/middleware/pageAuth.ts`
2. **Create visibility helper** - `server/utils/page-visibility.ts`
3. **Create skeleton component** - `CollectionBlockSkeleton.vue`
4. **Modify CollectionBlock** - Add `<ClientOnly>` wrapper
5. **Update nuxt.config.ts** - Add route rules
6. **Create prerender hook** - `server/plugins/prerender-pages.ts`
7. **Add cache invalidation** - On page visibility changes

---

## Verification Checklist

- [ ] Build succeeds: `pnpm build` in crouton-pages
- [ ] Prerendered routes visible in `.output/public/`
- [ ] Public page serves static HTML immediately
- [ ] Member page (logged out) redirects to login without showing content
- [ ] Member page (logged in) serves page, collections load with skeleton
- [ ] CRUD operations work in collection blocks
- [ ] Typecheck passes: `npx nuxt typecheck`

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| KV cache stale after visibility change | Cache invalidation on update + 5min TTL |
| Build fails to discover all pages | Graceful fallback, error logging |
| Collection block errors during SSG | ClientOnly ensures client-side only |
| Auth middleware performance | KV cache for visibility lookups |

---

## Decisions (Resolved)

1. **Locales**: Use `['en', 'fr', 'nl']` for now. Pull from i18n config when available.
2. **Team membership check**: Use existing `getOrganizationMembershipDirect()` from `@crouton/auth/server`. Visibility helper returns `teamId` alongside visibility (single DB query).
3. **SWR duration**: 1 hour (3600s) is appropriate - pages rarely change.
4. **Hidden pages**: Removed. Simplified to just `public` and `members` visibility levels.

---

## References

- [Nuxt Hybrid Rendering](https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering)
- [Nitro Route Rules](https://nitro.unjs.io/config#routerules)
- [NuxtHub KV Storage](https://hub.nuxt.com/docs/features/kv)
- Existing pages package: `packages/crouton-pages/`