# Migration Plan: alexdeforce.com to Crouton on Cloudflare

## Overview

Migrate alexdeforce.com from Nuxt Content + Netlify CMS + Netlify hosting to a Crouton app on Cloudflare Pages with D1 + R2.

**Source**: `/Users/pmcp/Projects/alexdeforce_v2`
**Target**: `/Users/pmcp/Projects/nuxt-crouton/apps/alexdeforce`
**Reference**: Velo app (`apps/velo`) as structural template

---

## Phase 1: Scaffold the App

### 1.1 Create app directory

```
apps/alexdeforce/
├── nuxt.config.ts
├── package.json
├── app.config.ts
├── app/
│   └── assets/
│       ├── css/main.css
│       └── fonts/           # Fluxisch Else WOFF files
├── server/
│   └── utils/_cf-stubs/     # Copy from velo
├── schemas/
│   ├── articles.json
│   ├── agenda.json
│   ├── tags.json
│   └── pages.json           # Copy from velo
└── layers/
    ├── site/                 # Custom layout layer (Phase 3)
    ├── content/              # Generated: articles, agenda, tags
    ├── crouton/              # Generated: assets
    └── pages/                # Generated: pages
```

### 1.2 package.json

```json
{
  "name": "alexdeforce",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "cf:deploy": "NITRO_PRESET=cloudflare-pages nuxt build && npx wrangler pages deploy dist",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "npx wrangler d1 migrations apply alexdeforce-db --local",
    "db:migrate:prod": "npx wrangler d1 migrations apply alexdeforce-db --remote"
  },
  "dependencies": {
    "@fyit/crouton": "workspace:*",
    "@fyit/crouton-core": "workspace:*",
    "@fyit/crouton-i18n": "workspace:*",
    "@fyit/crouton-assets": "workspace:*",
    "@fyit/crouton-pages": "workspace:*",
    "@libsql/client": "^0.17.0",
    "drizzle-orm": "^0.45.1",
    "nuxt": "^4.2.2",
    "vue": "^3.5.26",
    "vue-router": "^4.6.4"
  },
  "devDependencies": {
    "@fyit/crouton-cli": "workspace:*",
    "drizzle-kit": "^0.31.0",
    "wrangler": "^4.64.0"
  }
}
```

### 1.3 nuxt.config.ts

```typescript
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n',
    '@fyit/crouton-assets',
    '@fyit/crouton-pages',
    './layers/content',
    './layers/pages',
    './layers/crouton',
    './layers/site'          // Custom layout (Phase 3)
  ],
  hub: {
    blob: true,
    db: 'sqlite'
  },
  ogImage: { enabled: false },
  croutonAuth: {
    methods: { passkeys: false }
  },
  // Nitro stubs for Cloudflare compatibility (copy from velo)
})
```

---

## Phase 2: Define Collections & Generate

### 2.1 Schema: articles.json

```json
{
  "name": "articles",
  "label": "Articles",
  "icon": "i-lucide-file-text",
  "description": "Poetry, text, images, radio shows, and news",
  "fields": [
    {
      "name": "title",
      "type": "string",
      "label": "Title",
      "required": true,
      "maxLength": 300,
      "area": "main"
    },
    {
      "name": "date",
      "type": "date",
      "label": "Date",
      "required": true,
      "area": "sidebar"
    },
    {
      "name": "category",
      "type": "string",
      "label": "Category",
      "required": true,
      "maxLength": 20,
      "area": "sidebar",
      "options": [
        { "value": "poezie", "label": "Poezie" },
        { "value": "txt", "label": "Txt" },
        { "value": "img", "label": "Img" },
        { "value": "radio", "label": "Radio" },
        { "value": "news", "label": "News" }
      ]
    },
    {
      "name": "content",
      "type": "text",
      "label": "Content",
      "area": "main",
      "component": "CroutonEditorSimple",
      "description": "Article body (markdown/rich text)"
    },
    {
      "name": "embed",
      "type": "text",
      "label": "Embed Code",
      "area": "main",
      "description": "HTML embed (YouTube, SoundCloud, Bandcamp iframes)"
    },
    {
      "name": "imageUrl",
      "type": "string",
      "label": "Image URL",
      "maxLength": 500,
      "area": "sidebar",
      "description": "External image URL or R2 pathname"
    },
    {
      "name": "featured",
      "type": "boolean",
      "label": "Featured",
      "default": false,
      "area": "sidebar"
    },
    {
      "name": "draft",
      "type": "boolean",
      "label": "Draft",
      "default": false,
      "area": "sidebar"
    }
  ]
}
```

**Note on tags**: The current site has 9 static tags (audio, boek, illustration, etc.) used sparingly. Rather than a separate collection + join table, store as a JSON array field or comma-separated string. If tag management becomes important later, extract to a collection then.

Add to articles schema:
```json
{
  "name": "tags",
  "type": "json",
  "label": "Tags",
  "area": "sidebar",
  "description": "Tag names as JSON array"
}
```

### 2.2 Schema: agenda.json

```json
{
  "name": "agenda",
  "label": "Agenda",
  "icon": "i-lucide-calendar",
  "description": "Events and performances",
  "fields": [
    {
      "name": "title",
      "type": "string",
      "label": "Title",
      "required": true,
      "maxLength": 300,
      "area": "main"
    },
    {
      "name": "date",
      "type": "date",
      "label": "Date",
      "required": true,
      "area": "sidebar"
    },
    {
      "name": "content",
      "type": "text",
      "label": "Details",
      "area": "main",
      "component": "CroutonEditorSimple",
      "description": "Location, description, links"
    },
    {
      "name": "thumbnail",
      "type": "string",
      "label": "Thumbnail URL",
      "maxLength": 500,
      "area": "sidebar"
    },
    {
      "name": "draft",
      "type": "boolean",
      "label": "Draft",
      "default": false,
      "area": "sidebar"
    }
  ]
}
```

### 2.3 Schema: pages.json

Copy from velo verbatim (`apps/velo/schemas/pages.json`).

### 2.4 Generate

```bash
cd apps/alexdeforce
pnpm crouton generate          # Generates all collections
pnpm run db:generate           # Drizzle migrations
pnpm run db:migrate            # Apply locally
```

---

## Phase 3: Custom Site Layer

The alexdeforce design is unique: horizontal top nav, vertically rotated sidebar, minimal typography, custom fonts. This lives in `layers/site/`.

### 3.1 Structure

```
layers/site/
├── nuxt.config.ts
├── app/
│   ├── layouts/
│   │   └── public.vue            # Overrides crouton-pages public layout
│   ├── components/
│   │   ├── SiteNav.vue           # Horizontal top nav (NU / AGENDA / TOT NU TOE / ARCHIEF)
│   │   ├── SiteSidebar.vue       # Vertical rotated links (About / Mailinglist / Shop / Tot nu toe)
│   │   └── SiteArticle.vue       # Article display with embed support
│   └── pages/
│       ├── index.vue             # Homepage: featured articles
│       ├── archive/
│       │   ├── index.vue         # Archive landing
│       │   ├── poezie/
│       │   │   ├── index.vue     # Filtered list: category=poezie
│       │   │   └── [slug].vue    # Single article
│       │   ├── txt/              # Same pattern
│       │   ├── img/              # Same pattern
│       │   └── radio/            # Same pattern
│       └── agenda/
│           ├── index.vue         # Split: upcoming / past (using date comparison)
│           └── [slug].vue        # Single event
└── assets/
    ├── css/
    │   └── main.css              # Grid layout, rotated text, embed styles
    └── fonts/
        ├── FluxischElse-Bold.woff
        ├── FluxischElse-Light.woff
        ├── FluxischElse-Regular.woff
        └── stylesheet.css
```

### 3.2 Key: public.vue layout override

Replaces crouton-pages' floating pill nav with the alexdeforce grid layout:

```vue
<template>
  <div id="mainGrid" class="pt-2 md:px-5 md:pt-5 grid w-full font-body text-sm">
    <header class="flex sticky top-5 bg-white z-20 overflow-x-hidden">
      <SiteNav />
    </header>
    <aside class="w-full md:pt-0 left-0 bg-white z-10 mb-4">
      <SiteSidebar />
    </aside>
    <main class="px-2 md:px-0 mt-7 w-full">
      <slot />
    </main>
  </div>
</template>
```

CSS handles the desktop two-column grid (4.5em sidebar + 1fr main) and the `writing-mode: vertical-lr` rotation.

### 3.3 Archive pages

Each archive category page (`/archive/poezie/index.vue`, etc.) fetches articles filtered by category from the generated API:

```typescript
const { data } = await useFetch(`/api/teams/${teamId}/content-articles`, {
  query: { category: 'poezie', draft: false, sort: '-date' }
})
```

The agenda index splits events into upcoming/past using date comparison (same logic as current site with `@formkit/tempo`).

---

## Phase 4: Data Migration Script

### 4.1 Markdown to DB

Write a one-time Node script (`scripts/migrate-content.ts`) that:

1. **Reads** all markdown files from `alexdeforce_v2/content/articles/` and `content/agenda/`
2. **Parses** YAML frontmatter + markdown body
3. **Converts** markdown body to HTML (using `marked` or similar)
4. **Inserts** into D1 via the generated API endpoints (or direct DB insert)

```
For each article:
  - title → title
  - date → date
  - category → category
  - tags → tags (JSON array)
  - draft → draft
  - featured → featured
  - image (array) → imageUrl (first item)
  - embed → embed
  - markdown body → content (converted to HTML)
```

### 4.2 Image Migration (Bunny CDN to R2)

Write a script (`scripts/migrate-images.ts`) that:

1. **Collects** all unique `alexdeforce.b-cdn.net` URLs from article frontmatter and bodies
2. **Downloads** each image
3. **Uploads** to R2 via `POST /api/upload-image`
4. **Creates** asset records via `POST /api/teams/{teamId}/crouton-assets`
5. **Updates** article `imageUrl` fields with new `/images/...` paths
6. **Also migrates** the 15 local files from `public/img/`

Skip Mixcloud/Bandcamp thumbnails (external platform images, not ours).

Estimated: ~200 images, ~500MB total. One-time script, run locally.

### 4.3 Pages Migration

The static pages (about, mailinglist, shop, totnutoe) become crouton pages:

| Current | Crouton Page | Type |
|---------|-------------|------|
| `/about` | About | `core:regular` (block content) |
| `/mailinglist` | Mailinglist | `core:regular` with `mailingBlock` |
| `/shop` | Shop | External redirect or `core:regular` with link |
| `/totnutoe` | Tot Nu Toe | `core:regular` (block content) |

Create these manually in the admin UI or via seed script.

---

## Phase 5: Cloudflare Setup

### 5.1 Create Resources

```bash
npx wrangler d1 create alexdeforce-db
npx wrangler r2 create alexdeforce-blob       # If not using NuxtHub managed
npx wrangler kv namespace create alexdeforce-kv
```

### 5.2 wrangler.jsonc

```jsonc
{
  "name": "alexdeforce",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "dist",
  "d1_databases": [{
    "binding": "DB",
    "database_name": "alexdeforce-db",
    "database_id": "<from-step-5.1>"
  }],
  "kv_namespaces": [{
    "binding": "KV",
    "id": "<from-step-5.1>"
  }],
  "r2_buckets": [{
    "binding": "BLOB",
    "bucket_name": "alexdeforce-blob"
  }]
}
```

### 5.3 Secrets

```bash
npx wrangler pages secret put BETTER_AUTH_SECRET
# Generate: openssl rand -base64 32
```

### 5.4 Deploy

```bash
pnpm run db:migrate:prod       # Push schema to D1
pnpm run cf:deploy             # Build + deploy to Cloudflare Pages
```

### 5.5 DNS

Point `alexdeforce.com` to the Cloudflare Pages project (CNAME or custom domain in CF dashboard).

---

## Phase 6: Redirects & Go-Live

### 6.1 Preserve existing URLs

The current site has these routes that need redirects or equivalents:

| Old URL | New URL | Method |
|---------|---------|--------|
| `/` | `/` or `/alexdeforce/` | Homepage (site layer) |
| `/agenda` | `/agenda` | Site layer page |
| `/totnutoe` | `/totnutoe` | Crouton page |
| `/archive/poezie` | `/archive/poezie` | Site layer page |
| `/archive/poezie/[slug]` | `/archive/poezie/[slug]` | Site layer page |
| `/about` | `/about` | Crouton page |
| `/mailinglist` | `/mailinglist` | Crouton page with mailingBlock |
| `/led002` | `/archive/poezie/tussenbruggen` | Redirect in routeRules |
| `/led001` | `/archive/poezie/hoek_van_de_laatste_zon` | Redirect in routeRules |
| `/admin` | `/admin/alexdeforce/...` | Crouton admin (replaces Netlify CMS) |

### 6.2 routeRules for legacy redirects

```typescript
routeRules: {
  '/led002': { redirect: '/archive/poezie/tussenbruggen' },
  '/led001': { redirect: '/archive/poezie/hoek_van_de_laatste_zon' },
  '/tussenbruggen': { redirect: '/archive/poezie/tussenbruggen' },
  '/spiritjuweel1': { redirect: '/archive/poezie/spiritjuweel-i-kwart-voor-straks' },
  '/archief': { redirect: '/archive' },
}
```

### 6.3 Go-live checklist

- [ ] All articles migrated and verified
- [ ] All images migrated to R2
- [ ] Pages created (about, mailinglist, shop, totnutoe)
- [ ] Custom layout renders correctly
- [ ] Archive category pages work
- [ ] Agenda split (upcoming/past) works
- [ ] Embeds render (YouTube, SoundCloud, Bandcamp)
- [ ] Custom fonts load
- [ ] Legacy redirects work
- [ ] DNS pointed to Cloudflare
- [ ] SSL certificate active
- [ ] Netlify CMS replaced by crouton admin

---

## Estimated Effort

| Phase | Work |
|-------|------|
| 1. Scaffold | Copy velo structure, adapt config |
| 2. Collections | Write 3 schemas, generate, migrate |
| 3. Site layer | Layout + nav + sidebar + archive pages (~10 components) |
| 4. Data migration | Script to parse ~400 markdown files + image download/upload |
| 5. Cloudflare | Resource creation, deploy |
| 6. Go-live | Redirects, DNS, verification |

**Dependencies**: Phase 1 → 2 → 3 (parallel with 4) → 5 → 6

---

## What Gets Better

- **Admin**: Full crouton admin instead of Netlify CMS (which is unmaintained)
- **Assets**: Centralized media library with picker, instead of manual Bunny CDN uploads
- **Pages**: Block editor instead of raw markdown
- **Hosting**: Cloudflare edge (faster, free tier covers this site)
- **No external deps**: No Netlify, no Bunny CDN, everything on Cloudflare

## What Stays the Same

- **Design**: Identical visual output via site layer
- **URLs**: Same route structure, redirects for legacy paths
- **Content**: All articles, events, pages migrated
- **Embeds**: YouTube/SoundCloud/Bandcamp iframes preserved in article content
