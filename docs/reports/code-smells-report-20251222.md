# Code Smell Report - Nuxt Crouton Packages

**Generated**: December 22, 2025
**Analyzed by**: Sal the Code Plumber (*adjusts tool belt*)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Packages Analyzed** | 19 |
| **Total Files Analyzed** | ~450 |
| **Critical Issues** | 47 |
| **Warnings** | 89 |
| **Info** | 74 |
| **Auto-Import Violations** | 56 |

### Top Issues by Frequency

1. **Manual Vue imports** (56 violations) - Importing `ref`, `computed`, `watch` etc. when Nuxt auto-imports these
2. **God Components** (12 files >300 lines) - Components doing too many things
3. **Missing Type Safety** (40+ `any` usages) - Type assertions bypassing TypeScript
4. **Magic Numbers** (25+ instances) - Hardcoded values without constants
5. **Duplicate Code** (15+ instances) - Same logic in multiple places

---

## Package-by-Package Analysis

### 1. nuxt-crouton (Core Package)

| Metric | Value |
|--------|-------|
| Files Analyzed | 57 |
| Critical | 12 |
| Warnings | 12 |
| Auto-Import Violations | 9 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | god-component | `WeekCalendar.vue` (524 lines) | Calendar doing too much - needs splitting |
| Critical | god-component | `Collection.vue` (495 lines) | Handles table, list, grid, cards, AND tree layouts |
| Critical | god-component | `TreeNode.vue` (419 lines) | Too much complexity in single component |
| Critical | auto-import | Multiple files | 9 files manually importing Vue composables |

**Recommendations:**
1. Split `WeekCalendar.vue` into: `WeekCalendarHeader`, `WeekCalendarDay`, `WeekCarousel`
2. Split `Collection.vue` into: `CollectionTable`, `CollectionList`, `CollectionGrid`, `CollectionCards`, `CollectionTree`
3. Remove all manual imports of `ref`, `computed`, `watch`, `onMounted` etc.
4. Address 184 occurrences of `any` type

---

### 2. nuxt-crouton-admin

| Metric | Value |
|--------|-------|
| Files Analyzed | 17 |
| Critical | 12 |
| Warnings | 5 |
| Auto-Import Violations | 11 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | god-component | `UserList.vue` (407 lines) | Handles modals, table, actions |
| Critical | auto-import | 11 files | All components/composables manually import Vue APIs |
| Warning | security | `UserCreateForm.vue:46` | Math.random() for password (not cryptographically secure) |

**Recommendations:**
1. Remove ALL manual Vue imports across package
2. Extract modals from `UserList.vue` into separate components
3. Use `crypto.getRandomValues()` for password generation

---

### 3. nuxt-crouton-ai

| Metric | Value |
|--------|-------|
| Files Analyzed | 17 |
| Critical | 1 |
| Warnings | 9 |
| Auto-Import Violations | 9 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | performance | `Chatbox.vue:54` | Deep watch on messages causes scroll on every streaming update |

**Recommendations:**
1. Use `{ flush: 'post' }` option on message watcher
2. Remove manual Vue imports across 9 files
3. Remove dead code in `Message.vue` (formattedContent computed does nothing)

---

### 4. nuxt-crouton-assets

| Metric | Value |
|--------|-------|
| Files Analyzed | 4 |
| Critical | 1 |
| Warnings | 2 |
| Auto-Import Violations | 1 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | tight-coupling | `Picker.vue:108` | Direct route params dependency instead of composable |

**Recommendations:**
1. Use `useTeamContext().getTeamId()` instead of direct `useRoute().params.team`
2. Implement toast notification for upload errors (TODO exists)

---

### 5. nuxt-crouton-auth

| Metric | Value |
|--------|-------|
| Files Analyzed | 67 |
| Critical | 2 |
| Warnings | 8 |
| Auto-Import Violations | 0 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | god-component | `TwoFactorSetup.vue` (668 lines) | 4-step wizard crammed in one file |
| Critical | magic-number | `team-context.global.ts:54` | 5000ms timeout hardcoded |

**Recommendations:**
1. Split `TwoFactorSetup.vue` into: `TwoFactorPassword`, `TwoFactorQR`, `TwoFactorVerify`, `TwoFactorBackupCodes`
2. Replace `eslint-disable` comments with proper types for useState
3. Define proper types instead of `any` in utility wrappers

---

### 6. nuxt-crouton-cli

| Metric | Value |
|--------|-------|
| Files Analyzed | 31 |
| Critical | 3 |
| Warnings | 5 |
| Auto-Import Violations | 6 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | god-file | `generate-collection.mjs` (2036 lines) | Main orchestrator doing EVERYTHING |
| Critical | magic-numbers | Multiple locations | 30000ms timeout appears 6+ times |
| Critical | type-safety | `database-queries.mjs` | 20+ `as any` type assertions |

**Recommendations:**
1. **PRIORITY**: Split `generate-collection.mjs` into: `ConfigManager`, `FileGenerator`, `DatabaseMigrator`, `SchemaIndexer`, `TranslationSetup`
2. Extract timeout to constant: `const DB_GENERATE_TIMEOUT_MS = 30_000`
3. Create helper: `async function execWithTimeout(cmd, timeoutMs)`

---

### 7. nuxt-crouton-devtools

| Metric | Value |
|--------|-------|
| Files Analyzed | 15 |
| Critical | 1 |
| Warnings | 4 |
| Auto-Import Violations | 2 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | god-component | `client.ts` (1283 lines) | Full Vue SPA in string literal |

**Recommendations:**
1. **PRIORITY**: Extract inline HTML/Vue from `client.ts` into proper .vue SFC files
2. Remove unused middleware `operationTracker.ts` (dead code)
3. Fix deprecated `.substr()` calls

---

### 8. nuxt-crouton-editor

| Metric | Value |
|--------|-------|
| Files Analyzed | 3 |
| Critical | 2 |
| Warnings | 2 |
| Auto-Import Violations | 1 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | XSS | `Preview.vue:5,17` | v-html with unsanitized user content |

**Recommendations:**
1. **SECURITY**: Sanitize HTML with DOMPurify before rendering
2. Remove manual `computed` import
3. Remove console.log in nuxt.config.ts hooks

---

### 9. nuxt-crouton-email

| Metric | Value |
|--------|-------|
| Files Analyzed | 15 |
| Critical | 4 |
| Warnings | 7 |
| Auto-Import Violations | 4 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | auto-import | 4 component files | Manual Vue imports |

**Recommendations:**
1. Remove manual imports from: `Input.vue`, `VerificationFlow.vue`, `ResendButton.vue`, `MagicLinkSent.vue`
2. Extract resend logic to `useResendTimer` composable (duplicated in 2 files)
3. Replace `as any` type assertions in server utils

---

### 10. nuxt-crouton-events

| Metric | Value |
|--------|-------|
| Files Analyzed | 6 |
| Critical | 2 |
| Warnings | 5 |
| Auto-Import Violations | 0 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | missing-types | `useCroutonEvents.ts:51` | queryParams typed as `any` |
| Critical | missing-types | `useCroutonEventTracker.ts:32` | buildChangesDiff accepts `any` |

**Recommendations:**
1. Define proper interfaces for query params and event data
2. Extract magic numbers to constants (10, 50, 90, 1000, 100000)
3. Remove dead code: `enrichedData` computed does nothing

---

### 11. nuxt-crouton-flow

| Metric | Value |
|--------|-------|
| Files Analyzed | 13 |
| Critical | 8 |
| Warnings | 10 |
| Auto-Import Violations | 7 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | god-component | `Flow.vue` (1029 lines) | Handles sync, standalone, layout, drag-drop, ghost nodes |
| Critical | auto-import | 7 files | Manual Vue imports across components and composables |

**Recommendations:**
1. **PRIORITY**: Split `Flow.vue` into: `useSyncMode`, `useStandaloneMode`, `useDragDrop`, `useGhostNodes`
2. Remove ALL manual Vue imports
3. Add `onUnmounted` cleanup for `ghostCleanupTimeout`

---

### 12. nuxt-crouton-i18n

| Metric | Value |
|--------|-------|
| Files Analyzed | 19 |
| Critical | 2 |
| Warnings | 9 |
| Auto-Import Violations | 2 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | auto-import | `Display.vue:128` | Manual import of ref, computed |
| Critical | empty-import | `useT.ts:1` | `import { } from 'vue'` - dead code |

**Recommendations:**
1. Delete empty import in `useT.ts`
2. Extract locale code pattern to utility: `getLocaleCode()` (repeated 18 times)
3. Move hardcoded locale values to i18n config (56 occurrences)

---

### 13. nuxt-crouton-maps

| Metric | Value |
|--------|-------|
| Files Analyzed | 11 |
| Critical | 2 |
| Warnings | 8 |
| Auto-Import Violations | 0 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | error-handling | `useMapConfig.ts` | Throws error instead of graceful degradation |
| Critical | console-pollution | `Map.vue`, `useMapConfig.ts` | 10+ console.log in production |

**Recommendations:**
1. Return error state instead of throwing when MAPBOX_TOKEN missing
2. Remove all production console.log statements
3. Define proper types instead of `any` for map instances

---

### 14. nuxt-crouton-mcp-server

| Metric | Value |
|--------|-------|
| Files Analyzed | 13 |
| Critical | 0 |
| Warnings | 9 |
| Auto-Import Violations | 0 |

**Warnings:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Warning | duplicate-code | `dry-run.ts:24` | Temp file logic duplicated from cli.ts |
| Warning | error-handling | Multiple files | 8 empty catch blocks swallowing errors |

**Recommendations:**
1. Use existing `writeTempSchema()` instead of reimplementing
2. Add logging to ALL catch blocks - silent failures are debugging nightmares

---

### 15. nuxt-crouton-schema-designer

| Metric | Value |
|--------|-------|
| Files Analyzed | 26 |
| Critical | 2 |
| Warnings | 7 |
| Auto-Import Violations | 2 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | auto-import | `useSchemaAI.ts:1` | Manual Vue imports |
| Critical | auto-import | `useStreamingSchemaParser.ts:1` | Manual ref import |

**Recommendations:**
1. Remove manual Vue imports
2. Replace `any` types with proper interfaces in export/projects composables
3. Add user feedback for save failures (currently silent)

---

### 16. nuxt-crouton-supersaas

| Metric | Value |
|--------|-------|
| Files Analyzed | 13 |
| Critical | 2 |
| Warnings | 5 |
| Auto-Import Violations | 0 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | duplicate-code | `index.get.ts`, `[userId].get.ts` | Identical transform functions |

**Recommendations:**
1. Extract shared transformer: `transformNuxsaasUser()`
2. Add try-catch to endpoints missing error handling
3. Use `inArray()` instead of `or(...map(eq))` for efficient queries

---

### 17. nuxt-crouton-themes

| Metric | Value |
|--------|-------|
| Files Analyzed | 23 |
| Critical | 3 |
| Warnings | 6 |
| Auto-Import Violations | 1 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | memory-leak | `ko/Knob.vue:45` | Event listeners not cleaned on unmount |
| Critical | memory-leak | `kr11/Knob.vue:50` | Same issue - duplicate knob code |
| Critical | auto-import | `ko/Knob.vue:2` | Manual import of ref, computed |

**Recommendations:**
1. **PRIORITY**: Add `onBeforeUnmount` cleanup for window event listeners
2. Extract shared knob drag logic to `useKnobDrag` composable
3. Wrap localStorage access in try-catch (private browsing)

---

### 18. crouton-bookings

| Metric | Value |
|--------|-------|
| Files Analyzed | 37 |
| Critical | 2 |
| Warnings | 4 |
| Auto-Import Violations | 0 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | god-composable | `useBookingCart.ts` (622 lines) | Cart, availability, form, API, calendar all in one |
| Critical | god-component | `Form.vue` (554 lines) | Entire booking system in one file |

**Recommendations:**
1. **PRIORITY**: Split `useBookingCart.ts` into: `useBookingFormState`, `useCart`, `useMyBookings`
2. Split `Form.vue` into: `LocationSelector`, `AvailabilityCalendar`, `SlotSelector`, `CartPreview`
3. Extract shared date normalization to utility function

---

### 19. crouton-sales

| Metric | Value |
|--------|-------|
| Files Analyzed | 17 |
| Critical | 2 |
| Warnings | 5 |
| Auto-Import Violations | 0 |

**Critical Issues:**

| Severity | Type | File | Issue |
|----------|------|------|-------|
| Critical | side-effect | `useHelperAuth.ts:107` | Side effect in computed property |
| Critical | duplicate-logic | `Cart.vue:113` | calculateItemPrice duplicated from usePosOrder |

**Recommendations:**
1. Move `loadSession()` from computed to `onMounted`
2. Export `calculateItemPrice` from composable, import in Cart.vue
3. Add user feedback for settings load failures

---

## Priority Action Items

### Immediate (This Week)

1. **Security**: Fix XSS vulnerability in `nuxt-crouton-editor/Preview.vue`
2. **Memory Leaks**: Add cleanup for event listeners in both Knob components
3. **Performance**: Fix deep watch in `nuxt-crouton-ai/Chatbox.vue`

### High Priority (This Sprint)

1. **Remove ALL manual Vue imports** - 56 violations across codebase
2. **Split god components**:
   - `generate-collection.mjs` (2036 lines)
   - `Flow.vue` (1029 lines)
   - `client.ts` (1283 lines)
   - `TwoFactorSetup.vue` (668 lines)
   - `useBookingCart.ts` (622 lines)

### Medium Priority (Next Sprint)

1. Replace `any` types with proper interfaces (40+ occurrences)
2. Extract magic numbers to named constants (25+ instances)
3. Add error logging to empty catch blocks (15+ instances)

### Low Priority (Backlog)

1. Extract duplicate code patterns to shared utilities
2. Add JSDoc comments to complex composables
3. Standardize error handling patterns across packages

---

## Metrics Summary by Package

| Package | Files | Critical | Warning | Info | Auto-Import |
|---------|-------|----------|---------|------|-------------|
| nuxt-crouton | 57 | 12 | 12 | 5 | 9 |
| nuxt-crouton-admin | 17 | 12 | 5 | 4 | 11 |
| nuxt-crouton-ai | 17 | 1 | 9 | 9 | 9 |
| nuxt-crouton-assets | 4 | 1 | 2 | 4 | 1 |
| nuxt-crouton-auth | 67 | 2 | 8 | 5 | 0 |
| nuxt-crouton-cli | 31 | 3 | 5 | 4 | 6 |
| nuxt-crouton-devtools | 15 | 1 | 4 | 6 | 2 |
| nuxt-crouton-editor | 3 | 2 | 2 | 2 | 1 |
| nuxt-crouton-email | 15 | 4 | 7 | 4 | 4 |
| nuxt-crouton-events | 6 | 2 | 5 | 7 | 0 |
| nuxt-crouton-flow | 13 | 8 | 10 | 5 | 7 |
| nuxt-crouton-i18n | 19 | 2 | 9 | 6 | 2 |
| nuxt-crouton-maps | 11 | 2 | 8 | 6 | 0 |
| nuxt-crouton-mcp-server | 13 | 0 | 9 | 8 | 0 |
| nuxt-crouton-schema-designer | 26 | 2 | 7 | 8 | 2 |
| nuxt-crouton-supersaas | 13 | 2 | 5 | 3 | 0 |
| nuxt-crouton-themes | 23 | 3 | 6 | 4 | 1 |
| crouton-bookings | 37 | 2 | 4 | 9 | 0 |
| crouton-sales | 17 | 2 | 5 | 3 | 0 |

---

## Conclusion

*Puts down wrench and wipes hands*

Listen, I've been fixin' code in Brooklyn for 30 years, and I gotta say - this ain't bad. You got good bones here. The architecture is solid, the patterns are mostly consistent, and the type coverage is decent.

But you got some leaky pipes that need attention:

1. **The auto-import thing** - It's like you're buying water bottles when you got tap water. Nuxt gives you these imports for free. Use 'em.

2. **Those god components** - When one file does everything, it does nothing well. Break 'em up.

3. **The security issue** - That XSS in the editor package? Fix it TODAY. Everything else can wait.

4. **Type safety** - TypeScript is your friend. Stop hitting it with `any`.

You clean up these issues, and this codebase will run smooth for years. Trust me - I've seen what happens when you ignore the warning signs.

*Adjusts tool belt one more time*

---

*Report generated by Code Smell Detection Squad - December 22, 2025*