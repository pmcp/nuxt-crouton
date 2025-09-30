# I18n Translations UI System - Missing Features Briefing

**Date:** 2025-09-30
**Project:** nuxt-crouton
**Package:** @friendlyinternet/nuxt-crouton-i18n
**Status:** Incomplete - Critical features missing

---

## Executive Summary

The `nuxt-crouton-i18n` package is missing the entire **UI translations management system** that was present in the prototype (`fyit-tools/layers/translations`). While the package has the frontend components and composables, it lacks:

1. **Database schema** for storing UI translations
2. **API endpoints** for managing translations
3. **Admin UI** for translation management
4. **The critical `with-system.get.ts` endpoint** that `useT` composable depends on

This is causing **404 errors** in applications using the package, as `useT.ts:37` tries to fetch from a non-existent endpoint.

---

## Current Issue

**Error:**
```
404 Page not found: /api/teams/[teamSlug]/translations-ui/with-system?locale=nl
```

**Root Cause:**
The `useT` composable (line 37 in `packages/nuxt-crouton-i18n/app/composables/useT.ts`) attempts to fetch team-specific UI translation overrides from an API endpoint that doesn't exist in the package.

**Impact:**
- Console errors on every page load
- Translation system partially non-functional
- Can't manage team-specific translation overrides
- Silently falls back to system translations only

---

## Architecture: Prototype vs Current

### Prototype (fyit-tools/layers/translations)

```
layers/translations/
├── collections/ui/                           # UI translations collection
│   ├── app/
│   │   ├── components/
│   │   │   ├── Form.vue                     # Translation editor form
│   │   │   ├── List.vue                     # Translations list
│   │   │   ├── TeamForm.vue                 # Team-specific form
│   │   │   └── TeamList.vue                 # Team-specific list
│   │   ├── composables/
│   │   │   ├── useTranslationsUi.ts         # UI translations composable
│   │   │   └── useTeamTranslations.ts       # Team translations composable
│   │   └── pages/
│   │       └── dashboard/
│   │           ├── [team]/translations.vue   # Team admin page
│   │           └── super-admin/translations.vue  # Super admin page
│   ├── server/
│   │   ├── api/
│   │   │   ├── teams/[id]/translations-ui/
│   │   │   │   ├── index.get.ts             # List translations
│   │   │   │   ├── index.post.ts            # Create override
│   │   │   │   ├── [translationId].patch.ts # Update translation
│   │   │   │   ├── [translationId].delete.ts # Delete translation
│   │   │   │   ├── with-system.get.ts       # ⭐ CRITICAL - merge team + system
│   │   │   │   ├── resolve.get.ts           # Resolve single key
│   │   │   │   ├── system.get.ts            # Get system translations
│   │   │   │   └── system-by-keypath.get.ts # Get by key path
│   │   │   └── super-admin/translations-ui/
│   │   │       ├── index.get.ts             # List all
│   │   │       ├── index.post.ts            # Create system translation
│   │   │       ├── [id].patch.ts            # Update system
│   │   │       ├── [id].delete.ts           # Delete system
│   │   │       ├── bulk-add.post.ts         # Bulk import
│   │   │       ├── import.post.ts           # Import JSON
│   │   │       ├── import-merge.post.ts     # Merge import
│   │   │       ├── sync.post.ts             # Sync translations
│   │   │       └── overrides/[keyPath].get.ts # Get overrides for key
│   │   └── database/
│   │       ├── schema.ts                    # translationsUi table schema
│   │       └── queries.ts                   # Database query functions
│   └── types.ts                             # TypeScript types
├── app/
│   ├── components/                          # Shared components
│   │   ├── TranslationsInput.vue            # ✅ Exists in package
│   │   ├── TranslationsDisplay.vue          # ✅ Exists in package
│   │   ├── LanguageSwitcher.vue             # ✅ Exists in package
│   │   └── ...
│   └── composables/
│       ├── useT.ts                          # ✅ Exists in package (but broken)
│       └── useEntityTranslations.ts         # ✅ Exists in package
├── server/
│   ├── api/teams/[id]/settings/
│   │   ├── translations.get.ts              # ✅ Exists in package
│   │   └── translations.patch.ts            # ✅ Exists in package
│   └── utils/
│       ├── translations.ts                  # ✅ Exists in package
│       └── serverTranslations.ts            # ✅ Exists in package
└── i18n/locales/                            # ✅ Exists in package
    ├── en.json
    ├── nl.json
    └── fr.json
```

### Current (nuxt-crouton-i18n)

```
packages/nuxt-crouton-i18n/
├── app/
│   ├── components/
│   │   ├── TranslationsInput.vue            # ✅
│   │   ├── TranslationsDisplay.vue          # ✅
│   │   ├── LanguageSwitcher.vue             # ✅
│   │   ├── LanguageSwitcherIsland.vue       # ✅
│   │   ├── DevModeToggle.vue                # ✅
│   │   ├── DevWrapper.vue                   # ✅
│   │   └── TranslationsInputWithEditor.vue  # ✅
│   └── composables/
│       ├── useT.ts                          # ✅ (but calls missing API)
│       └── useEntityTranslations.ts         # ✅
├── server/
│   ├── api/teams/[id]/settings/
│   │   ├── translations.get.ts              # ✅
│   │   └── translations.patch.ts            # ✅
│   └── utils/
│       ├── translations.ts                  # ✅
│       └── serverTranslations.ts            # ✅
├── locales/                                 # ✅
│   ├── en.json
│   ├── nl.json
│   └── fr.json
├── package.json
└── nuxt.config.ts

❌ MISSING: /server/api/teams/[id]/translations-ui/ (entire directory)
❌ MISSING: Database schema for translationsUi table
❌ MISSING: Database query functions
❌ MISSING: Admin UI pages
❌ MISSING: Forms and lists for managing translations
```

---

## What's Missing

### 1. Critical: `with-system.get.ts` Endpoint

**Location (needed):** `server/api/teams/[id]/translations-ui/with-system.get.ts`

**Purpose:** Returns merged view of system translations with team-specific overrides

**Signature:**
```typescript
// Input: Query params
{
  locale?: string  // e.g., 'en', 'nl', 'fr'
}

// Output: Array of translation objects
[
  {
    keyPath: string              // e.g., 'table.search'
    category: string             // e.g., 'table'
    namespace: string            // e.g., 'ui'
    systemValues: Record<string, string>  // { en: 'Search', nl: 'Zoek', fr: 'Rechercher' }
    systemId: string
    isOverrideable: boolean
    teamValues: Record<string, string> | null  // Team overrides if exist
    hasOverride: boolean
    overrideId: string | null
    overrideDescription: string | null
    overrideUpdatedAt: Date | null
  }
]
```

**Used by:** `useT.ts:37` - Loads all UI translations on mount

**Implementation:**
- Fetches all system translations where `isOverrideable = true`
- Fetches all team overrides for the given team
- Merges them together
- Filters by locale if provided
- Returns combined array

### 2. Database Schema

**Table:** `translationsUi`

**Columns (from prototype):**
```typescript
{
  id: string (uuid, primary key)
  teamId: string | null (uuid, nullable - null = system translation)
  userId: string (uuid, creator)
  namespace: string (default 'ui')
  keyPath: string (e.g., 'table.search', 'common.save')
  category: string (e.g., 'table', 'common')
  values: Record<string, string> (JSON - { en: '...', nl: '...', fr: '...' })
  description: string | null
  isOverrideable: boolean (default true)
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `idx_teamId` on `teamId`
- `idx_keyPath` on `keyPath`
- `idx_namespace` on `namespace`
- Unique constraint on `(teamId, keyPath, namespace)`

### 3. Database Query Functions

**Location (needed):** `server/database/queries.ts` or similar

**Key Functions (from prototype):**

```typescript
// Get system translations with team overrides (lines 574-644 in prototype)
export async function getSystemTranslationsWithTeamOverrides(
  teamId: string,
  locale?: string
): Promise<TranslationWithOverrides[]>

// Get team by slug
export async function getTeamBySlug(slug: string): Promise<Team>

// Resolve single translation with fallback
export async function resolveTranslation(
  teamId: string,
  keyPath: string,
  namespace?: string,
  locale?: string
): Promise<ResolvedTranslation>

// CRUD operations
export async function getAllTranslationsUi()
export async function createTranslationsUi(data: NewTranslationsUi)
export async function updateTranslationsUi(id: string, updates: Partial<TranslationsUi>)
export async function deleteTranslationsUi(id: string)

// Team-specific queries
export async function getTeamTranslations(teamId: string)
export async function getTeamAndSystemTranslations(teamId: string)

// System queries
export async function getSystemTranslations()
export async function getOverrideableSystemTranslations()
export async function getSystemTranslationByKeyPath(keyPath: string, namespace?: string)

// Override management
export async function getTeamOverridesForTranslation(keyPath: string, namespace?: string)
export async function getAllSystemTranslationsWithOverrideCounts()

// Upsert
export async function upsertTranslation(
  keyPath: string,
  values: Record<string, string>,
  options: UpsertOptions
)
```

### 4. Additional API Endpoints

All endpoints under `/server/api/teams/[id]/translations-ui/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `index.get.ts` | GET | List all translations for team |
| `index.post.ts` | POST | Create team translation override |
| `[translationId].patch.ts` | PATCH | Update team translation |
| `[translationId].delete.ts` | DELETE | Delete team translation |
| `resolve.get.ts` | GET | Resolve single translation key |
| `system.get.ts` | GET | Get all system translations |
| `system-by-keypath.get.ts` | GET | Get system translation by key path |

### 5. Admin UI Components

**Pages needed:**
- Team admin page: `/dashboard/[team]/translations`
  - List team overrides
  - Edit/delete overrides
  - Browse available system translations

- Super admin page: `/dashboard/super-admin/translations`
  - Manage system translations
  - See all team overrides
  - Bulk import/export
  - Sync translations

**Components needed:**
- `Form.vue` - Edit translation values
- `List.vue` - List translations with filters
- `TeamForm.vue` - Team-specific override form
- `TeamList.vue` - Team-specific translations list

**Composables needed:**
- `useTranslationsUi.ts` - Manage UI translations
- `useTeamTranslations.ts` - Team-specific operations

---

## Implementation Plan

### Phase 1: Fix Critical 404 Error (Minimum Viable)

**Goal:** Stop console errors, make `useT` work

1. **Create database schema** for `translationsUi` table
   - Add to existing schema or create new schema file
   - Generate migration

2. **Add database queries**
   - Port `getSystemTranslationsWithTeamOverrides` from prototype
   - Port `getTeamBySlug` function
   - Add minimal CRUD operations

3. **Create `with-system.get.ts` endpoint**
   - Location: `server/api/teams/[id]/translations-ui/with-system.get.ts`
   - Implement auth check
   - Call `getSystemTranslationsWithTeamOverrides`
   - Return merged data

4. **Seed initial system translations**
   - Port basic UI translations from prototype's locale files
   - Import common keys: `table.*`, `common.*`, `form.*`
   - Make them `isOverrideable: true`

**Outcome:** `useT` works, no more 404 errors, translations load properly

### Phase 2: Add CRUD Operations (Full Functionality)

**Goal:** Allow teams to create/manage translation overrides

1. **Add remaining API endpoints**
   - `index.get.ts` - List team translations
   - `index.post.ts` - Create override
   - `[translationId].patch.ts` - Update override
   - `[translationId].delete.ts` - Delete override

2. **Add remaining query functions**
   - All CRUD operations
   - Team-specific queries
   - Override management

3. **Create basic composable**
   - `useTranslationsUi.ts` - Wrap API calls

**Outcome:** Programmatic management of translation overrides works

### Phase 3: Add Admin UI (Optional - For Full System)

**Goal:** GUI for managing translations

1. **Create team admin page**
   - Browse system translations
   - Create overrides
   - Edit existing overrides

2. **Create super admin page**
   - Manage system translations
   - View all team overrides
   - Bulk operations

3. **Create forms and lists**
   - Translation editor form
   - Translation browser/list

**Outcome:** Full GUI for translation management

---

## Decision Points

### 1. Where to Store the Database Schema?

**Option A:** Add to existing `nuxt-crouton` schema
- Pro: Centralized schema management
- Pro: Works with existing migrations
- Con: Couples i18n to main package

**Option B:** Create separate schema in `nuxt-crouton-i18n`
- Pro: Package independence
- Pro: Optional feature
- Con: Requires separate migration setup
- Con: May conflict with main schema

**Recommendation:** Option A - Add to main schema with optional flag

### 2. How to Handle Missing Database?

If `translationsUi` table doesn't exist, `useT` should:

**Option A:** Silently fail (current behavior)
- Pro: No errors
- Pro: Works without database
- Con: Silent failure is bad UX

**Option B:** Check for table existence, warn once
- Pro: Clear feedback
- Pro: Still works without database
- Con: Requires DB check on every mount

**Option C:** Make it required, throw error if missing
- Pro: Clear expectations
- Con: Breaking change
- Con: Can't use i18n without database

**Recommendation:** Option B - Warn once in dev, silent in prod

### 3. Backwards Compatibility

The current `useT` calls a non-existent endpoint and silently fails. Any fix will be:
- **Non-breaking** - The composable already handles errors gracefully
- **Additive** - We're adding missing functionality, not changing existing API
- **Opt-in** - Can work without the database (falls back to system only)

---

## Files to Create/Modify

### Create (New Files)

```
packages/nuxt-crouton-i18n/
├── server/
│   ├── api/teams/[id]/translations-ui/
│   │   └── with-system.get.ts                    # CRITICAL
│   └── database/
│       ├── schema.ts                             # translationsUi table
│       └── queries.ts                            # Query functions
```

### Modify (Existing Files)

```
packages/nuxt-crouton/
└── server/database/schema/
    └── index.ts                                  # Add translationsUi export
```

OR

```
packages/nuxt-crouton-i18n/
└── app/composables/
    └── useT.ts                                   # Better error handling (optional)
```

---

## Testing Strategy

### Unit Tests
- Database query functions
- Translation resolution logic
- Fallback chains

### Integration Tests
- API endpoint responses
- Auth checks
- Data merging

### E2E Tests
- Create translation override
- Override applies correctly
- Fallback to system works
- Locale switching works

---

## Migration from Prototype

### Direct Ports (Can copy as-is with minor adjustments)

1. `with-system.get.ts` - Auth changes only
2. Database schema - Direct port
3. Query functions - Direct port with DB adapter changes

### Requires Refactoring

1. Admin UI pages - Rewrite for Nuxt UI 4
2. Forms - Update component syntax
3. Super admin endpoints - May not need all of them

---

## Success Criteria

### Phase 1 Complete When:
- ✅ No 404 errors in console
- ✅ `useT` loads translations successfully
- ✅ Database schema exists and migrates cleanly
- ✅ Basic system translations seed correctly

### Phase 2 Complete When:
- ✅ Teams can create translation overrides via API
- ✅ Teams can update/delete overrides
- ✅ Overrides correctly override system translations
- ✅ Fallback chain works (team → system → key)

### Phase 3 Complete When:
- ✅ Admin can manage translations via GUI
- ✅ Team admins can create overrides via GUI
- ✅ Bulk import/export works
- ✅ All locale switching works

---

## Related Files

### Prototype Reference
- `/Users/pmcp/Projects/fyit-tools/layers/translations/`
- Key file: `collections/ui/server/database/queries.ts` (lines 574-644)
- Key file: `collections/ui/server/api/teams/[id]/translations-ui/with-system.get.ts`

### Current Package
- `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-i18n/`
- Issue: `app/composables/useT.ts` (line 37)

### Generator Fixed
- `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-collection-generator/lib/generate-collection.mjs` (line 395)
- Changed to use `'@friendlyinternet/nuxt-crouton-i18n'` instead of `'../../translations'`

---

## Next Steps

1. **Immediate:** Create Phase 1 implementation plan
2. **Review:** Decide on database schema location
3. **Port:** Copy `with-system.get.ts` and related queries from prototype
4. **Test:** Verify no more 404 errors
5. **Document:** Update package README with translation system docs

---

## Notes

- The error is **not fatal** - silently caught and logged as debug
- Current behavior is **graceful degradation** - falls back to i18n system translations
- This is **feature-incomplete**, not broken
- The generator fix (line 395) is **already applied** and working correctly
- Prototype has **working implementation** ready to port

---

**Status:** Ready for implementation
**Priority:** High (console errors affecting UX)
**Complexity:** Medium (mostly porting existing code)
**Est. Time:** 4-8 hours for Phase 1