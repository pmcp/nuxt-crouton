# Package Boundary Audit

Scan the entire monorepo for cross-package leaks: code that lives in the wrong package, duplicated logic, deep internal imports, or domain violations.

## What counts as a leak

1. **Deep imports across packages** — importing from `@fyit/crouton-auth/server/database/schema/auth` instead of using auto-imports or public re-exports. Internal paths are unstable and couple packages tightly.

2. **DB queries for another package's tables** — e.g., crouton-email directly querying `teamSettings` or `organization` tables that belong to crouton-auth. Should go through exported utilities or auto-imported functions.

3. **Duplicated utilities** — the same logic (team resolution, DB helpers, encryption) reimplemented in multiple packages instead of using the canonical source.

4. **Misplaced API endpoints** — endpoints living in a package that doesn't own that domain. E.g., team settings CRUD scattered across packages instead of consolidated.

5. **Misplaced components** — Vue components that belong to one domain living in another package (e.g., email-related components in crouton-core).

6. **Cross-package type coupling** — types defined in package A that directly reference internals of package B, rather than using shared interfaces.

7. **Server utils that bypass the layer system** — manually importing from node_modules paths instead of relying on Nitro auto-imports from loaded layers.

## How to audit

### Step 1: Map the package ownership

For each package, identify what it owns:
- **crouton-core**: CRUD composables, collection system, team context, image upload, redirects, encryption, stubs
- **crouton-auth**: user/session/team tables, auth flow, team resolution, scoped tokens, email logging
- **crouton-admin**: admin UI pages, super-admin API, impersonation, team admin pages
- **crouton-email**: email templates, senders, Resend integration, email brand config
- **crouton-i18n**: translations, `useT()`, locale management
- **crouton-editor**: TipTap editor, content blocks
- **crouton-bookings**: booking system, availability, email notifications
- **crouton-assets**: media library, asset picker
- **crouton-flow**: visual flow editor, node system
- **crouton-pages**: page builder, publishable content

### Step 2: Search for violations

Run these searches in parallel across all packages:

```
# Deep cross-package imports (biggest smell)
grep -r "from '@fyit/crouton-[^']*/" packages/ --include="*.ts" --include="*.vue" | grep -v node_modules | grep -v CLAUDE.md

# Direct table access across packages
grep -r "tables\.\(teamSettings\|organization\|member\|user\|session\|account\)" packages/ --include="*.ts" | grep -v "crouton-auth/"

# Duplicated team resolution logic
grep -rn "resolveTeam\|getTeamBy\|findTeam" packages/ --include="*.ts" | grep -v "crouton-auth/"

# Duplicated DB utilities
grep -rn "useDB\(\)" packages/ --include="*.ts" | sort by package

# Cross-package schema imports
grep -r "database/schema" packages/ --include="*.ts" | grep -v "within own package"
```

### Step 3: For each finding, classify

| Severity | Meaning |
|----------|---------|
| 🔴 **Hard leak** | Direct internal import, will break if source refactors |
| 🟡 **Soft leak** | Duplicated logic, should use canonical source |
| 🔵 **Boundary smell** | Code in wrong package, works but should move |

### Step 4: Report

```markdown
## Package Boundary Audit Report

### Summary
| Package | Hard Leaks | Soft Leaks | Boundary Smells |
|---------|-----------|------------|-----------------|
| crouton-core | X | Y | Z |
| crouton-email | ... | ... | ... |
| ... | | | |

### Findings

#### 🔴 Hard Leak: [title]
**File:** `packages/crouton-email/server/utils/foo.ts:42`
**Issue:** Imports directly from `@fyit/crouton-auth/server/database/schema/auth`
**Belongs in:** crouton-auth (as exported utility) or use auto-import
**Fix:** Create a public export in crouton-auth, or use the auto-imported `tables` object

---
[repeat for each finding]
```

### Step 5: Suggest fixes

Group fixes by priority:
1. Hard leaks that will break on refactor → fix now
2. Soft leaks causing maintenance burden → fix soon
3. Boundary smells → fix when touching that code

For each, suggest the minimal change: move code, add a re-export, or switch to auto-import.
