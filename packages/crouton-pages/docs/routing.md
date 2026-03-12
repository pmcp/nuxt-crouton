# Crouton Pages — Routing Architecture

How public page URLs are resolved, from request to render.

## Route Table

Nuxt auto-generates these routes from the file system, plus one added by the `pages:extend` hook:

| Route Name | Pattern | Source | Purpose |
|---|---|---|---|
| `team-locale-slug` | `/:team/:locale/:slug(.*)*` | `[team]/[locale]/[...slug].vue` | Main page renderer |
| `team-slug` | `/:team/:slug(.*)*` | `[team]/[...slug].vue` | Locale-less redirect |
| `single-team-locale-slug` | `/:locale([a-z]{2,3})/:slug(.*)*` | Same file as `team-locale-slug` | Single-team mode (no team in URL) |

### How Vue Router picks a winner

Vue Router 4 scores routes by segment type:

| Segment Type | Score |
|---|---|
| Static (`/about`) | +40 |
| Param with regex (`/:locale([a-z]{2,3})`) | +30 |
| Plain param (`/:team`) | +20 |
| Wildcard (`/:slug(.*)*`) | -13 |

**For `/nl/aanbod`** (2 segments):
- `team-locale-slug` scores highest (3 params, more specific) — wins
- Params: `team=nl, locale=aanbod, slug=[]`
- Page detects locale-as-team and remaps (see [Param Remapping](#param-remapping))

**For `/nl/`** (1 segment):
- `team-locale-slug` can't match (needs 2+ segments before the catch-all)
- `single-team-locale-slug` (+30 for regex param) beats `team-slug` (+20 for plain param)
- Params: `locale=nl, slug=[]`

**For `/acme/about`** (2 segments, multi-team):
- `team-locale-slug` wins (3 params)
- Params: `team=acme, locale=about, slug=[]`
- Validate checks if `acme` is a real team

> **Key insight**: The `[a-z]{2,3}` regex on the single-team route is what makes it score higher than `team-slug`. Without it, both routes have identical scores and `team-slug` wins (registered first), causing a 404 because Nuxt treats `validate: false` as a 404 — it does NOT fall through to the next matching route.

## Request Lifecycle

```
Browser: GET /nl/aanbod
         │
         ▼
┌─────────────────────────────────┐
│  Nitro Plugins (server only)    │
│                                 │
│  1. domain-resolver.ts          │
│     Custom domain? Rewrite URL  │
│     booking.acme.com/about      │
│     → /acme/about               │
│                                 │
│  2. single-team-rewrite.ts      │
│     Set context flags:          │
│     event.context.isSingleTeam  │
│     event.context.singleTeamSlug│
│     Root / → redirect /nl/      │
│     NO URL rewriting            │
│                                 │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  Vue Router (SSR + client)      │
│                                 │
│  Matches route by score:        │
│  /nl/aanbod → team-locale-slug  │
│  /nl/       → single-team-*     │
│                                 │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  Page Validate                  │
│                                 │
│  - Reserved prefix? → false     │
│  - Single-team locale route?    │
│    Accept if config has slug    │
│  - Locale-as-team remap?        │
│    Accept if looks like locale  │
│  - Otherwise: API check team    │
│                                 │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  Page Setup (param resolution)  │
│                                 │
│  isSingleTeamMode? →            │
│    team = config slug           │
│    locale = first real param    │
│    slug = remaining params      │
│                                 │
│  Normal mode? →                 │
│    team = route.params.team     │
│    locale = route.params.locale │
│    slug = route.params.slug     │
│                                 │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  Fetch + Render                 │
│                                 │
│  GET /api/teams/{team}/pages/   │
│      {slug}?locale={locale}     │
│                                 │
│  → CroutonPagesRenderer        │
└─────────────────────────────────┘
```

## Three Modes

### 1. Multi-Team Mode (default)

URLs include the team slug: `/acme/en/about`

No special config needed. The `team-locale-slug` route handles everything.

```
/acme/about     → [team]/[...slug].vue → redirect to /acme/en/about
/acme/en/about  → [team]/[locale]/[...slug].vue → render page
```

### 2. Single-Team Mode

URLs omit the team slug: `/nl/about`

```typescript
// nuxt.config.ts
runtimeConfig: {
  public: {
    croutonPages: {
      singleTeam: {
        slug: 'myteam',      // team slug (empty = disabled)
        defaultLocale: 'nl'   // locale for root redirect
      }
    }
  }
}
```

```
/           → Nitro plugin redirects to /nl/ (302)
/nl/        → single-team-locale-slug route → render homepage
/nl/about   → team-locale-slug route (team=nl) → param remap → render page
```

### 3. Custom Domain Mode

A verified custom domain resolves to a team. URLs omit the team slug.

```
booking.acme.com/about → domain-resolver rewrites to /acme/about
                       → [team]/[...slug].vue → redirect to /acme/en/about
                       → render page (hideTeamInUrl hides team in nav links)
```

## Param Remapping

When Vue Router matches `/nl/aanbod` via the 3-param `team-locale-slug` route, the params are wrong:

| Param | Value | Actual meaning |
|---|---|---|
| `team` | `nl` | This is the locale |
| `locale` | `aanbod` | This is the slug |
| `slug` | `[]` | Empty |

The page component detects this (`isSingleTeamMode`) and remaps:

| Resolved | Source |
|---|---|
| `team` | `singleTeam.slug` from config |
| `locale` | `route.params.team` (`nl`) |
| `slug` | `route.params.locale` + `route.params.slug` joined (`aanbod`) |

When matched via `single-team-locale-slug` (for `/nl/`), there's no `:team` param at all:

| Resolved | Source |
|---|---|
| `team` | `singleTeam.slug` from config |
| `locale` | `route.params.locale` (`nl`) |
| `slug` | `route.params.slug` (empty) |

## Navigation Links

`useNavigation()` builds paths based on `useDomainContext().hideTeamInUrl`:

```
hideTeamInUrl = true  → /nl/about
hideTeamInUrl = false → /acme/nl/about
```

`hideTeamInUrl` is `true` when:
- Single-team mode is active (`isSingleTeam`), OR
- Request came from a custom domain (`isCustomDomain`)

## Nitro Plugins

### `single-team-rewrite.ts`

Sets context flags for downstream code. Does **NOT** rewrite URLs.

| Action | Details |
|---|---|
| Skip | API, auth, admin, `_nuxt`, static files |
| Set flags | `event.context.isSingleTeam = true`, `event.context.singleTeamSlug = slug` |
| Root redirect | `/` → `/{defaultLocale}/` (302) |

> **Why no URL rewrite?** Rewriting `/nl/` to `/sintlukas/nl/` server-side causes SSR/client hydration mismatch. The server would render with path `/sintlukas/nl/` but the browser URL is `/nl/`, so `route.path` disagrees between SSR and hydration.

### `domain-resolver.ts`

Rewrites custom domain requests by prepending the team slug.

| Action | Details |
|---|---|
| Skip | Localhost, IP, app domains, static files, paths with existing team segment |
| Lookup | Query `domain` table for verified domain |
| Check | `publicSiteEnabled` in team settings |
| Rewrite | `/about` → `/acme/about` |
| Set flags | `resolvedDomain`, `resolvedDomainTeamId`, `isCustomDomain` |

> Domain rewriting is safe because both server and client see the rewritten URL (the browser URL is the custom domain, and both sides resolve the same team).

## Validate Behavior

**`definePageMeta.validate` returning `false` = 404.** Nuxt does NOT fall through to the next matching route. This is why:

- `[team]/[...slug].vue` rejects locale-like team params in single-team mode (safety net — the higher-scoring single-team route should match first)
- The regex constraint on `single-team-locale-slug` is critical for correct route scoring

## Key Files

| File | Purpose |
|---|---|
| `app/pages/[team]/[locale]/[...slug].vue` | Main page renderer + param remapping |
| `app/pages/[team]/[...slug].vue` | Locale-less redirect route |
| `server/plugins/single-team-rewrite.ts` | Context flags + root redirect |
| `server/plugins/domain-resolver.ts` | Custom domain URL rewriting |
| `app/composables/useDomainContext.ts` | `hideTeamInUrl`, `isSingleTeam`, `isCustomDomain` |
| `app/composables/useNavigation.ts` | Navigation link building (respects hideTeamInUrl) |
| `nuxt.config.ts` | `pages:extend` hook, `singleTeam` config |

## Gotchas

1. **Never rewrite URLs in single-team mode** — causes hydration mismatch
2. **Route scoring matters** — a plain param (`/:team`) scores lower than a regex param (`/:locale([a-z]{2,3})`)
3. **Validate rejection = 404** — Nuxt does not try the next route
4. **`useI18n().locale` can be empty during hydration** — always use a fallback
5. **`useDomainContext()` must be called at top level** — it reads SSR event context that's only available during the initial request
6. **Team slugs of 2-3 lowercase letters** would collide with the single-team locale route in multi-team mode (rare edge case)
