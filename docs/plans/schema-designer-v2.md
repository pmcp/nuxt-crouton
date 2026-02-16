# Schema Designer v2 — Full Plan

## Overview

The Schema Designer is an AI-guided application that helps developers scaffold full Nuxt Crouton applications through a conversational interface. Instead of manually writing collection JSONs and configuring packages, the developer is walked through a structured flow where the AI proposes, the developer sculpts, and the CLI generates.

**Core principles:**
- The output is always code. The developer owns it and is never locked in.
- The AI operates within strong guardrails — Crouton field types, Nuxt UI components, and the existing package ecosystem constrain what can be generated, making AI output reliable and predictable.
- The accordion editor is the primary editing surface. Chat is the power tool for complex or bulk operations.
- Build it as a Crouton app — dogfooding the framework it designs for.

---

## Decisions Log

Decisions made during planning (Feb 2026):

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Phase A collection UI | **Accordion list** (no CroutonFlow graph) | Eliminates biggest scope risk. Graph moves to Phase B+ |
| Persistence | **NuxtHub SQLite** (Cloudflare) | Dogfooding crouton-core. Cloud-native from the start |
| Backward navigation | **Preserve + warn** for Phase 2→1, **cascade delete** for Phase 3+→2 | Collections survive intake changes (user reconciles). Downstream generated data (seeds, views) cascade-deletes when schema changes |
| Preview tech (Phase C) | **Nuxt UI components directly** | Much lighter than WebContainers |
| Chat interface | **Existing crouton-ai** (`useChat()`) | Streaming + tool use ready. No new infrastructure |
| Auth | **crouton-auth** (auto-included via core) | Zero auth work for the designer |
| Output | **Schema JSONs as downloadable ZIP** | Developer runs CLI locally (Cloudflare has no shell). Future: local dev companion for auto-run |
| Deployment | **Standalone app** (`apps/crouton-designer/`) | Independent release cycle |
| Existing v1 schema-designer | **Replace** — fresh start, borrow ideas | Clean architecture, reuse AI prompts + types + parsers |
| Relationships | **As field types** (`type: 'reference'`) | Simpler mental model, matches CLI. No separate Relationships table |
| AI in Phase A | **Yes, from day one** | Core differentiator. Manual editing works alongside |
| Target user | **Solo dev (you)** | Skip onboarding polish, optimize for power and speed |

---

## Architecture

### Package + App Split

| Location | Purpose |
|----------|---------|
| `packages/crouton-designer/` | Reusable logic: schema editing components, AI prompts, types, composables |
| `apps/crouton-designer/` | Thin app shell extending the package + crouton-auth + crouton-ai |

This means the designer could eventually be embedded into other Crouton apps.

### State Model — Crouton Collections

The Schema Designer's state is stored in its own Crouton collections:

**Phase A (3 collections):**

| Collection | Purpose |
|------------|---------|
| **Projects** | The app being designed (name, config, current phase, selected packages) |
| **Collections** | Entities the user defines (name, description, belongs to project) |
| **Fields** | Individual fields (name, type, meta, collection FK). Relations are fields with `type: 'reference'` pointing to a target collection |

**Later phases add:**

| Collection | Phase | Purpose |
|------------|-------|---------|
| **SeedEntries** | B | Generated sample data per collection |
| **DetailViews** | C | Generated Vue template code per collection |

**Why this matters:**
- Persistence and resumability for free (it's a database)
- Dependency tracking via relational queries
- Templates become possible later (pre-filled projects for "SaaS starter", "Blog + CMS", etc.)

### AI Architecture

**Model:** Claude via the existing `crouton-ai` package (`useChat()` + `createAIProvider()`).

**Output format:**
- Phases 1–2: Structured JSON via Claude tool use. The AI "calls tools" like `create_collection`, `add_field`, `update_field`, `delete_collection`, `delete_field` with typed parameters. The app consumes the structured data directly.
- All phases: The AI also returns a conversational message alongside the structured payload.

**Context management — scoped calls per phase:**
- Each AI call gets a system prompt with the current app state (pulled from the database as JSON) plus only the conversation history for the current phase.
- When the user moves to a new phase, conversation resets, but state carries over from the database.
- This prevents token bloat from Phase 1 iterations filling up Phase 2's context.

**Reusable from v1:**
- System prompt structure from `useSchemaAI()` (field type reference, meta properties, package context, examples)
- Streaming JSON parser from `useStreamingSchemaParser()` (incremental field extraction, deduplication)
- Field type registry from `useFieldTypes()` (icons, defaults, meta properties)
- Type definitions (`SchemaField`, `CollectionSchema`, field meta types)

**Package suggestions:**
- AI-driven, not rule-based. The package catalog is included in the AI context.
- Deferred to Phase D for full manifest system. In Phase A, suggestions come from existing documentation.
- Suggestions are quiet — small inline indicators, not toasts or modals.

---

## User Flow

### Phase 1 — Intake

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

**AI behavior:**
- Returns structured JSON via tool use (`set_app_config`) alongside conversational messages
- Extracts as much as possible from the initial description, asks only about gaps
- Opinionated defaults where sensible (e.g., assumes English as default language unless told otherwise)

**AI tools (Phase 1):**

| Tool | Parameters | Effect |
|------|-----------|--------|
| `set_app_config` | `{ name, description, appType, multiTenant, authType, languages, defaultLocale, packages }` | Updates project config. Partial updates merge with existing values |

**Transition:** Explicit. AI suggests moving on, user confirms via a "Continue to Collection Design" button. Progress indicator at the top updates.

**Output:** App config object stored in the Projects collection.

---

### Phase 2 — Collection Design

**Purpose:** Define the data model — entities, fields, and relationships.

**Interaction model:** The AI proposes a full starter data model based on the app description from Phase 1. The user sculpts it from there — removing, adding, renaming, restructuring.

**Initial proposal:**
When entering Phase 2, the AI generates a complete set of suggested collections based on the app config. For example, "project management tool" → Projects, Tasks, Users, Labels, Comments. This is presented all at once for the user to react to.

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
- Red indicators on invalid states: duplicate field names, missing relation targets, reserved names
- Issues shown inline on the accordion, not as blocking dialogs

**AI behavior:**
- Returns structured JSON via tool use (full CRUD — see tools table below)
- Opinionated — suggests complete schemas, not individual fields
- Follows up on ambiguity ("Should tasks have priorities? Deadlines? Subtasks?")
- Suggests packages quietly when patterns match (rich text field → editor package, nested slugs → pages package)

**AI tools (Phase 2):**

| Tool | Parameters | Effect |
|------|-----------|--------|
| `create_collection` | `{ name, description, fields[] }` | Creates a new collection with optional initial fields |
| `update_collection` | `{ collectionId, name?, description? }` | Renames or updates a collection |
| `delete_collection` | `{ collectionId }` | Removes collection + cascade-deletes its fields |
| `add_field` | `{ collectionId, name, type, meta?, refTarget? }` | Adds a field to a collection |
| `update_field` | `{ fieldId, name?, type?, meta?, refTarget? }` | Modifies an existing field |
| `delete_field` | `{ fieldId }` | Removes a field |
| `reorder_fields` | `{ collectionId, fieldIds[] }` | Sets field display order |

**Transition:** Explicit. User confirms they're done with collections, moves to Phase 3 (or Phase 5 in Phase A).

**Output:** Collections and Fields stored in the database.

---

### Phase 3 — Seed Data (Phase B)

**Purpose:** Generate realistic sample data to validate the schema before investing in detail views.

**Interaction model:** AI generates contextually appropriate seed data automatically. User iterates via chat — not inline editing.

**What the AI generates:**
- Data that matches the app context (project management tool → real-ish project names and task descriptions, not lorem ipsum)
- Seed data respects relationships — tasks reference actual seed projects, authors reference actual seed users
- Reasonable default count per collection (5–10 entries)

**What the user sees:**
- Two-panel layout: chat on the left (1/3), Nuxt UI tables on the right (2/3)
- One table per collection, switchable via tabs
- Tables are sortable and filterable (read-only, no inline editing)
- A "Regenerate" button per collection

**Chat-guided iteration:**
- "Make some tasks overdue"
- "Add more variety to project names"
- "Give me 20 users instead of 5"
- "The priorities should include 'critical'"

**AI behavior:**
- Returns structured JSON via tool use (`generate_seed_data`) with full entry arrays
- Regenerates the full dataset for a collection on each request (not patching individual rows)

**Transition:** Explicit. User confirms seed data looks right, moves to Phase 4.

**Output:** SeedEntries stored in the database per collection.

---

### Phase 4 — Detail View Design (Phase C)

**Purpose:** Design how individual items look when viewed — the detail/show page for each collection.

**Interaction model:** AI generates Vue components using Nuxt UI, rendered as a live preview. Chat for iteration.

**How it works:**
1. AI generates a detail view Vue component based on the collection's fields, types, and seed data
2. The component is rendered using Nuxt UI components directly (no WebContainers)
3. Seed data is injected as props
4. The preview renders on the right panel
5. When the AI regenerates the component (in response to chat), the preview updates

**What the user sees:**
- Two-panel layout: chat on the left (1/3), live preview on the right (2/3)
- A "View Code" toggle to see the generated Vue component source
- Tabs to switch between collections
- The preview uses real Nuxt UI components — consistent and professional

**AI behavior:**
- Generates full Vue SFC code as text (not structured JSON)
- Smart about layout: images prominent, titles large, metadata in sidebar, related items in their own section
- Uses only Nuxt UI components — keeps output consistent
- Responds to change requests by regenerating the full component

**Chat interactions:**
- "Move the image to full-width at the top"
- "Put the metadata in a sidebar"
- "Add a section for related tasks"
- "Make all detail views use the same sidebar layout"

**Transition:** Explicit. User confirms detail views, moves to Phase 5.

**Output:** DetailViews stored in the database per collection (Vue SFC source code).

---

### Phase 5 — Review & Generation

**Purpose:** Final review and deterministic validation before code generation.

**Deterministic validation pass (not AI):**
- Every reference target exists as a collection
- No duplicate field names within a collection
- Slug fields have corresponding title/name fields
- Required fields have sensible defaults or form coverage
- No reserved field names conflicting with Crouton internals
- Collection names don't conflict with Nuxt route conventions

**Phase A (simplified):** Validation checklist + "Generate" button. No AI review, no expandable summary.

**Phase D (full):** AI qualitative review, expandable sections, jump-back-to-any-phase navigation.

**What the user sees (Phase A):**
- Single-panel view
- Validation checklist with green/red indicators
- List of collections with field counts
- Selected packages summary
- A clear "Generate" button

**After generation:**
- Schema JSONs are produced for each collection and packaged as a downloadable ZIP
- Developer downloads the ZIP, extracts schemas into their project, and runs `crouton generate --from ./schemas/`
- CLI generates the full Crouton app locally (where shell access and filesystem are available)
- Schema Designer's job is done

> **Why download instead of auto-run?** The designer runs on Cloudflare Workers (NuxtHub), which has no shell access or filesystem. The CLI needs to run in the developer's local environment where it can write files, run migrations, and access the project structure. A future "local dev companion" could bridge this gap.

---

## UI Design

### Layout by Phase

| Phase | Layout | Left (1/3) | Right (2/3) |
|-------|--------|------------|-------------|
| 1 — Intake | Two-panel | Chat | Editable summary card |
| 2 — Collections | Two-panel | Chat | Accordion collection editor |
| 3 — Seed Data | Two-panel | Chat | Nuxt UI tables (read-only) |
| 4 — Detail Views | Two-panel | Chat | Nuxt UI component preview |
| 5 — Review | Single-panel | — | Validation + Generate button |

### Navigation

- Progress indicator at the top showing current phase (1–5, or 1–2–5 in Phase A)
- Phases are clickable — user can navigate back to any completed phase
- Going back from Phase 3+→2 triggers **cascade delete** of downstream generated data (seeds, views) with confirmation
- Going back from Phase 2→1 **preserves** collections but shows a warning that config changes may require schema adjustments
- Transitions between phases are always explicit (user clicks "Continue")

### Responsiveness

- Chat panel collapsible in all phases for more visual space
- Tab-based alternative for smaller screens

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

Phase A uses the accordion list UI instead. The graph becomes an optional "visual mode" toggle in a later phase.

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

## Build Phases

### Phase A — Foundation (Ship First)

**Goal:** End-to-end flow from app description to generated Crouton app.

**Scope:**
- `packages/crouton-designer/` package + `apps/crouton-designer/` app
- Extends `crouton-auth` (auth for free) + `crouton-ai` (chat + AI for free)
- 3 Crouton collections for state: Projects, Collections, Fields
- Phase 1: Chat intake with editable summary card
- Phase 2: Chat + accordion collection editor with inline editing + AI full CRUD via tool use
- Phase 5 (simplified): Validation checklist + generate schemas + run CLI
- AI integration: structured tool use via `useChat()`, scoped system prompts per phase
- Explicit phase transitions with progress indicator (Phase 1 → 2 → 5)
- Continuous validation in Phase 2
- Cascade delete on backward navigation

**Reused from v1:**
- System prompt structure (field types, meta properties, package context, examples)
- Streaming JSON parser (incremental extraction, deduplication)
- Field type registry (icons, defaults)
- Type definitions (SchemaField, CollectionSchema, FieldMeta)

**Not included:** CroutonFlow graph, seed data, detail view design, package manifests, undo/redo, templates, onboarding polish.

**Why this is enough:** You can describe your app, design collections with AI assistance via an accordion editor, and generate a full Crouton app. That's the core value proposition.

### Phase B — Visual Graph + Seed Data

**Goal:** Graph visualization and schema validation with realistic data.

**Scope:**
- CroutonFlow graph as optional "visual mode" toggle alongside accordion
- CroutonFlow enhancements (SchemaNode, edge labels, Dagre layout)
- Phase 3: AI-generated seed data with chat-guided iteration
- Nuxt UI table display per collection
- Seed data passed to CLI for generation

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
- Collapsible panels, responsive layout improvements
- Undo/redo via state snapshots

---

## Connection to Collection Display Plan

This plan produces the **tooling** that generates Detail/Card components. The [Collection Display & Publishable Pages plan](./collection-display-and-publishable-pages.md) defines the **runtime system** that renders them.

| Concern | Schema Designer (this plan) | Collection Display Plan |
|---------|----------------------------|------------------------|
| Detail.vue | AI generates domain-aware component (Phase C) | `CroutonDetail` provides generic fallback |
| Card.vue | AI generates domain-aware component (Phase C) | `CroutonDefaultCard` uses display config |
| display config | AI populates based on schema understanding (Phase 2) | Runtime components consume it |
| Seed data | AI generates realistic samples (Phase B) | Not involved |
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
| Preview rendering | Nuxt UI components directly (Phase C) | Lighter than WebContainers, broader browser support |
| Collection visualization | Accordion list (Phase A), CroutonFlow graph (Phase B+) | Ship fast, add graph when core loop is proven |
| Relationships | Reference field type pointing to target collection | Matches CLI model, simpler than separate Relationships table |
| Phase transitions | Explicit (user clicks "Continue") | Clear user control and progress awareness |
| Backward navigation | Preserve + warn (2→1), cascade delete (3+→2) | Collections survive config edits; generated data (seeds/views) cascades on schema change |
| Package suggestions | AI-driven from catalog, deferred until Phase D | Scales with ecosystem, needs real usage data to design manifests |
| Editing model | Accordion as primary, chat as power tool | Faster for corrections, chat for complex/bulk operations |
| Validation | Continuous in Phase 2, deterministic in Phase 5 | Catch errors early, confirm before generation |
| Existing v1 code | Replace package, borrow AI prompts + types + parsers | Clean architecture with proven internals |
| Target user | Solo dev (power user) | Skip polish, optimize for speed |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI returns malformed tool calls | UI crash or data corruption | Validate all tool call params with Zod before processing. Log + ignore invalid calls, show "AI made an unexpected suggestion — try rephrasing" toast |
| Claude rate limits or downtime | Phase 1 intake blocked (chat-dependent) | Phase 1: add manual form fallback (UForm with all config fields). Phase 2: accordion works fully without AI. Show connection status indicator |
| Token bloat from large schemas | AI quality degrades in Phase 2 | Already mitigated: scoped context per phase + state from DB. Additional: truncate field meta in context, only include full meta for the actively-discussed collection |
| Streaming breaks mid-response | Partial tool calls, incomplete UI state | Reuse v1's streaming parser which handles partial JSON. On disconnect: keep partial state, let user retry |
| Developer expects auto-generation (not download) | Confusion at Phase 5 | Clear UX: "Download schemas" button with instructions. Show copy-pasteable CLI command. Explain why in a tooltip |

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

## Phase A — Detailed Task Breakdown

### Prerequisites

- [x] ~~Verify `crouton-ai` has tool use support via Vercel AI SDK~~ — Confirmed: AI SDK v4.3.19, `streamText()` supports `tools` param. The `crouton-ai` wrapper (`useChat()`) doesn't pass `tools` through yet — extend the wrapper as part of A2.3/A3.6
- [x] ~~Verify `crouton-cli` can be invoked programmatically~~ — Resolved: CLI runs locally. Designer exports schema JSONs as downloadable ZIP

### A1: Project Scaffolding

**Tasks:**

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| A1.1 | Create `packages/crouton-designer/` package | `nuxt.config.ts`, `package.json` with correct deps. Extends nothing (it's the reusable package) |
| A1.2 | Create `apps/crouton-designer/` app shell | Extends `crouton-designer`, `crouton-auth`, `crouton-ai`. Runs with `pnpm dev`. Has NuxtHub config (`hub: { db: 'sqlite' }`) |
| A1.3 | Define Crouton collections for state | 3 schema JSONs: `projects` (includes `currentPhase` integer + `messages` JSON for per-phase chat history + `config` JSON for app settings), `collections`, `fields`. Generate with `pnpm crouton generate`. Run migrations |
| A1.4 | Create base layout with phase navigation | Top progress bar showing phases (1 → 2 → 5). Phase indicator is clickable. Wrap in auth (must be logged in) |

**Deps:** None — this is the foundation.

### A2: Phase 1 — Intake

**Tasks:**

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| A2.1 | Build two-panel layout (chat left 1/3, summary right 2/3) | Responsive. Chat panel collapsible. Uses Nuxt UI components |
| A2.2 | Integrate chat panel with `crouton-ai` `useChat()` | Messages stream in real-time. System prompt includes Phase 1 context. Conversation stored in component state (not DB — resets on phase change) |
| A2.3 | Define `set_app_config` AI tool | Tool schema with typed parameters (name, description, appType, multiTenant, authType, languages, defaultLocale, packages). AI can call it, app receives structured data |
| A2.4 | Build editable summary card | Displays app config fields. Each field is click-to-edit (inline UInput/USelect). Changes sync to Projects collection in DB. AI tool calls also update the card |
| A2.5 | Build system prompt for Phase 1 | Includes: role definition, what to extract, opinionated defaults, available app types, available packages, output format. Includes current project state from DB |
| A2.6 | Add "Continue to Collection Design" transition | Button appears when minimum config is set (name + appType). Saves project state, resets chat, navigates to Phase 2 |

**Deps:** A1 complete.

### A3: Phase 2 — Collection Design

**Tasks:**

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| A3.1 | Build accordion collection editor component | Expandable accordion per collection. Shows collection name, field count badge, expand to see fields. "Add Collection" button at top |
| A3.2 | Build field list inside accordion | Each field shows: icon (from field type), name (editable inline), type (dropdown), required badge, reference target link. "Add Field" button at bottom. Delete button per field |
| A3.3 | Build field type dropdown | Lists all Crouton field types with icons. For `reference` type, shows secondary dropdown to pick target collection. Uses `useFieldTypes()` registry (ported from v1) |
| A3.4 | Build inline field editing | Click field name → inline UInput. Click field type → dropdown. Toggle required. **Inline meta** (always visible): `required`, `unique`, `label`, `area` (main/sidebar/meta). **Expandable meta panel** (click "more" chevron): `maxLength`, `default`, `translatable`, `group`, `displayAs`, `options`/`optionsCollection`. **Reference-specific**: `refTarget` dropdown (always visible for reference type), `readOnly`, `dependsOn` chain. **Omitted from UI** (AI-only or advanced): `component`, `primaryKey`, `precision`/`scale`, `repeater properties` — these are set via chat |
| A3.5 | Implement drag-to-reorder fields | Within a collection accordion. Updates field order in DB. Visual drag handle |
| A3.6 | Define Phase 2 AI tools | 7 tools: `create_collection`, `update_collection`, `delete_collection`, `add_field`, `update_field`, `delete_field`, `reorder_fields`. Each with typed parameters. App processes tool calls and updates DB + UI |
| A3.7 | Build system prompt for Phase 2 | Includes: role, field type reference table, meta properties, current collections state (from DB as JSON), instructions for opinionated proposals, package suggestion hints. Reuse structure from v1's `useSchemaAI()` |
| A3.8 | Wire AI tool calls to accordion UI | When AI calls `create_collection`, accordion animates open with new collection. When AI calls `add_field`, field appears with highlight animation. Deletions show briefly then remove. Borrow animation tracking from v1 |
| A3.9 | Implement continuous validation | Deterministic checks on every change: duplicate field names, missing reference targets, reserved names, empty collections. Show red indicators inline on affected fields/collections |
| A3.10 | Auto-generate initial proposal on Phase 2 entry | On entering Phase 2, send an automatic AI message: "Based on the app config, propose an initial set of collections." AI responds with tool calls that populate the accordion |
| A3.11 | Add "Continue to Review" transition | Button always visible. Validation warnings shown but not blocking. Saves state, resets chat, navigates to Phase 5 |

**Deps:** A1 + A2 complete (needs project config from Phase 1).

### A4: Phase 5 — Validation & Generation

**Tasks:**

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| A4.1 | Build validation checklist component | Runs all deterministic checks from A3.9. Displays as a list with green checkmarks / red X indicators. Shows specific error messages with links to the affected collection/field |
| A4.2 | Build generation summary view | Shows: app name, app type, number of collections, total fields, selected packages. Expandable list of collections with their fields |
| A4.3 | Implement schema JSON export | Converts DB state (Projects + Collections + Fields) into the JSON format expected by `crouton-cli`. One `.json` file per collection |
| A4.4 | Implement schema export + download | Export schemas as a downloadable ZIP (JSON files per collection). The developer runs `crouton generate` locally with the downloaded schemas. This avoids the Cloudflare Workers limitation (no shell exec). Display download link + copy-pasteable CLI command. Future: direct CLI invocation via a local dev companion |
| A4.5 | Add "Generate" button | Disabled if critical validation errors exist. On click: export schemas → download ZIP + show CLI instructions. Includes copy-pasteable `crouton generate --from ./schemas/` command |

**Deps:** A1 + A3 complete.

### A5: Integration & Polish

**Tasks:**

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| A5.1 | Wire backward navigation with preserve/warn | Phase 5 → Phase 2: no action needed (editing collections directly). Phase 2 → Phase 1: preserve all collections, show warning banner that config changes (e.g., switching from multi-tenant to single-tenant) may require manual schema adjustments. No cascade delete in Phase A (only applies to Phase B+ generated data like seeds/views) |
| A5.2 | Add project list page | List all projects for the current user. Click to resume. Delete project button. "New Project" button |
| A5.3 | Persist chat messages per phase | Store Phase 1 and Phase 2 chat history in a `messages` JSON column on the Projects collection (one array per phase). Chat is restored when user navigates back to a previous phase. On forward transition, new phase starts with empty chat but previous phases retain their history |
| A5.4 | Add AI error handling and fallback UX | Retry button on failed AI calls. Error toast with "try again" action. Phase 1: manual form fallback if AI is unavailable (pre-filled UForm with all config fields). Phase 2: accordion works fully without AI (direct manipulation is the primary surface). Graceful handling of malformed tool calls (log + ignore, don't crash) |
| A5.5 | Test resumability (close browser, reopen project) | Open a project, progress to Phase 2 with collections, close the browser. Reopen → project list → click project → lands on correct phase with all state intact. Chat history restored for the current phase |
| A5.6 | Run typecheck and fix errors | `npx nuxt typecheck` passes with zero errors |
| A5.7 | Manual end-to-end test | Create a project → describe an app → design 3+ collections with the AI → validate → generate → download ZIP → run CLI locally → verify output is correct |

**Deps:** A1–A4 complete.

### Task Dependency Graph

Tasks connected with `║` can run in parallel. Tasks connected with `──` are sequential.

```
A1: Scaffolding (sequential)
A1.1 ── A1.2 ── A1.3 ── A1.4

A2: Phase 1 (partially parallel)
         ┌── A2.1 (layout) ──┐
A1.4 ──┤                      ├── A2.5 (system prompt) ── A2.6 (transition)
         ├── A2.2 (chat) ─────┤
         ├── A2.3 (AI tool) ──┤
         └── A2.4 (summary) ──┘
         ║ parallel group ║

A3: Phase 2 (two parallel tracks, then merge)
         ┌── A3.1 ── A3.2 ── A3.3 ── A3.4 ── A3.5 ──┐
A2.6 ──┤                                               ├── A3.10 ── A3.11
         └── A3.6 ── A3.7 ─────────────────────────────┘
         ║  UI track  ║          ║  AI track  ║
                              A3.8 (wire) needs both tracks
                              A3.9 (validation) needs UI track

A4: Phase 5 (partially parallel)
          ┌── A4.1 (validation UI) ──┐
A3.11 ──┤                            ├── A4.5 (generate button)
          ├── A4.2 (summary view) ───┤
          └── A4.3 (JSON export) ── A4.4 (download ZIP) ──┘
          ║ parallel group ║

A5: Integration (mostly parallel after A4)
          ┌── A5.1 (backward nav) ──┐
A4.5 ───┤── A5.2 (project list) ───┤── A5.6 (typecheck) ── A5.7 (e2e test)
          ├── A5.3 (chat persist) ──┤
          ├── A5.4 (AI errors) ─────┤
          └── A5.5 (resumability) ──┘
          ║ parallel group ║
```

### Estimated Task Count

| Section | Tasks | Scope |
|---------|-------|-------|
| A1: Scaffolding | 4 | Package + app + collections + layout |
| A2: Phase 1 | 6 | Chat + summary card + AI tools |
| A3: Phase 2 | 11 | Accordion editor + AI tools + validation |
| A4: Phase 5 | 5 | Validation + export + download |
| A5: Integration | 7 | AI errors + resumability + project list + testing |
| **Total** | **33** | |

### What's Explicitly Out of Scope for Phase A

- CroutonFlow graph visualization (Phase B)
- Seed data generation (Phase B)
- Detail view design (Phase C)
- Nuxt UI component preview (Phase C)
- Package manifest system (Phase D)
- Undo/redo (Phase D)
- Project templates (Phase D)
- Onboarding / tutorial flow
- Mobile-optimized layout
- Collaborative editing
- Export to GitHub / download as zip
