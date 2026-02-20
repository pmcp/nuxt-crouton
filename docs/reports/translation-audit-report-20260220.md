# Translation Audit Report
**Date**: 2026-02-20
**Scope**: All packages in nuxt-crouton monorepo
**Locales**: English (en), Dutch (nl), French (fr)
**Method**: Parallel subagent analysis — key completeness + component scan + hardcoded text detection

---

## TL;DR

| Category | Count |
|----------|-------|
| Packages audited | 12 |
| Locale files perfectly in sync | 7 of 9 with locale files |
| Packages missing nl/fr entirely | 1 (crouton-designer) |
| Packages with no locale files | 4 (crouton-core, crouton-editor, crouton-flow, crouton-collab) |
| Total hardcoded strings found | ~100 |
| Component keys missing from locale files | ~26 |
| Dead/unused locale keys | ~96 |

---

## Per-Package Results

### ✅ crouton-i18n (base locales)
**Locale sync**: 402 keys — en/nl/fr perfectly in sync
**Component keys not in locale** (11 missing):
- `common.fallbackToEN`, `common.noTranslation`, `common.copy`, `common.content`, `common.characters`, `common.words`
- `messages.usingEnglishFallback`, `messages.noTranslationAvailable`, `messages.copiedToClipboard`
- `errors.noTextToCopy`, `errors.failedToCopyText`

**Hardcoded strings** (20+):
- `Input.vue`: "Replace existing translation?", "Cancel", "Replace" (AI translate confirmation dialog)
- `UiList.vue`: "UI Translations", "Search translations...", "All categories", "Failed to load translations", "No translations found", "Key Path", "System Values", "Team Override Values", "Cancel", "Edit/Create Override"
- `UiForm.vue`: "Remove Translation Override?", "This will permanently delete...", "Cancel", "Remove Override"

---

### ✅ crouton-admin
**Locale sync**: 94 keys — en/nl/fr perfectly in sync
**Component keys not in locale** (15+ missing from team admin pages):
- `teams.members`, `teams.settings`, `teams.invitations`, `teams.manageMembersDescription`
- `teams.manageInvitationsDescription`, `teams.teamSettings`, `teams.teamSettingsDescription`
- `teams.teamAdmin`, `teams.teamAdminDescription`, `teams.lookAndFeel`, `teams.adminAccessRequired`
- `navigation.team`, `common.accessRestricted`, `common.saved`, `common.saveChanges`

**Hardcoded strings** (8):
- `ImpersonationBanner.vue`: "Viewing as", "Stop Impersonating", "Failed to stop impersonation"
- `super-admin/index.vue`: "Super Admin Dashboard", "Manage users, teams, and monitor system activity"

---

### ⚠️ crouton-assets
**Locale sync**: 3 keys — en/nl/fr in sync (but coverage is minimal)
**Component t() usage**: None — no `t()` calls anywhere in components
**Hardcoded strings** (12+) all in `Uploader.vue`:
- "Crop Image", "Skip crop", "Alt Text", "Describe the image for accessibility"
- "Generate alt text with AI", "Filename:", "Size:", "Type:"
- "Upload Asset", "Uploading..."

**Dead locale key**: `assets.admin.media` — defined but never referenced in any component

---

### ✅ crouton-bookings
**Locale sync**: 79 keys — en/nl/fr perfectly in sync
**Hardcoded strings** (4):
- `PanelFilters.vue:156` — "No locations yet"
- `Calendar.vue:500, 614` — "Units" (appears twice)
- `BookingCard.vue:328` — "Activity"

**Dead locale keys** (71 unused): `bookings.availability.*`, `bookings.cart.*`, `bookings.email.*`, `bookings.wizard.*`, `bookings.list.*`, `bookings.myBookings.*` — entire feature branches unused

---

### ✅ crouton-pages
**Locale sync**: 50 keys — en/nl/fr perfectly in sync
**Component keys not in locale** (5 cross-package references in Nav.vue — these should be defined in core/auth):
- `admin.dashboard`, `teams.members`, `teams.teamSettings`, `navigation.translations`, `auth.signIn`

**Hardcoded strings** (22):
- `Workspace/EmptyState.vue`: "Keyboard shortcuts", "New page", "Search"
- `Workspace/Editor.vue`: "Page Settings" (×2), "Generate", "Preview" (×3), "Search", "Social" (×2)
- `AiPageGenerator.vue`: "Your brief", "Examples"
- `Nav.vue`: "Menu"
- `CollectionPageRenderer.vue` / `CollectionBinderRenderer.vue`: "Item Unavailable" (×2)
- `Blocks/Properties/CardsEditor.vue`: "Highlight"

**Dead locale keys** (25): `common.back`, `common.cancel`, `common.continue`, `common.delete`, `common.save`, `pages.admin.*` branch (legacy)

---

### 🔴 crouton-sales
**Locale sync**: 68 keys — en/nl/fr perfectly in sync
**CRITICAL**: Zero `t()` calls anywhere — locale files exist but are **completely unused**
**Hardcoded strings** (40+):
- `Cart.vue`: "Cart is empty", "Please select a client to proceed", "Clear", "Pay"
- `ProductList.vue`: "No products found", "Add to Cart"
- `OrderInterface.vue`: "Cart is empty", "Order created", "The order has been submitted successfully.", "Error", "Failed to create order"
- `Admin/PosSidebar.vue`: "Events", "Products", "Categories", "Locations", "Printers", "Helpers", "Clients"
- `CategoryTabs.vue`: "All"
- `CartTotal.vue`: "Total"
- `OfflineBanner.vue`: "You are offline. Orders cannot be submitted."
- `Pos/OrdersList.vue`: "Orders", "Auto-refresh", "All", "Pending", "Processing", "Completed", "Cancelled", "Order #", "Client", "Status", "Created", "Re-print", "Print triggered", "Print failed", "Could not trigger print...", "No orders found"
- `Client/Selector.vue`: "Client", "Select or create client...", "Enter client name..."

---

### ✅ crouton-triage
**Locale sync**: 8 keys — en/nl/fr perfectly in sync
**Component usage**: All `t()` calls verified against locale — 100% coverage
**Hardcoded strings**: None
**Status**: **Best practice example** — follow this pattern

---

### ⚠️ crouton-designer
**Locale sync**: en.json complete (154 keys used, all defined)
**nl.json**: ❌ Missing
**fr.json**: ❌ Missing
**Hardcoded strings**: None — exemplary i18n usage in components
**Action needed**: Create nl.json and fr.json translations

---

### 🔴 crouton-core
**Locale files**: None
**Vue files**: 82 total, 53 use `t()` / `useT()`
**Hardcoded strings** (6+):
- `Form.vue`: "Collapse to sidebar", "Expand to fullscreen", "Close"
- `FormRepeater.vue`: "Drag to reorder" (aria-label), "Remove item" (aria-label)
- `FormColorPicker.vue`: "#000000" (placeholder — arguable)

**Status**: Uses translations across 64% of files but has no locale infrastructure

---

### crouton-editor
**Locale files**: None
**Vue files**: 5, all use `useT()`
**Hardcoded strings**: None (graceful fallbacks via `tString(...) || 'fallback'` pattern)
**Status**: Low risk — needs locale file for completeness

---

### crouton-flow
**Locale files**: None
**Vue files**: 5, 3 use `t()`
**Hardcoded strings**: None (data-driven rendering)
**Status**: Low risk

---

### crouton-collab
**Locale files**: None
**Vue files**: 5, 3 use `t()`
**Hardcoded strings**: None (infrastructure components)
**Status**: Low risk

---

### ✅ crouton-auth
**Locale files**: en/nl/fr — complete
**Vue files**: 39, 34 use translations
**Hardcoded strings**: None
**Status**: Fully internationalized — no action needed

---

## Priority Action Plan

### P0 — Critical (breaks i18n for users)

| Task | Package | Details |
|------|---------|---------|
| Wire up `t()` throughout all components | crouton-sales | 40+ strings, locale files already exist |
| Add missing component keys to en.json + nl/fr | crouton-admin | 15 missing `teams.*` keys used in pages |
| Add missing component keys to en.json + nl/fr | crouton-i18n | 11 missing keys in Display.vue |

### P1 — High (significant user-facing gaps)

| Task | Package | Details |
|------|---------|---------|
| Create i18n infrastructure + en.json | crouton-core | 82 components, 53 already use `t()` — needs locale file |
| Wrap 22 hardcoded strings with `t()` | crouton-pages | Editor, EmptyState, Nav, AiPageGenerator |
| Wrap 12 hardcoded strings with `t()` | crouton-assets | Entire Uploader.vue |
| Wrap 20 hardcoded strings with `t()` | crouton-i18n | UiList.vue, UiForm.vue, Input.vue |
| Create nl.json + fr.json | crouton-designer | 154 keys to translate |

### P2 — Medium (cleanup)

| Task | Package | Details |
|------|---------|---------|
| Add missing team admin keys | crouton-admin | 8 hardcoded strings in Banner + super-admin |
| Wrap 4 hardcoded strings | crouton-bookings | PanelFilters, Calendar, BookingCard |
| Audit 71 dead locale keys | crouton-bookings | Remove or document unused feature branches |
| Audit 25 dead locale keys | crouton-pages | Remove legacy `pages.admin.*` branch |
| Add `assets.admin.media` usage or remove | crouton-assets | Dead key |

### P3 — Low (infrastructure completeness)

| Task | Package | Details |
|------|---------|---------|
| Create minimal en.json | crouton-editor | Consistency, future expansion |
| Create minimal en.json | crouton-flow | Consistency |
| Create minimal en.json | crouton-collab | Consistency |

---

## Key Patterns Observed

**Best in class**: `crouton-triage` — all keys defined, all used, no hardcoding
**Best component i18n**: `crouton-designer` — zero hardcoded strings, just needs nl/fr files
**Worst case**: `crouton-sales` — locale files built but never connected to components
**Systemic gap**: Several packages use `t()` calls without having locale files registered in their `nuxt.config.ts`

## Recommended Next Steps

1. Fix crouton-sales first (high ROI — locale files done, just needs `useT()` wired up)
2. Add crouton-core locale infrastructure (affects all admin panels)
3. Create crouton-designer nl/fr (154 keys, no hardcoding — clean translation job)
4. Systematically work through P1 hardcoded string lists per package
