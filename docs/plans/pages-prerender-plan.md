# Plan: Prerendering Public Pages in `@fyit/crouton-pages`

## Context

`@fyit/crouton-pages` is a Nuxt layer that provides a multi-tenant CMS. Public pages are served
at `/[team]/[locale]/[...slug]`. Content is stored in a SQLite database (via NuxtHub/Cloudflare)
and rendered through a block system. This plan covers making those public pages prerendered/cached
using the most idiomatic Nuxt approach, while keeping interactive blocks client-only.

### Relevant Nuxt versions
- **Nuxt 4.3** — ISR/SWR payload extraction: client-side SPA navigation to ISR/SWR pages now
  serves cached payloads, not just cached HTML. This makes SWR highly effective for this use case.
- **`inlineRouteRules`** — stable in Nuxt 4, allows `defineRouteRules()` directly in page
  components.

---

## File Map (read these before touching anything)

```
packages/crouton-pages/
├── nuxt.config.ts                                          ← layer config, has commented-out routeRules
├── app/
│   ├── pages/
│   │   └── [team]/[locale]/[...slug].vue                  ← main public page route ← PRIMARY TARGET
│   ├── components/
│   │   ├── BlockContent.vue                               ← renders all blocks ← PRIMARY TARGET
│   │   ├── Blocks/Render/
│   │   │   ├── CollectionBlock.vue                        ← dynamic: watch+$fetch, no SSR data
│   │   │   ├── ChartBlock.vue                             ← dynamic: runtime collection fetch
│   │   │   ├── HeroBlock.vue                              ← static ✓
│   │   │   ├── SectionBlock.vue                           ← static ✓
│   │   │   ├── CTABlock.vue                               ← static ✓
│   │   │   ├── CardGridBlock.vue                          ← static ✓
│   │   │   ├── SeparatorBlock.vue                         ← static ✓
│   │   │   ├── RichTextBlock.vue                          ← static ✓
│   │   │   ├── TwoColumnBlock.vue                         ← static ✓
│   │   │   └── FaqBlock.vue                               ← static ✓ (UAccordion, data in attrs)
│   │   └── Renderer.vue                                   ← dispatches to block or app page type
│   └── composables/
│       └── useDomainContext.ts                            ← custom domain detection
└── server/
    ├── api/
    │   └── teams/[id]/
    │       ├── pages.get.ts                               ← list API (navigation) ← CACHE TARGET
    │       └── pages/[...slug].get.ts                     ← single page API ← CACHE-CONTROL TARGET
    └── middleware/
        └── 01-domain-resolver.ts                          ← custom domain → team rewrite
```

---

## Block Classification

### Static blocks (prerender-safe, no changes needed)
These render purely from their `attrs` prop. They are safe for SSR and prerendering.

| Block | Notes |
|-------|-------|
| `heroBlock` | Pure props |
| `sectionBlock` | Pure props |
| `ctaBlock` | Pure props |
| `cardGridBlock` | Pure props |
| `separatorBlock` | Pure props |
| `richTextBlock` | `v-html` of static HTML string |
| `twoColumnBlock` | Pure props |
| `faqBlock` | UAccordion, static data in attrs |

### Dynamic blocks (must be `<ClientOnly>`)
These fetch runtime data and **do not contribute useful HTML during SSR** — they already render
empty on the server because they use `watch + $fetch` instead of `useFetch`/`useAsyncData`.
Wrapping them in `<ClientOnly>` is both correct and safe.

| Block | Why dynamic |
|-------|-------------|
| `collectionBlock` | `watch + useCollectionQuery` — fetches DB data at runtime |
| `chartBlock` | Fetches from collection, chart library is browser-only |

### Already ClientOnly (no changes needed)
- Admin edit FAB (floating edit button) — already in `<ClientOnly>` ✓
- Inline editor drawer — admin-only, already gated ✓

---

## Changes Required

### Change 1 — `BlockContent.vue`: Wrap dynamic blocks in `<ClientOnly>`

**File:** `packages/crouton-pages/app/components/BlockContent.vue`

**What to change:** In the `<template>`, the current block loop renders all blocks the same way
via `<component :is="...">`. Split the loop to wrap `collectionBlock` and `chartBlock` in
`<ClientOnly>` with a skeleton fallback. All other blocks remain as-is.

**Current pattern (simplified):**
```vue
<template v-for="(block, index) in renderableBlocks" :key="...">
  <component
    :is="getBlockComponent(block.type)"
    v-if="getBlockComponent(block.type)"
    :attrs="block.attrs"
  />
  ...
</template>
```

**Target pattern:**
```vue
<template v-for="(block, index) in renderableBlocks" :key="...">

  <!-- Dynamic blocks: fetch runtime data, must render client-side only -->
  <ClientOnly
    v-if="block.type === 'collectionBlock' || block.type === 'chartBlock'"
  >
    <component
      :is="getBlockComponent(block.type)"
      :attrs="block.attrs"
    />
    <template #fallback>
      <div class="animate-pulse rounded-xl bg-muted h-40 my-8" />
    </template>
  </ClientOnly>

  <!-- Static blocks: SSR/prerender safe, render as-is -->
  <component
    v-else-if="getBlockComponent(block.type)"
    :is="getBlockComponent(block.type)"
    :attrs="block.attrs"
  />

  <!-- Paragraph blocks -->
  <p
    v-else-if="isParagraph(block.type)"
    class="prose prose-lg dark:prose-invert max-w-none"
    v-html="paragraphToHtml(block)"
  />

  <!-- Unknown block type -->
  <div v-else class="p-4 bg-warning/10 text-warning rounded-lg my-4">
    Unknown block type: {{ block.type }}
  </div>

</template>
```

**Why this is correct:** `CollectionBlock.vue` and `ChartBlock.vue` use a `watch + async` fetch
pattern — they produce no meaningful HTML during SSR regardless. `<ClientOnly>` makes this
explicit, prevents hydration mismatches on prerendered pages, and enables a loading skeleton
placeholder during the client-side mount.

---

### Change 2 — `[...slug].vue`: Add `defineRouteRules` for SWR

**File:** `packages/crouton-pages/app/pages/[team]/[locale]/[...slug].vue`

**What to change:** Add `defineRouteRules({ swr: 3600 })` at the top of `<script setup>`,
before the existing logic.

```ts
definePageMeta({
  layout: 'public'
})

// Cache public pages for 1 hour (SWR: serve stale while regenerating)
// Nuxt 4.3: payload extraction means SPA navigation also uses cached payload,
// so the useFetch for page data is not repeated on client-side navigation.
defineRouteRules({ swr: 3600 })
```

**Why SWR over ISR:** SWR (stale-while-revalidate) serves cached content immediately and
regenerates in the background. ISR blocks the next request until revalidation completes.
For a CMS, SWR gives better UX — users never wait for regeneration.

**Why 3600:** Pages change infrequently. Admins editing a page will see changes after at most
1 hour on public URLs, which is acceptable for marketing content. This can be overridden
per-app in `nuxt.config.ts` if needed.

**Nuxt 4 note:** `defineRouteRules` is stable in Nuxt 4 (no experimental flag needed).
For Nuxt 3.13+, it requires `experimental: { inlineRouteRules: true }` in `nuxt.config.ts`.

---

### Change 3 — `nuxt.config.ts`: Enable `inlineRouteRules` (Nuxt 3 compat)

**File:** `packages/crouton-pages/nuxt.config.ts`

**What to change:** Add the experimental flag so `defineRouteRules()` in the page component
works in Nuxt 3.13+ contexts (Nuxt 4 already has it stable).

```ts
export default defineNuxtConfig({
  // ... existing config ...

  experimental: {
    inlineRouteRules: true
  }
})
```

**Note:** This is additive and safe — it just enables the feature. No behavioural changes
unless `defineRouteRules()` is called in a page.

---

### Change 4 — `pages.get.ts`: Add `defineCachedEventHandler` for navigation API

**File:** `packages/crouton-pages/server/api/teams/[id]/pages.get.ts`

**What to change:** Wrap the event handler in `defineCachedEventHandler`. The cache key must
include team, locale, and navigation filter. Bypass cache for authenticated requests (they may
see members-only pages that anonymous users should not).

```ts
export default defineCachedEventHandler(async (event) => {
  // ... existing handler body unchanged ...
}, {
  maxAge: 60 * 5, // 5 minutes — navigation changes less often than page content
  name: 'crouton-pages-list',
  getKey: (event) => {
    const teamParam = getRouterParam(event, 'id') || 'unknown'
    const query = getQuery(event)
    const locale = (query.locale as string) || 'en'
    const nav = query.navigation === 'true' ? '1' : '0'
    const visibility = (query.visibility as string) || 'public'
    return `${teamParam}:${locale}:nav=${nav}:vis=${visibility}`
  },
  shouldBypassCache: async (event) => {
    // Don't cache authenticated requests — they may see member-only pages
    try {
      const { getServerSession } = await import('@fyit/crouton-auth/server/utils/useServerAuth')
      const session = await getServerSession(event)
      return !!session?.user
    } catch {
      return false
    }
  }
})
```

**Why 5 minutes (not 3600):** Navigation updates (a new page becomes published) should
propagate quickly. 5 minutes is a good balance.

---

### Change 5 — `pages/[...slug].get.ts`: Set `Cache-Control` for members-only pages

**File:** `packages/crouton-pages/server/api/teams/[id]/pages/[...slug].get.ts`

**What to change:** After the visibility check passes for `members` visibility, set a
`Cache-Control: private, no-store` header. This prevents Nitro's ISR/SWR + the Nuxt 4.3
payload extraction from accidentally caching private page content.

Find the section in the handler where `visibility === 'members'` is confirmed and the
session has been validated. Just after that block (once we know the user is authenticated
and authorised), add:

```ts
// Prevent ISR/SWR from caching members-only page responses
setResponseHeader(event, 'Cache-Control', 'private, no-store')
```

For public pages (the default path), no header override is needed — Nuxt/Nitro will apply
the SWR cache headers automatically based on the route rule.

---

## Implementation Order

Run `npx nuxt typecheck` after each step.

```
Step 1  BlockContent.vue      → <ClientOnly> for collectionBlock + chartBlock
Step 2  nuxt.config.ts        → experimental.inlineRouteRules: true
Step 3  [...slug].vue         → defineRouteRules({ swr: 3600 })
Step 4  pages.get.ts          → defineCachedEventHandler
Step 5  pages/[...slug].get.ts → Cache-Control: private for members-only
Step 6  npx nuxt typecheck    → fix any type errors
```

---

## What This Achieves

| Scenario | Before | After |
|----------|--------|-------|
| First visit to `/acme/en/about` | SSR render + DB query | SSR render + DB query (same) |
| Second visit within 1 hour | SSR render + DB query | Served from Nitro/CDN cache |
| SPA navigation to `/acme/en/about` (Nuxt 4.3) | `useFetch` re-runs | Payload served from cache |
| Page with `collectionBlock` | Empty SSR + hydration fetch | `<ClientOnly>` skeleton → fetch |
| Members-only page | SSR render | SSR render, `Cache-Control: private` prevents caching |
| Admin viewing page | FAB shown (already ClientOnly) | No change ✓ |

---

## What This Does NOT Do (Out of Scope)

- **Full prerender at build time (`nuxt generate`)**: Requires all routes known at build time.
  For consuming apps that want this, they should use the `prerender:routes` hook in their
  `nuxt.config.ts` to enumerate all published pages from the DB. This is not implemented in
  the package layer itself because the package doesn't know which teams/apps exist.

- **On-demand cache invalidation**: When an admin saves a page, the SWR cache is not
  immediately invalidated. Changes propagate within the `swr` TTL (1 hour). For instant
  invalidation, the consuming app would need to call `nitroApp.hooks.callHook('cache:invalidate')`
  or use a cache purge mechanism specific to the deployment platform.

- **Caching the single-page API for public pages**: The `pages/[...slug].get.ts` handler
  is not wrapped in `defineCachedEventHandler` because it requires reading the `visibility`
  field before knowing if caching is safe, and the existing auth check makes this complex
  to implement safely. The route-level SWR cache (Change 2) handles this at the page level
  instead, which is more appropriate.

---

## Testing Checklist

After implementing all changes, verify:

- [ ] Public page loads and renders static blocks (hero, section, CTA, etc.) in SSR HTML
- [ ] `collectionBlock` shows skeleton on page load, then fills in client-side
- [ ] `chartBlock` shows skeleton on page load, then renders chart client-side
- [ ] Admin edit FAB still appears for admin users (no regression)
- [ ] Members-only page returns 401 for unauthenticated users (not cached version)
- [ ] Navigation API (`/api/teams/:id/pages?navigation=true`) returns cached response on repeat calls
- [ ] SWR headers are present on public page responses (`x-nitro-cache` or similar)
- [ ] `npx nuxt typecheck` passes with zero errors

---

## Key Constraints to Respect

1. **Nitro wildcard conflict** — Do NOT add `routeRules` with patterns like
   `'/api/teams/*/pages/**'` in the package's `nuxt.config.ts`. This conflicts with the
   generated layer routes (`/api/teams/[id]/pages-pages/**`). This is already documented
   in the existing commented-out code. Use `defineRouteRules` in the page component instead.

2. **No `resolveComponent()` for optional packages** — `ChartBlock.vue` already correctly
   uses `resolveComponent('CroutonChartsWidget')` and checks `typeof result !== 'string'`.
   Do not change this pattern.

3. **`<script setup lang="ts">`** — Mandatory for all Vue components. Never Options API.

4. **`useTeamContext()`** — If any team ID is needed in new code, use `useTeamContext()`,
   never raw `route.params.id`.

5. **Nuxt UI 4** — `USeparator` (not `UDivider`), `USwitch` (not `UToggle`),
   `UDropdownMenu` (not `UDropdown`).

6. **`npx nuxt typecheck`** — Run after every file change. Fix errors immediately.