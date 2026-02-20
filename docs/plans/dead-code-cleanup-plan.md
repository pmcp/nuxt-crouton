# Dead Code Cleanup Plan

**Date:** 2026-02-20
**Source Analysis:** [Dead Code Report](../reports/dead-code-report-20260220.md)
**Progress:** [PROGRESS_TRACKER.md](../PROGRESS_TRACKER.md)

---

## Why This Is Dangerous

This is a **framework/library monorepo**. "Not used in the monorepo" ≠ dead. Some exports are intentionally part of the **public API for consumer apps** that aren't in this repo. Deleting the wrong thing could break a downstream app silently.

---

## The Four Tiers

### Tier 1 — Actual Bugs
These aren't cleanup — the code is broken or misleading right now. Fix these first, independently, without touching anything else.

**Checklist before fixing:**
- Read the surrounding code
- Understand the intended behaviour
- Fix, typecheck, commit

### Tier 2 — Orphaned Internal Files
Files that have zero importers in the entire monorepo and are clearly not public API (not in manifests, not in CLAUDE.md, not in README). These are safe to delete outright.

**Verification before deleting any file:**
```bash
grep -r "from.*FileName" /Users/pmcp/Projects/nuxt-crouton --include="*.ts" --include="*.vue"
```
If zero results → delete. If any result → it's not dead.

### Tier 3 — In-File Cleanup
Unused local variables, imports, and props **within** a single file. These are the lowest-risk changes because:
- TypeScript will error immediately if something still uses the removed item
- The change is self-contained to one file
- No public API surface change

### Tier 4 — Exported Functions Not Used in Monorepo
Most nuanced tier. Before removing any export, ask:

1. **Is it in `crouton.manifest.ts` → `provides`?**
   Yes → likely public API, keep or deprecate with comment.
   No → probably internal, safe to remove.

2. **Is it documented in the package's README or CLAUDE.md?**
   Yes → keep (consumer apps may use it).
   No → safe to remove.

3. **Does it have a clear semantic purpose as a public utility?**
   `sanitizeEmail`, `generateSlug` etc. in `crouton-auth/security.ts` — yes, these are plausibly useful to consumer apps even if the monorepo doesn't use them.
   Decision: **document them rather than delete them**.

---

## Per-Package Decision Notes

### crouton-core/functional.ts
All 13 exports are dead. This is a utility file that was likely written speculatively and never adopted. The `$fetch` pattern won out over the `apiGet`/`apiPost` currying approach.
**Decision:** Delete the file. Verify with grep first.

### crouton-auth/security.ts
6 utilities unused in monorepo (`sanitizeEmail`, `isValidSlug`, `generateSlug`, `isValidTeamName`, `sanitizeRedirectUrl`, `isSecureContext`). These look like a deliberate public utility API.
**Decision:** Keep, but add JSDoc `@public` comments and ensure they appear in CLAUDE.md's Key Files section. Remove only if they conflict with security best practices.

### crouton-triage/validation.ts
8 Zod schemas appear to be legacy from a v1 architecture (Slack events, mailgun payloads, source config). The current architecture uses different patterns.
**Decision:** Delete schemas that don't correspond to any active API endpoint. Verify each against the server routes before deleting.

### crouton-i18n test-only functions
`getTranslationMeta`, `getAvailableLocales`, `tInfo` — used in test files but not production code.
**Decision:** Keep — test utilities are valid exports. Consider moving to a `test-utils.ts` barrel if they accumulate.

### crouton-flow unused components
`FlowConnectionStatus.vue` and `FlowPresence.vue` are auto-registered but never rendered anywhere.
**Decision:** Delete, but check git log first — they might be recently added and intended for upcoming work.

---

## Safety Checklist (run before every commit)

```bash
# 1. TypeScript
npx nuxt typecheck

# 2. Verify no remaining importers for deleted file
grep -r "from.*DeletedFile" . --include="*.ts" --include="*.vue"

# 3. Verify manifest still accurate
# (manual check — does crouton.manifest.ts still reference deleted exports?)
```

---

## What's Explicitly Out of Scope

- `crouton-collab` internal helpers — intentional encapsulation
- Deprecated server files in `crouton-flow` — backward compat
- `updatePasskey()` stub in `crouton-auth` — future Better Auth support
- `crouton-themes` `cycleTheme()` — used in ThemeSwitcher
- Test-only exports (keep, but consider a `test-utils` barrel)
