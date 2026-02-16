# Schema Designer — High Level Plan

## Overview

An AI-guided chat application that walks developers through creating a Nuxt Crouton app. The output is generated code the developer owns and can modify freely. The AI operates within strong guardrails (Crouton system, Nuxt UI, existing packages).

---

## Flow

### Phase 1 — Intake

- App name, description, basic metadata
- Key decisions: teams (yes/no), languages, target packages
- AI asks structured questions to lock in foundational choices
- Output: app config object

### Phase 2 — Collection Design

- AI guides user through defining collections (e.g. todos, users, projects)
- Asks clarifying questions per collection (fields, relationships, field types)
- Visual representation of entities and relationships shown alongside chat
- User can iterate — add, remove, modify collections
- Relevant packages suggested contextually (e.g. "this looks like a CMS, want the pages package?")

### Phase 3 — Seed Data

- Per collection, AI generates realistic sample data
- Displayed in a Nuxt UI table so user can validate
- Serves as basis for detail view design
- User can regenerate or tweak seed data

### Phase 4 — Detail View Design

- Three-panel layout: chat (1/3), code editor (1/3), visual preview (1/3)
- AI generates detail view HTML/Vue based on schema + seed data
- User can edit code directly — changes sync via Yjs
- AI stays aware of current state through shared Yjs document
- Can react to manual edits and suggest improvements

### Phase 5 — Generation

- All config, schemas, detail views, and seed data passed to CLI
- CLI generates full Crouton app code (collections, forms, lists, details, auth, teams, translations)
- Developer takes over from there

---

## Architecture Notes

- **Yjs integration** from the collab package wired into the editor so AI and user share document state
- **Packages** suggested during intake and contextually throughout the flow
- **Iterative by design** — user can go back to earlier phases; since Crouton handles teams/auth/etc. as toggleable features, changes to intake decisions don't require full rebuilds
- **UI framework**: Nuxt UI throughout for consistency and guardrails

---

## Priorities

1. Get Phase 1 + 2 working end-to-end first (intake → collection generation → CLI)
2. Add Phase 3 (seed data) as validation layer
3. Build Phase 4 (detail view design) — most complex, needs UX iteration
4. Wire in Yjs for AI-editor sync
5. Expand package suggestions over time as new packages are created

---

## Connection to Collection Display Plan

This plan produces the **tooling** that generates Detail/Card components. The [Collection Display & Publishable Pages plan](./collection-display-and-publishable-pages.md) defines the **runtime system** that renders them.

| Concern | Schema Designer (this plan) | Collection Display Plan |
|---------|----------------------------|------------------------|
| Detail.vue | AI generates domain-aware component (Phase 4) | `CroutonDetail` provides generic fallback |
| Card.vue | AI generates domain-aware component (Phase 4) | `CroutonDefaultCard` uses display config |
| display config | AI populates based on schema understanding (Phase 2) | Runtime components consume it |
| Seed data | AI generates realistic samples (Phase 3) | Not involved |
| Publishable pages | Package suggestion: "want crouton-pages?" (Phase 2) | Runtime bridge between pages and collections |

The schema designer is the **authoring** path. The collection display system is the **runtime** path. Both work independently — collections created without the schema designer still get generic display via `CroutonDetail` and display config.
