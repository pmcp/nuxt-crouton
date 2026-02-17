# Schema Designer v2 — Plan & Status

## Overview

The Schema Designer is an AI-guided application that helps developers scaffold full Nuxt Crouton applications through a conversational interface. Instead of manually writing collection JSONs and configuring packages, the developer is walked through a structured flow where the AI proposes, the developer sculpts, and the CLI generates.

**Core principles:**
- The output is always code. The developer owns it and is never locked in.
- The AI operates within strong guardrails — Crouton field types, Nuxt UI components, and the existing package ecosystem constrain what can be generated, making AI output reliable and predictable.
- The accordion editor is the primary editing surface. Chat is the power tool for complex or bulk operations.
- Build it as a Crouton app — dogfooding the framework it designs for.

---

## Current Status (Feb 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase A — Foundation | **Complete** ✅ | All 33 tasks done |
| Phase 3 — Seed Data (from Phase B) | **Complete** ✅ | Pulled forward from Phase B scope |
| Create App scaffold (replaces ZIP) | **Complete** ✅ | Server-side `POST /api/scaffold-app` |
| Phase B — Visual Graph | Not started | CroutonFlow graph visualization only remaining item |
| Phase C — Detail View Design | Not started | AI-generated Vue components + preview |
| Phase D — Ecosystem Polish | Not started | Package manifests, templates, undo/redo |

**Key deviation from original plan:** Phase 5's output mechanism changed from downloadable ZIP to a server-side Create App flow. The designer runs in local dev (not Cloudflare Workers), so the server endpoint can invoke the CLI directly — no download step needed.

---

## Decisions Log

Decisions made during planning and implementation (Feb 2026):

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Phase A collection UI | **Accordion list** (no CroutonFlow graph) | Eliminates biggest scope risk. Graph moves to Phase B+ |
| Persistence | **NuxtHub SQLite** (Cloudflare) | Dogfooding crouton-core. Cloud-native from the start |
| Backward navigation | **Preserve + warn** for Phase 2→1, **cascade delete** for Phase 3+→2 | Collections survive intake changes (user reconciles). Downstream generated data (seeds) cascade-deletes when schema changes |
| Preview tech (Phase C) | **Nuxt UI components directly** | Much lighter than WebContainers |
| Chat interface | **Existing crouton-ai** (`useChat()`) | Streaming + tool use ready. No new infrastructure |
| Auth | **crouton-auth** (auto-included via core) | Zero auth work for the designer |
| Output | **Server-side Create App scaffold** | `POST /api/scaffold-app` runs CLI scaffold, writes schemas + seed data, installs deps, runs doctor. Originally planned as ZIP download — changed because designer runs locally with shell access |
| Deployment | **Standalone app** (`apps/crouton-designer/`) | Independent release cycle |
| Existing v1 schema-designer | **Replace** — fresh start, borrow ideas | Clean architecture, reuse AI prompts + types + parsers |
| Relationships | **As field types** (`type: 'reference'`) | Simpler mental model, matches CLI. No separate Relationships table |
| AI in Phase A | **Yes, from day one** | Core differentiator. Manual editing works alongside |
| Target user | **Solo dev (you)** | Skip onboarding polish, optimize for power and speed |
| Seed data storage | **JSON on project record** (not separate collection) | Simpler than a SeedEntries collection. Seed data is ephemeral and tied to the project |

---

## Architecture

### Package + App Split

| Location | Purpose |
|----------|---------|
| `packages/crouton-designer/` | Reusable logic: schema editing components, AI prompts, types, composables, server endpoints |
| `apps/crouton-designer/` | Thin app shell extending the package + crouton-auth + crouton-ai |

This means the designer could eventually be embedded into other Crouton apps.

### State Model — Crouton Collections

The Schema Designer's state is stored in its own Crouton collections:

| Collection | Purpose |
|------------|---------|
| **Projects** | The app being designed (name, config JSON, currentPhase, messages JSON per phase, seedData JSON) |
| **Collections** | Entities the user defines (name, description, display config, belongs to project) |
| **Fields** | Individual fields (name, type, meta JSON, refTarget, sortOrder, collection FK). Relations are fields with `type: 'reference'` pointing to a target collection |

Seed data is stored as a JSON column on the Projects record (not a separate collection). This is simpler and sufficient since seed data is ephemeral and regenerated frequently.

**Future phases may add:**

| Collection | Phase | Purpose |
|------------|-------|---------|
| **DetailViews** | C | Generated Vue template code per collection |

### AI Architecture

**Model:** Claude via the existing `crouton-ai` package (`useChat()` + `createAIProvider()`).

**Output format:**
- Phases 1–3: Structured JSON via Claude tool use. The AI "calls tools" like `create_collection`, `add_field`, `update_field`, `delete_collection`, `delete_field`, `set_seed_data` with typed parameters. The app consumes the structured data directly.
- All phases: The AI also returns a conversational message alongside the structured payload.

**AI tools implemented (9 total):**

| Phase | Tool | Parameters | Effect |
|-------|------|-----------|--------|
| 1 | `set_app_config` | `{ name, description, appType, ... }` | Updates project config (partial merge) |
| 2 | `create_collection` | `{ name, description, fields[] }` | Creates collection with optional initial fields |
| 2 | `update_collection` | `{ collectionId, name?, description? }` | Renames or updates a collection |
| 2 | `delete_collection` | `{ collectionId }` | Removes collection + cascade-deletes fields |
| 2 | `add_field` | `{ collectionId, name, type, meta?, refTarget? }` | Adds a field to a collection |
| 2 | `update_field` | `{ fieldId, name?, type?, meta?, refTarget? }` | Modifies an existing field |
| 2 | `delete_field` | `{ fieldId }` | Removes a field |
| 2 | `reorder_fields` | `{ collectionId, fieldIds[] }` | Sets field display order |
| 3 | `set_seed_data` | `{ collectionName, entries[] }` | Replaces seed data for a collection |

**Context management — scoped calls per phase:**
- Each AI call gets a system prompt with the current app state (pulled from the database as JSON) plus only the conversation history for the current phase.
- When the user moves to a new phase, conversation resets, but state carries over from the database.
- This prevents token bloat from Phase 1 iterations filling up Phase 2's context.

**Package suggestions:**
- AI-driven, not rule-based. The package catalog is included in the AI context.
- Deferred to Phase D for full manifest system. Currently, suggestions come from existing documentation.
- Suggestions are quiet — small inline indicators, not toasts or modals.

---

## User Flow (Implemented)

### Phase 1 — Intake ✅

**Purpose:** Establish foundational decisions that affect everything downstream.

**Interaction model:** Open conversation, not a wizard. The user describes their app in a paragraph or two, the AI extracts everything it can, then asks targeted follow-ups for what's missing.

**What the AI covers:**
- App name and description
- Multi-tenant / teams / organizations
- Authentication type (email/password, OAuth, both)
- Supported languages and default locale
- General nature of the app (internal tool, SaaS, CMS, etc.)
- Any packages the developer already knows they want

**What the user sees:**
- Two-panel layout: chat on the left (1/3), summary card on the right (2/3)
- Summary card fills in as decisions are made
- Summary card is directly editable — click to change any value without going back through chat
- Config auto-saves with 800ms debounce

**AI behavior:**
- Returns structured JSON via tool use (`set_app_config`) alongside conversational messages
- Extracts as much as possible from the initial description, asks only about gaps
- Opinionated defaults where sensible (e.g., assumes English as default language unless told otherwise)

**Transition:** Explicit. AI suggests moving on, user confirms via a "Continue to Collection Design" button. Progress indicator at the top updates.

**Output:** App config object stored in the Projects collection.

---

### Phase 2 — Collection Design ✅

**Purpose:** Define the data model — entities, fields, and relationships.

**Interaction model:** The AI proposes a full starter data model based on the app description from Phase 1. The user sculpts it from there — removing, adding, renaming, restructuring.

**Initial proposal:**
When entering Phase 2 with no collections, the AI auto-sends a proposal request and generates a complete set of suggested collections based on the app config. This is presented all at once for the user to react to.

**What the user sees:**
- Two-panel layout: chat on the left (1/3), accordion collection editor on the right (2/3)
- Each collection is an expandable accordion item
- Fields listed inside each accordion with type indicators and icons
- Reference fields show a visual indicator linking to the target collection
- "Add Collection" button at the top of the accordion list
- "Add Field" button inside each collection accordion

**Direct manipulation (primary editing surface):**
- Click a field name → rename inline
- Click a field type → dropdown of available Crouton field types
- Click "+" on an accordion → add a new field
- Click "×" on a field → delete it (with confirmation for reference fields)
- Drag to reorder fields within a collection
- "Add Collection" button → creates a blank collection
- Click an accordion header → rename the collection
- Delete a collection → removes it and cascade-deletes downstream data (with confirmation)

**Chat (power tool for complex operations):**
- "Add an assignee relation to users on every collection"
- "I'm missing something for tracking deadlines"
- "What am I missing?" — AI does a sanity check
- "I need tasks that belong to projects and are assigned to users" — AI proposes fields and relationships

**Continuous validation:**
- Validation runs on every change (deterministic, not AI)
- Red indicators on invalid states: duplicate field names, missing relation targets, reserved names, empty collections
- Issues shown inline on the accordion, not as blocking dialogs

**Transition:** Explicit. User confirms they're done with collections, moves to Phase 3.

**Output:** Collections and Fields stored in the database.

---

### Phase 3 — Seed Data ✅

**Purpose:** Generate realistic sample data to validate the schema before generating the app.

**Interaction model:** AI generates contextually appropriate seed data automatically on phase entry. User iterates via chat — not inline editing.

**What the AI generates:**
- Data that matches the app context (project management tool → real-ish project names and task descriptions, not lorem ipsum)
- Seed data respects relationships — tasks reference actual seed projects, authors reference actual seed users
- Reasonable default count per collection (5–10 entries)

**What the user sees:**
- Two-panel layout: chat on the left (1/3), Nuxt UI tables on the right (2/3)
- One table per collection, switchable via tabs
- Tables are read-only with truncated cell values (max 60 chars)
- A "Regenerate" button per collection
- Entry count badges on tabs

**Chat-guided iteration:**
- "Make some tasks overdue"
- "Add more variety to project names"
- "Give me 20 users instead of 5"
- "The priorities should include 'critical'"

**AI behavior:**
- Returns structured JSON via tool use (`set_seed_data`) with full entry arrays
- Regenerates the full dataset for a collection on each request (not patching individual rows)
- Auto-generates on Phase 3 entry if no seed data exists

**Seed data persistence:** Stored as JSON on the project record, auto-saves with 800ms debounce.

**Transition:** Explicit. User confirms seed data looks right, moves to Phase 5.

**Output:** Seed data stored on the Projects record as JSON.

---

### Phase 5 — Review & Create App ✅

**Purpose:** Final review, deterministic validation, and app creation.

**Deterministic validation pass (not AI):**
- Every reference target exists as a collection
- No duplicate field names within a collection
- No duplicate collection names
- No reserved field names conflicting with Crouton internals (id, teamId, createdAt, etc.)
- No reserved collection names conflicting with Nuxt conventions (api, pages, components, etc.)
- Empty collections flagged as warnings

**What the user sees:**
- Single-panel view (no chat)
- Generation summary: app name, app type, collection count, field count, selected packages
- Validation checklist with green checkmarks / red X indicators
- Artifact preview grouped by category (config, app, server, schema, seed) with file counts
- "Create App" button (disabled if critical validation errors exist)

**Create App flow:**
1. User clicks "Create App"
2. Client POSTs to `/api/scaffold-app` with app name, config, schemas, seed data
3. Server runs 7 steps:
   - **scaffold** — `pnpm crouton scaffold-app {appName}` with features + dialect flags
   - **schemas** — writes collection JSON schemas to `schemas/` directory
   - **seedData** — writes seed data files to `schemas/{collection}.seed.json`
   - **config** — generates `crouton.config.js` with collections + targets
   - **install** — `pnpm install` from monorepo root
   - **generate** — `pnpm crouton config ./crouton.config.js`
   - **doctor** — `pnpm crouton doctor .` to validate
4. Step results shown in UI with success/failure per step
5. On success: shows app directory path, copy-pasteable `pnpm dev` and deploy commands

**Error handling:**
- If scaffold step fails, returns early (no further steps)
- Doctor warnings are non-fatal
- Step errors displayed with error message
- Server validates app name format and checks for duplicate app directories

---

## UI Design

### Layout by Phase

| Phase | Layout | Left (1/3) | Right (2/3) |
|-------|--------|------------|-------------|
| 1 — Intake | Two-panel | Chat | Editable summary card |
| 2 — Collections | Two-panel | Chat | Accordion collection editor |
| 3 — Seed Data | Two-panel | Chat | Nuxt UI tables (read-only) |
| 5 — Review & Create | Single-panel | — | Validation + artifact preview + Create App |

### Navigation

- Progress indicator at the top showing current phase (1 → 2 → 3 → 5)
- Phases are clickable — user can navigate back to any completed phase
- Going back from Phase 3+ → Phase 2 triggers **cascade delete** of seed data with confirmation
- Going back from Phase 2 → Phase 1 **preserves** collections but shows a warning that config changes may require schema adjustments
- Transitions between phases are always explicit (user clicks "Continue")

### Responsiveness

- Chat panel collapsible in all phases for more visual space

---

## Integration Features (Implemented) ✅

### Backward Navigation
- Phase 2 → Phase 1: Warning modal, collections preserved
- Phase 3+ → Phase 2: Warning modal, seed data cascade-deleted with confirmation

### Project List
- `/admin/[team]/designer/` — all projects sorted by update date
- Shows project name, update date, current phase badge
- Click to resume, delete with confirmation, "New Project" button

### Chat Persistence
- Messages stored as `messages[phase]` JSON on project record
- Restored on phase entry
- Previous phases retain history when moving forward

### AI Error Handling
- Retry button in ChatPanel
- Phase 1 shows amber fallback banner pointing to manual form
- Malformed tool calls caught, logged, ignored (don't crash)
- Tool call errors return context for AI to self-correct

### Resumability
- Close browser → reopen → click project → lands on correct phase with all data
- Config, currentPhase, chat messages, seed data all restored

---

## CroutonFlow Integration (Deferred to Phase B+)

The graph-based collection visualization is deferred. When built, it requires these enhancements to `crouton-flow`:

| Enhancement | Purpose |
|-------------|---------|
| Custom `SchemaNode.vue` component | Rich node with inline field editing, type dropdowns, add/remove buttons |
| Relationship edge labels | Show cardinality on edges |
| Clickable edges | Change direction or cardinality |
| "Add node" canvas action | Create new collections from the graph |
| Dagre re-layout on change | Re-layout when collections are added/removed |
| Field type indicators | Visual icons or badges for field types inside nodes |

The accordion list is the current UI. The graph becomes an optional "visual mode" toggle in a later phase.

---

## Package Manifests (Deferred)

Every Crouton package will eventually have a `manifest.ts` that describes:
- What the package does (AI-readable description)
- When to suggest it (trigger patterns)
- What it provides (components, composables, field types)
- What it requires (other packages, expected collections)

**This is deferred until after Phase A ships.** Building the designer first will reveal what data the AI actually needs from packages. The manifest schema will be designed based on real requirements, not guesses.

In the meantime, package suggestions use existing CLAUDE.md documentation and package.json metadata.

---

## Remaining Build Phases

### Phase B — Visual Graph (Partially Complete)

**Goal:** Graph visualization as alternative collection editor.

**Done:**
- ✅ Phase 3 seed data (pulled forward, implemented alongside Phase A)

**Remaining:**
- CroutonFlow graph as optional "visual mode" toggle alongside accordion
- CroutonFlow enhancements (SchemaNode, edge labels, Dagre layout)

### Phase C — Detail View Design

**Goal:** Design detail views with real Nuxt UI component previews.

**Scope:**
- Phase 4: AI-generated Vue components with Nuxt UI preview (no WebContainers)
- Chat-driven iteration on detail view layout
- View Code toggle
- Phase 5 full review UI with expandable sections

### Phase D — Ecosystem Polish

**Goal:** Intelligent package integration and overall polish.

**Scope:**
- Package `manifest.ts` design and implementation across all packages
- AI-driven package suggestions throughout the flow (quiet inline UX)
- Cross-phase impact detection (dependency graph queries + AI-suggested fixes)
- Project templates (pre-filled state for common app types)
- Navigation between phases with downstream impact awareness
- Undo/redo via state snapshots

---

## Connection to Collection Display Plan

This plan produces the **tooling** that generates Detail/Card components. The [Collection Display & Publishable Pages plan](./collection-display-and-publishable-pages.md) defines the **runtime system** that renders them.

| Concern | Schema Designer (this plan) | Collection Display Plan |
|---------|----------------------------|------------------------|
| Detail.vue | AI generates domain-aware component (Phase C) | `CroutonDetail` provides generic fallback |
| Card.vue | AI generates domain-aware component (Phase C) | `CroutonDefaultCard` uses display config |
| display config | AI populates based on schema understanding (Phase 2) | Runtime components consume it |
| Seed data | AI generates realistic samples (Phase 3) ✅ | Not involved |
| Publishable pages | Package suggestion: "want crouton-pages?" (Phase 2) | Runtime bridge between pages and collections |

The schema designer is the **authoring** path. The collection display system is the **runtime** path. Both work independently — collections created without the schema designer still get generic display via `CroutonDetail` and display config.

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Crouton collections in NuxtHub SQLite | Persistence, resumability, relational queries for free. Dogfooding |
| AI output format | Structured JSON (tool use) for Phases 1–3, raw Vue code for Phase 4 | Reliable data ingestion vs creative code generation |
| AI context | Scoped calls per phase, state from DB | Prevents token bloat, keeps context focused |
| AI package | `crouton-ai` with `useChat()` + `createAIProvider()` | Already built, streaming + multi-provider ready |
| Auth | `crouton-auth` (auto-included) | Better Auth with teams, OAuth, passkeys — zero work |
| App creation | Server-side scaffold via `POST /api/scaffold-app` | Designer runs locally with shell access. No download step needed |
| Preview rendering | Nuxt UI components directly (Phase C) | Lighter than WebContainers, broader browser support |
| Collection visualization | Accordion list (current), CroutonFlow graph (Phase B+) | Ship fast, add graph when core loop is proven |
| Relationships | Reference field type pointing to target collection | Matches CLI model, simpler than separate Relationships table |
| Phase transitions | Explicit (user clicks "Continue") | Clear user control and progress awareness |
| Backward navigation | Preserve + warn (2→1), cascade delete (3+→2) | Collections survive config edits; seed data cascades on schema change |
| Package suggestions | AI-driven from catalog, deferred until Phase D | Scales with ecosystem, needs real usage data to design manifests |
| Editing model | Accordion as primary, chat as power tool | Faster for corrections, chat for complex/bulk operations |
| Validation | Continuous in Phase 2, deterministic in Phase 5 | Catch errors early, confirm before generation |
| Seed data storage | JSON on project record | Simpler than separate collection. Seed data is ephemeral |
| Target user | Solo dev (power user) | Skip polish, optimize for speed |

---

## Risks & Mitigations

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| AI returns malformed tool calls | UI crash or data corruption | Validate tool call params before processing. Log + ignore invalid calls | ✅ Implemented |
| Claude rate limits or downtime | Phase 1 intake blocked | Phase 1: manual form fallback. Phase 2: accordion works without AI | ✅ Implemented |
| Token bloat from large schemas | AI quality degrades | Scoped context per phase + state from DB | ✅ Implemented |
| Streaming breaks mid-response | Partial tool calls, incomplete UI state | Keep partial state, let user retry via ChatPanel retry button | ✅ Implemented |

---

## Field Meta Editing Reference (Phase 2 Accordion)

Meta properties are split into three tiers for the accordion editor:

### Tier 1 — Inline (always visible on each field row)

| Property | UI Control | Applies To |
|----------|-----------|------------|
| `required` | Toggle badge | All types |
| `unique` | Toggle badge | string, number, integer, decimal |
| `label` | Shown as field display name | All types |
| `area` | Dropdown: main / sidebar / meta | All types |
| `refTarget` | Collection dropdown | reference only |

### Tier 2 — Expandable panel (click chevron on field row)

| Property | UI Control | Applies To |
|----------|-----------|------------|
| `maxLength` | Number input | string |
| `default` | Type-appropriate input | All except reference, repeater |
| `translatable` | Toggle | string, text |
| `group` | Text input | All types |
| `displayAs` | Dropdown (optionsSelect, slotButtonGroup) | string |
| `options` | Tag input for static options | string |
| `optionsCollection` / `optionsField` | Collection + field dropdowns | string |
| `readOnly` | Toggle | reference |
| `dependsOn` chain | Field + collection + field dropdowns | reference |

### Tier 3 — Chat-only (too complex for accordion UI)

| Property | Reason | Set Via |
|----------|--------|---------|
| `component` | Custom component name — needs context | AI tool call or JSON edit |
| `primaryKey` | Auto-set on uuid fields | Automatic |
| `precision` / `scale` | Rare, decimal-only | AI tool call |
| `properties` (repeater) | Nested typed structure | AI tool call |
| `translatableProperties` (repeater) | Complex nested config | AI tool call |

> The AI can set any meta property via tool calls, regardless of tier. The tiers only affect what's directly editable in the accordion UI.

---

## What's Explicitly Out of Scope (Not Yet Built)

- CroutonFlow graph visualization (Phase B)
- Detail view design + Nuxt UI preview (Phase C)
- Package manifest system (Phase D)
- Undo/redo (Phase D)
- Project templates (Phase D)
- Onboarding / tutorial flow
- Mobile-optimized layout
- Collaborative editing
- Export to GitHub
- Import existing project via filesystem scanning
