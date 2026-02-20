# Crouton Playground — Setup Errors & Fixes

Recorded during initial scaffold on 2026-02-20.

---

## 1. CLI: Missing i18n dependency for package collections (bookings/locations)

**Error (first `crouton config` run):**
```
❌ Missing Required Dependencies
  @fyit/crouton-i18n — Required addon for translation fields
```

**Cause:** `bookings/locations` has translatable fields. The CLI dependency checker looks for
`@fyit/crouton-i18n` explicitly, but it's already bundled inside `@fyit/crouton-core`.

**Fix:** Re-run with `--force` flag:
```bash
pnpm crouton config ./crouton.config.js --force
```

**Status:** Known false-positive. CLI should detect that `@fyit/crouton-core` bundles i18n.

---

## 2. CLI: Cross-layer relative import paths (articles → categories, tasks → contacts)

**Error (typecheck):**
```
layers/content/collections/articles/server/database/queries.ts(6,35):
  Cannot find module '../../../categories/server/database/schema'

layers/projects/collections/tasks/server/database/queries.ts(6,35):
  Cannot find module '../../../contacts/server/database/schema'
```

**Cause:** When a collection references another collection via `refTarget` in a **different layer**,
the CLI generates a same-layer relative path:

```
../../../{collection}/server/database/schema
```

This only works for same-layer references. Cross-layer references need an extra `../../{layer}/collections/` prefix.

**Fix (manual):** Update the import paths to traverse into the correct layer:

| File | Wrong | Fixed |
|------|-------|-------|
| `layers/content/collections/articles/server/database/queries.ts` | `../../../categories/server/database/schema` | `../../../../../shop/collections/categories/server/database/schema` |
| `layers/projects/collections/tasks/server/database/queries.ts` | `../../../contacts/server/database/schema` | `../../../../../people/collections/contacts/server/database/schema` |

**Rule of thumb:**
- Same layer: `../../../{collection}/server/database/schema` ✅
- Cross layer: `../../../../{target-layer}/collections/{collection}/server/database/schema` ✅

**Status:** Bug in `@fyit/crouton-cli`. The generator doesn't cross-check which layer the
`refTarget` collection belongs to when building relative import paths. Same-layer references work
correctly; only cross-layer references are broken.

---

## 3. Pre-existing: Nuxt auto-import resolution during typecheck

**Error (typecheck — all generated collections):**
```
_Form.vue: Cannot find name 'ref'
_Form.vue: Cannot find name 'useCollectionMutation'
_Form.vue: Cannot find name 'useCrouton'
List.vue: Cannot find name 'useCollectionQuery'
*.ts: Cannot find name 'defineEventHandler'
*.ts: Cannot find name 'getRouterParams'
*.ts: Cannot find name 'createError'
*.ts: Cannot find name 'readBody'
app.config.ts: Cannot find name 'defineAppConfig'
```

**Cause:** These are Nuxt auto-imports (Vue refs, Nitro server utils, etc.) that TypeScript
can't resolve when running `npx nuxt typecheck` in a monorepo context. The same errors appear in
`apps/crouton-test`. At runtime these work correctly via Nuxt's import magic.

**Status:** Pre-existing monorepo-level issue. Not introduced by the playground.
Tracked in: https://github.com/nuxt/nuxt/issues (Nuxt monorepo typecheck).

---

## 4. Pre-existing: `~~/server/db/schema` module resolution

**Error (typecheck):**
```
queries.ts: Cannot find module '~~/server/db/schema' or its corresponding type declarations.
```

**Cause:** `~~` is Nuxt's srcDir alias. TypeScript can't resolve it during static analysis
even though `server/db/schema.ts` exists. Same issue as #3.

**Status:** Pre-existing. Works at runtime.

---

## 5. Pre-existing: Seed file type errors (drizzle-seed + LibSQL)

**Error (typecheck):**
```
seed.ts: Argument of type 'LibSQLDatabase<...>' is not assignable to parameter of type
  'PgDatabase<...> | MySqlDatabase<...> | BaseSQLiteDatabase<...>'
seed.ts: Type 'boolean' is not assignable to type 'AbstractGenerator<any>'
seed.ts: Cannot find name 'Bun'
```

**Cause:**
- `LibSQLDatabase` from `@libsql/client` has a private `resultKind` property that doesn't match
  the drizzle-seed type signature for `BaseSQLiteDatabase`.
- The generated seed file uses `Bun.env` / `import.meta.path` which aren't typed in plain Node/TS.
- `boolean` values passed to drizzle-seed generators where `AbstractGenerator<T>` is expected.

**Status:** Pre-existing issues in the CLI seed generator. Seeds run correctly at runtime via `npx tsx`.
See: `zod-compat.md` for related type-compatibility patterns in this monorepo.

---

## Summary

| # | Error | Source | Fixed? |
|---|-------|--------|--------|
| 1 | CLI i18n dep check false-positive | CLI bug | Workaround: `--force` |
| 2 | Cross-layer refTarget import paths | CLI bug | ✅ Manual fix |
| 3 | Auto-import resolution (ref, defineEventHandler…) | Pre-existing | N/A |
| 4 | `~~/server/db/schema` alias resolution | Pre-existing | N/A |
| 5 | Seed file LibSQLDatabase + Bun types | Pre-existing | N/A |
