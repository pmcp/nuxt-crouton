# Package Rename Progress Tracker

Tracking migration from `@friendlyinternet/*` to `@fyit/*`.

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total Phases | 7 (0-6) |
| Phases Complete | 0 / 7 |
| Packages to Rename | 20 |
| Current Phase | Not started |
| Blocker | Need to register @fyit npm org |

---

## Phase Status

| Phase | Status | Description | Committed |
|-------|--------|-------------|-----------|
| 0 | [ ] Pending | Pre-cleanup: Standardize package.json metadata | |
| 1 | [ ] Pending | Rename directories and package names | |
| 2 | [ ] Pending | Create unified @fyit/crouton module | |
| 3 | [ ] Pending | Update CLI module registry | |
| 4 | [ ] Pending | Update all internal references | |
| 5 | [ ] Pending | Build & Publish (manual) | |
| 6 | [ ] Pending | Deprecate old packages & update docs (manual) | |

---

## Phase 0: Pre-Cleanup

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Objective**: Standardize all package.json files before renaming.

### Checklist

- [ ] `nuxt-crouton` - standardize metadata
- [ ] `nuxt-crouton-cli` - standardize metadata
- [ ] `nuxt-crouton-auth` - standardize metadata
- [ ] `nuxt-crouton-admin` - standardize metadata
- [ ] `nuxt-crouton-i18n` - standardize metadata
- [ ] `nuxt-crouton-editor` - standardize metadata
- [ ] `nuxt-crouton-flow` - standardize metadata
- [ ] `nuxt-crouton-assets` - standardize metadata
- [ ] `nuxt-crouton-devtools` - standardize metadata
- [ ] `nuxt-crouton-maps` - standardize metadata
- [ ] `nuxt-crouton-ai` - standardize metadata
- [ ] `nuxt-crouton-email` - standardize metadata
- [ ] `nuxt-crouton-events` - standardize metadata
- [ ] `nuxt-crouton-collab` - standardize metadata
- [ ] `nuxt-crouton-pages` - standardize metadata
- [ ] `nuxt-crouton-schema-designer` - standardize metadata
- [ ] `nuxt-crouton-themes` - standardize metadata
- [ ] `nuxt-crouton-mcp-server` - standardize metadata
- [ ] `crouton-bookings` - standardize metadata
- [ ] `crouton-sales` - standardize metadata
- [ ] Run typecheck
- [ ] Commit: `chore(root): phase 0 - standardize package.json metadata`

**Commit SHA**:

---

## Phase 1: Rename

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Prerequisite**: @fyit npm org must be registered

**Objective**: Rename all directories and update package names.

### Checklist

- [ ] Verify @fyit npm org is registered
- [ ] Rename `nuxt-crouton` → `crouton-core`
- [ ] Rename `nuxt-crouton-cli` → `crouton-cli`
- [ ] Rename `nuxt-crouton-auth` → `crouton-auth`
- [ ] Rename `nuxt-crouton-admin` → `crouton-admin`
- [ ] Rename `nuxt-crouton-i18n` → `crouton-i18n`
- [ ] Rename `nuxt-crouton-editor` → `crouton-editor`
- [ ] Rename `nuxt-crouton-flow` → `crouton-flow`
- [ ] Rename `nuxt-crouton-assets` → `crouton-assets`
- [ ] Rename `nuxt-crouton-devtools` → `crouton-devtools`
- [ ] Rename `nuxt-crouton-maps` → `crouton-maps`
- [ ] Rename `nuxt-crouton-ai` → `crouton-ai`
- [ ] Rename `nuxt-crouton-email` → `crouton-email`
- [ ] Rename `nuxt-crouton-events` → `crouton-events`
- [ ] Rename `nuxt-crouton-collab` → `crouton-collab`
- [ ] Rename `nuxt-crouton-pages` → `crouton-pages`
- [ ] Rename `nuxt-crouton-schema-designer` → `crouton-schema-designer`
- [ ] Rename `nuxt-crouton-themes` → `crouton-themes`
- [ ] Rename `nuxt-crouton-mcp-server` → `crouton-mcp`
- [ ] Update all package.json "name" fields to @fyit/*
- [ ] Update pnpm-workspace.yaml
- [ ] Run `pnpm install`
- [ ] Run typecheck
- [ ] Commit: `chore(root): phase 1 - rename packages to @fyit scope`

**Commit SHA**:

---

## Phase 2: Create Module

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Objective**: Create the unified @fyit/crouton module.

### Checklist

- [ ] Create `packages/crouton/` directory
- [ ] Create `packages/crouton/package.json`
- [ ] Create `packages/crouton/src/module.ts`
- [ ] Create `packages/crouton/src/types.ts`
- [ ] Create `packages/crouton/build.config.ts`
- [ ] Build module: `cd packages/crouton && pnpm build`
- [ ] Run typecheck
- [ ] Commit: `feat(crouton): phase 2 - create unified module`

**Commit SHA**:

---

## Phase 3: Update CLI

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Objective**: Update CLI module registry and templates.

### Checklist

- [ ] Update `lib/module-registry.mjs` package names
- [ ] Add missing modules (collab, pages, themes, schema-designer)
- [ ] Add `bundled: true` flag to auth, admin, i18n
- [ ] Update `lib/generate-collection.mjs` references
- [ ] Update `lib/add-module.mjs` references
- [ ] Update any template files
- [ ] Run CLI tests: `cd packages/crouton-cli && pnpm test`
- [ ] Run typecheck
- [ ] Commit: `chore(crouton-cli): phase 3 - update package references to @fyit`

**Commit SHA**:

---

## Phase 4: Update References

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Objective**: Update all internal references across the codebase.

### Checklist

- [ ] Update all `nuxt.config.ts` files
- [ ] Update all `CLAUDE.md` files
- [ ] Update all import statements in source code
- [ ] Update all `README.md` files
- [ ] Update `apps/docs/content/` documentation
- [ ] Update `.claude/` skill files
- [ ] Run `pnpm install`
- [ ] Run typecheck across multiple packages
- [ ] Commit: `chore(root): phase 4 - update all internal references to @fyit`

**Commit SHA**:

---

## Phase 5: Build & Publish (Manual)

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Objective**: Build and publish all packages to npm.

### Checklist

- [ ] Reset all versions: `pnpm -r exec npm version 1.0.0`
- [ ] Build all packages: `pnpm -r build`
- [ ] Final typecheck: `pnpm -r typecheck`
- [ ] Publish crouton-core
- [ ] Publish crouton-cli
- [ ] Publish bundled add-ons (auth, admin, i18n)
- [ ] Publish optional add-ons
- [ ] Publish tooling packages
- [ ] Publish mini-apps (bookings, sales)
- [ ] Publish unified module (crouton) - LAST

**Notes**:

---

## Phase 6: Deprecate & Docs (Manual)

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Objective**: Deprecate old packages and update documentation.

### Checklist

- [ ] Deprecate all 20 @friendlyinternet/* packages
- [ ] Update docs site with new package names
- [ ] Create migration guide page
- [ ] Update external READMEs
- [ ] Announce migration

**Notes**:

---

## Log

| Date | Phase | Action | Notes |
|------|-------|--------|-------|
| 2025-01-17 | - | Plan created | Comprehensive briefing in PLAN-package-rename-fyit.md |
