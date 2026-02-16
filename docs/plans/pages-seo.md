# Plan: Page SEO for crouton-pages

## Context

The pages package has partial SEO support that's mostly wired but not usable:

| What | Status | Notes |
|------|--------|-------|
| `seoTitle` column | Exists in DB | Text column, max 60 chars |
| `seoDescription` column | Exists in DB | Text column, max 160 chars |
| `useSeoMeta()` in slug route | Partial | Sets title + description only |
| `useHead()` in slug route | Partial | Sets canonical + hreflang |
| SEO fields in editor UI | Missing | Fields defined in schema but not rendered |
| `ogImage` field | Missing | No column, no UI, no meta tag |
| Open Graph tags | Missing | No `og:title`, `og:description`, `og:image`, `og:url` |
| Twitter Card tags | Missing | No `twitter:card`, `twitter:image` |
| Robots/noindex | Missing | No field or meta tag |

**The gap**: SEO fields exist in the database but users can't edit them, and the rendering only outputs basic `<title>` and `<meta name="description">`. No social sharing support at all.

---

## Scope

This plan covers making page SEO actually functional:

1. Add `ogImage` and `robots` fields to the pages schema + database
2. Make `seoTitle` and `seoDescription` per-locale via `CroutonI18nInput`
3. Add `ogImage` and `robots` controls to the Settings popover
4. Replace `useSeoMeta` with `useServerSeoMeta` and add Open Graph + Twitter Card tags
5. Fix `handleSubmit` to flatten SEO fields from translations to root-level

**Out of scope**: JSON-LD structured data, sitemap generation, SEO scoring/preview panel. These are future enhancements.

---

## Phase 1: Schema & Database

### 1.1 Add `ogImage` field to pages schema

**File**: `packages/crouton-pages/schemas/pages.json`

Add after the `seoDescription` field (line 127):

```json
{
  "name": "ogImage",
  "type": "string",
  "label": "Social Image",
  "maxLength": 500,
  "area": "meta",
  "description": "Image shown when page is shared on social media"
}
```

Using `type: "string"` (URL) rather than `type: "image"` because:
- The image may come from an external URL (CDN, uploaded elsewhere)
- The existing `CroutonImageUpload` component (from crouton-core) can handle upload + URL input in the editor UI
- Keeps the schema simple — it's just a URL string in the database

### 1.2 Add `robots` field to pages schema

**File**: `packages/crouton-pages/schemas/pages.json`

Add after `ogImage`:

```json
{
  "name": "robots",
  "type": "string",
  "label": "Search Engine Indexing",
  "default": "index",
  "maxLength": 50,
  "area": "meta",
  "options": [
    { "value": "index", "label": "Allow indexing" },
    { "value": "noindex", "label": "No indexing" }
  ],
  "description": "Controls whether search engines index this page"
}
```

### 1.3 Regenerate the pages collection

After schema changes:

```bash
pnpm crouton generate   # Regenerates types, composable, API
npx nuxt db generate    # Generate migration for new columns
npx nuxt db migrate     # Apply migration
```

This adds `ogImage` (text) and `robots` (text, default 'index') columns to the pages table.

### 1.4 Update i18n labels

**Files**: `packages/crouton-pages/i18n/locales/{en,fr,nl}.json`

Add to the `pages.fields` section:

**en.json**:
```json
{
  "ogImage": "Social Image",
  "robots": "Search Indexing"
}
```

**fr.json**:
```json
{
  "ogImage": "Image sociale",
  "robots": "Indexation"
}
```

**nl.json**:
```json
{
  "ogImage": "Sociale afbeelding",
  "robots": "Zoekindex"
}
```

Also add robots option labels to each locale:

**en.json** (new `pages.robots` section):
```json
{
  "robots": {
    "index": "Allow indexing",
    "noindex": "No indexing"
  }
}
```

(And translated equivalents for fr/nl.)

---

## Phase 2: Editor UI

### 2.1 Make seoTitle and seoDescription per-locale (translatable)

**Decision**: SEO fields are per-locale from day 1. Different languages need different meta descriptions and SEO titles. This is the correct approach for a multilingual CMS.

**File**: `packages/crouton-pages/app/components/Workspace/Editor.vue`

**How it works**: The `CroutonI18nInput` component (line 807) already renders translatable fields based on the `translatableFields` computed. Adding `seoTitle` and `seoDescription` to this array means they'll appear in the per-locale translation tabs automatically, alongside title/slug/content.

Update `translatableFields` (line 476-482):

```typescript
const translatableFields = computed(() => {
  if (isRegularPage.value) {
    return ['title', 'slug', 'seoTitle', 'seoDescription', 'content']
  }
  return ['title', 'slug', 'seoTitle', 'seoDescription']
})
```

**Note**: `seoTitle` and `seoDescription` will render as standard `UInput`/`UTextarea` fields in each locale tab. No custom `fieldComponents` entry needed — the i18n input renders text inputs by default.

### 2.2 Add ogImage and robots to Settings popover

**File**: Same `Editor.vue`

`ogImage` and `robots` are language-independent (same image and indexing rule across all locales), so they belong in the Settings popover, not in the translation tabs.

The Settings popover (line 704-741) currently shows Layout and Parent Page. Add an SEO section after the existing fields, inside the `<div class="p-4 w-72 space-y-4">`:

```vue
<USeparator class="my-3" />
<div class="text-sm font-medium text-default mb-3">SEO</div>

<UFormField :label="t('pages.fields.ogImage') || 'Social Image'" name="ogImage">
  <CroutonImageUpload
    v-model="state.ogImage"
    size="sm"
    accept="image/*"
  />
</UFormField>

<UFormField :label="t('pages.fields.robots') || 'Search Indexing'" name="robots">
  <USelect
    v-model="state.robots"
    :items="robotsOptions"
    value-key="value"
    size="sm"
    class="w-full"
  />
</UFormField>
```

Add `robotsOptions` to the script section:

```typescript
const robotsOptions = [
  { value: 'index', label: t('pages.robots.index') || 'Allow indexing' },
  { value: 'noindex', label: t('pages.robots.noindex') || 'No indexing' }
]
```

**Why only ogImage and robots in the popover**: `seoTitle` and `seoDescription` are now per-locale in the translation tabs (Phase 2.1). The popover only needs the two language-independent fields.

### 2.3 Update default values

**File**: Same `Editor.vue`

Add to the `defaultValue` object (line 125-135):

```typescript
const defaultValue = {
  pageType: 'pages:regular',
  config: {},
  status: 'draft',
  visibility: 'public',
  showInNavigation: true,
  layout: 'default',
  parentId: null,
  order: 0,
  translations: {},
  ogImage: '',
  robots: 'index'
}
```

**Note**: `seoTitle` and `seoDescription` do NOT go in `defaultValue` — they live inside `translations` (e.g., `{ en: { seoTitle: '', seoDescription: '' }, nl: { ... } }`). The `CroutonI18nInput` component initializes them as empty strings per locale automatically.

### 2.4 Update handleSubmit to flatten SEO fields

**File**: Same `Editor.vue`

**This is required work, not just a verification.** The `handleSubmit` function (line 365-450) explicitly extracts `title`, `slug`, and `content` from the primary locale's translations and flattens them to root-level fields for the API. The same must happen for `seoTitle` and `seoDescription`.

Current code (line 419-426):
```typescript
const submitData = {
  ...state.value,
  title: primary.title || state.value.title,
  slug: primary.slug || state.value.slug,
  content: rawContent && typeof rawContent === 'object' ? JSON.stringify(rawContent) : rawContent,
  translations,
  config: !isRegularPage.value ? state.value.config : null
}
```

Updated code:
```typescript
const submitData = {
  ...state.value,
  title: primary.title || state.value.title,
  slug: primary.slug || state.value.slug,
  seoTitle: primary.seoTitle || '',
  seoDescription: primary.seoDescription || '',
  content: rawContent && typeof rawContent === 'object' ? JSON.stringify(rawContent) : rawContent,
  translations,
  config: !isRegularPage.value ? state.value.config : null
}
```

The SEO fields from the primary locale's translations are flattened to root-level `seoTitle` and `seoDescription` columns — same pattern as `title` and `slug`.

---

## Phase 3: Meta Tag Rendering

### 3.1 Replace `useSeoMeta` with `useServerSeoMeta`

**File**: `packages/crouton-pages/app/pages/[team]/[locale]/[...slug].vue`

**Decision**: Use `useServerSeoMeta` instead of `useSeoMeta`. SEO meta tags are consumed by crawlers during SSR — they don't need to be reactive on the client. This avoids unnecessary client-side overhead.

Replace the current SEO block (lines 207-211):

```typescript
// Site URL for absolute Open Graph URLs
const { croutonPages } = useRuntimeConfig().public
const siteUrl = croutonPages.siteUrl || ''

// SEO meta (server-only — crawlers read SSR HTML)
useServerSeoMeta({
  title: page.value?.seoTitle || page.value?.title || 'Page',
  description: page.value?.seoDescription || undefined,
  // Open Graph
  ogTitle: page.value?.seoTitle || page.value?.title || 'Page',
  ogDescription: page.value?.seoDescription || undefined,
  ogImage: toAbsoluteUrl(page.value?.ogImage, siteUrl),
  ogUrl: `${siteUrl}/${team.value}/${urlLocale.value}/${page.value?.slug || ''}`,
  ogType: 'website',
  // Twitter Card
  twitterCard: page.value?.ogImage ? 'summary_large_image' : 'summary',
  twitterTitle: page.value?.seoTitle || page.value?.title || 'Page',
  twitterDescription: page.value?.seoDescription || undefined,
  twitterImage: toAbsoluteUrl(page.value?.ogImage, siteUrl),
  // Robots
  robots: page.value?.robots === 'noindex' ? 'noindex, nofollow' : undefined
})
```

**Key differences from `useSeoMeta`**:
- Values are not wrapped in `() =>` reactive getters — `useServerSeoMeta` runs once during SSR
- Empty values use `undefined` (not `''`) so Nuxt skips the meta tag entirely
- `twitterCard` is conditional: `summary_large_image` when there's an image, `summary` otherwise
- `robots` only outputs when `noindex` — no need to emit `index, follow` (that's the default)

### 3.2 Add `toAbsoluteUrl` helper

Add a small inline helper in the same `<script setup>` block (or as a local function):

```typescript
function toAbsoluteUrl(url: string | undefined | null, base: string): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `${base}${url}`
}
```

This handles three cases:
- No URL → returns `undefined` (meta tag skipped)
- Already absolute (`https://...`) → returned as-is
- Relative path → prepended with `siteUrl`

### 3.3 Add `siteUrl` to runtimeConfig

**File**: `packages/crouton-pages/nuxt.config.ts`

Add `siteUrl` to the existing `croutonPages` config (line 48-61):

```typescript
runtimeConfig: {
  public: {
    croutonPages: {
      appDomains: [],
      debug: false,
      redirectDashboard: false,
      siteUrl: ''  // Set via NUXT_PUBLIC_CROUTON_PAGES_SITE_URL env var
    }
  }
}
```

**Environment variable**: `NUXT_PUBLIC_CROUTON_PAGES_SITE_URL=https://mysite.com`

Nuxt auto-maps env vars to runtimeConfig using the nested key path convention.

### 3.4 Keep existing `useHead()` block unchanged

The existing `useHead()` (lines 238-249) for canonical URL and hreflang links stays as-is. However, the canonical URL should also use `siteUrl` for absolute URLs:

```typescript
useHead({
  title: () => page.value?.title || 'Page',
  link: () => [
    {
      rel: 'canonical',
      href: `${siteUrl}/${team.value}/${urlLocale.value}/${page.value?.slug || ''}`
    },
    ...alternateLinks.value
  ]
})
```

Also update `alternateLinks` (line 227-234) to use absolute URLs:

```typescript
return locales.value.map((loc: { code: string }) => {
  const translatedSlug = parsedTranslations?.[loc.code]?.slug || baseSlug
  return {
    rel: 'alternate',
    hreflang: loc.code,
    href: `${siteUrl}/${team.value}/${loc.code}/${translatedSlug}`
  }
})
```

---

## Phase 4 (Future): Nice-to-haves

Not part of this implementation, but natural next steps:

- **SEO preview panel**: Google SERP preview showing how the page appears in search results (title truncation, description preview)
- **Social card preview**: Show how the page looks when shared on Twitter/Facebook/LinkedIn
- **Auto-generate description**: Use page content to auto-fill `seoDescription` if empty (first 160 chars of text content)
- **JSON-LD structured data**: WebPage, Article, BreadcrumbList schemas
- **Sitemap.xml generation**: Auto-generate from published pages (see `static-generation-pages.md`)
- **Character count hints**: Add char count feedback for seoTitle (50/60) and seoDescription (140/160) in the i18n input fields — requires `fieldOptions` extension for CroutonI18nInput

---

## Files Changed/Created Summary

### Modified files

| File | Package | Change |
|------|---------|--------|
| `schemas/pages.json` | crouton-pages | Add `ogImage` and `robots` fields |
| `Workspace/Editor.vue` | crouton-pages | Add seoTitle/seoDescription to translatableFields, ogImage/robots to Settings popover, update defaultValue, update handleSubmit |
| `[team]/[locale]/[...slug].vue` | crouton-pages | Replace `useSeoMeta` with `useServerSeoMeta`, add OG + Twitter + robots, absolute URLs |
| `i18n/locales/en.json` | crouton-pages | Add labels for ogImage, robots, robots options |
| `i18n/locales/fr.json` | crouton-pages | Add labels for ogImage, robots, robots options |
| `i18n/locales/nl.json` | crouton-pages | Add labels for ogImage, robots, robots options |
| `nuxt.config.ts` | crouton-pages | Add `siteUrl` to `runtimeConfig.public.croutonPages` |

### Generated files (from `crouton generate` + migration)

| File | Location | Change |
|------|----------|--------|
| `schema.ts` | Generated pages layer | New `ogImage` and `robots` columns |
| `types.ts` | Generated pages layer | Updated TypeScript types |
| Migration file | Generated | ALTER TABLE adds columns |

### No changes needed

| File | Why |
|------|-----|
| `Renderer.vue` | Doesn't handle SEO — that's the route's job |
| `usePageTypes.ts` | No SEO involvement |
| Page API endpoints | Already return all fields |
| `CroutonI18nInput` | Already handles arbitrary string fields — no changes needed |

---

## Implementation Order

```
Phase 1: Schema & Database
  1.1  Add ogImage field to schema
  1.2  Add robots field to schema
  1.3  Regenerate + migrate
  1.4  Update i18n labels (en/fr/nl)

Phase 2: Editor UI
  2.1  Add seoTitle + seoDescription to translatableFields
  2.2  Add ogImage + robots to Settings popover
  2.3  Update defaultValue with ogImage + robots
  2.4  Update handleSubmit to flatten seoTitle + seoDescription

Phase 3: Meta Tag Rendering
  3.1  Replace useSeoMeta → useServerSeoMeta with full OG + Twitter + robots
  3.2  Add toAbsoluteUrl helper
  3.3  Add siteUrl to runtimeConfig.public.croutonPages
  3.4  Update canonical + hreflang to use absolute URLs
```

Each phase is independently useful:
- **Phase 1 alone**: Data model is ready, fields exist
- **Phase 1 + 2**: Users can edit SEO fields per locale (seoTitle/seoDescription in translation tabs, ogImage/robots in popover)
- **Phase 1 + 2 + 3**: Full SEO output on public pages with Open Graph, Twitter Cards, and proper absolute URLs

---

## Key Design Decisions

1. **`ogImage` as string URL, not image field type** — Simpler schema, supports external URLs, upload handled by `CroutonImageUpload` in the editor. The database column is just text.

2. **`seoTitle` and `seoDescription` are per-locale (translatable)** — Different languages need different meta descriptions and SEO titles. They're added to `translatableFields` and rendered in the `CroutonI18nInput` translation tabs alongside title/slug/content. The `handleSubmit` function flattens the primary locale's values to root-level columns (same pattern as title/slug).

3. **`ogImage` and `robots` are global (not translatable)** — The social sharing image and indexing rule are the same across all languages. They live in the Settings popover, not the translation tabs.

4. **`useServerSeoMeta` instead of `useSeoMeta`** — SEO meta tags are for crawlers, which read SSR HTML. No need for client-side reactivity. Better performance, simpler code (no reactive getters).

5. **`robots` as simple index/noindex** — Not a full robots directive. Most users just need "should this page appear in Google?" — two options covers 99% of cases. Default is undefined (no tag = index).

6. **Absolute URLs via `croutonPages.siteUrl` runtime config** — Open Graph spec requires absolute URLs. Placed under `runtimeConfig.public.croutonPages` for consistency with existing config. Set via `NUXT_PUBLIC_CROUTON_PAGES_SITE_URL` env var.

7. **Empty values use `undefined`, not `''`** — Nuxt's `useServerSeoMeta` outputs empty meta tags for empty strings. Using `|| undefined` ensures tags are omitted entirely when values aren't set.

8. **Twitter Card type is conditional** — `summary_large_image` when there's an `ogImage`, `summary` otherwise. Falls back gracefully.

9. **`handleSubmit` requires explicit changes** — The function extracts and flattens translation fields to root-level columns. Adding `seoTitle` and `seoDescription` to `translatableFields` means they also need to be extracted in `handleSubmit` (same as title/slug/content).
