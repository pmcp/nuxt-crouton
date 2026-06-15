# Atelier Builder Plan

## What we're building

Evolve `crouton-designer` from a schema-design chat wizard into a visual app builder. The user flow:

1. **Pick a template** (or start blank)
2. **Compose with blocks** — each block maps to a package capability, each has a visibility level
3. **Preview** — see what the public sees, what a member sees, what an admin sees
4. **Automations** — toggle "when X happens, do Y" rules
5. **Scaffold** — generate the Nuxt app

The designer's existing infrastructure (AI chat, collection CRUD, schema export, scaffold endpoint) stays. We're adding a layer on top: blocks → schemas → generation.

## Starting point

The current designer has 5 phases:
1. Intake (AI extracts app config)
2. Collection Design (AI + manual CRUD of collections/fields)
3. Seed Data (AI generates sample data)
4. _(skipped)_
5. Review & Create (validation + scaffold)

The builder replaces phases 1-2 with block-based composition. Phases 3 and 5 remain useful. The AI chat shifts from "design my schema" to "help me customise this block" or "describe something custom."

## Core concepts

### Blocks

A block is a unit of functionality that maps to one or more collections + a presentation. Blocks are defined in a registry, not hard-coded.

```typescript
interface Block {
  id: string                          // e.g. "schedule"
  label: string                       // e.g. "Class schedule"
  description: string                 // e.g. "Sessions people can book"
  icon: string                        // emoji or icon class
  package: string                     // which crouton package provides this
  visibility: 'public' | 'auth' | 'admin'  // default visibility
  collections: string[]              // schemas this block needs (from package)
  hints?: Record<string, SchemaHints> // $list, $card hints per collection
  customComponent?: boolean           // designer writes Vue for this
  category: 'content' | 'data' | 'interaction' | 'member' | 'admin'
}
```

Examples:
- `{ id: "schedule", package: "bookings", visibility: "public", collections: ["bookings", "locations"] }`
- `{ id: "my-bookings", package: "bookings", visibility: "auth", collections: [] }` (reuses same collections, different view)
- `{ id: "manage-contacts", package: "auth", visibility: "admin", collections: [] }` (member list view)
- `{ id: "hero", package: "pages", visibility: "public", collections: [] }` (pure content, no collection)

### Block registry

Populated from package manifests. Each package declares what blocks it provides:

```typescript
// In crouton-bookings manifest
blocks: [
  { id: "schedule", label: "Class schedule", visibility: "public", ... },
  { id: "book-now", label: "Book now", visibility: "public", ... },
  { id: "my-bookings", label: "My bookings", visibility: "auth", ... },
  { id: "manage-bookings", label: "Manage bookings", visibility: "admin", ... },
]
```

The builder reads this registry. Adding a block to the app enables its package automatically.

### Custom blocks

The user describes something that doesn't exist in the registry. The AI (Designer role) produces:
- A schema for any new collections needed
- Hints or custom Vue components
- The block gets added to the app's local block registry

This is where the Architect/Designer/Analyst/Editor pipeline from `atelier-generation-flow.md` lives — not as a separate system, but as the handler for "Something else" blocks.

### Visibility

Every block has a visibility level: `public`, `auth`, or `admin`. The builder preview toggles between these views. The generated app uses auth state to show/hide.

Implementation: blocks render inside route middleware or `v-if="isAuthenticated"` / `v-if="isAdmin"` guards. The pages package already has page types; visibility becomes a property on page types.

### Templates

Pre-configured block sets for common use cases:
- Yoga studio: hero + schedule + team + signup (public) | my-bookings (auth) | manage-bookings + manage-contacts (admin)
- Sports club: hero + schedule + contact-form (public) | my-bookings + my-invoices (auth) | manage-all (admin)
- Charity: hero + text + contact-form + team (public) | manage-contacts + manage-invoices (admin)
- Blank: empty

Templates are JSON. They reference block IDs and set identity (name, description). Applying a template populates the block list and auto-selects packages.

### Automations

Predefined rules that map to `crouton:mutation` hooks + `crouton-events`:
- "When someone books a class → send confirmation email" (bookings + email)
- "When new sign-up → add to contacts" (forms + auth)
- "When invoice overdue 7 days → send reminder" (invoicing + email)

Each automation declares which packages it requires. Only automations whose packages are active (via blocks) are shown. Toggle on/off.

Implementation: automations are config entries that the generated app's event listener picks up. The `crouton-events` plugin already subscribes to `crouton:mutation`. Automations add conditional handlers.

## Implementation phases

### Phase A: Block registry + templates (foundation)

**Goal**: Replace the intake phase with template selection + block composition.

1. **Define block type and registry** — `packages/crouton-designer/app/types/blocks.ts`
2. **Add block declarations to package manifests** — Start with bookings, pages, auth. Each declares its blocks with id, label, icon, description, visibility, collections, category.
3. **Build the template data** — `packages/crouton-designer/app/data/templates.ts`. JSON definitions for yoga, sports club, charity, blank.
4. **Template selection page** — New Vue component replacing Phase 1. Pick a template → populates blocks + identity.
5. **Block composition page** — New Vue component. Add/remove/reorder blocks. Filter by visibility tab (public/auth/admin). Show which packages are auto-enabled.
6. **Block detail view** — Clicking a block card opens a detail panel showing: collection settings, field types, seed data configuration. This is the manual editing UX — users can inspect and tweak what each block produces without AI.
7. **"Something else" flow** — When user adds a custom block: name + description → stored as custom block. AI processes it later.
7. **Wire to existing schema export** — Blocks → required collections → schema files. The `useSchemaExport` composable gets an input adapter that converts block selections to collection definitions.

**Outcome**: The user can pick a template, add/remove blocks, see which packages are enabled. No AI chat needed for standard blocks. Custom blocks get queued for AI.

### Phase B: Preview

**Goal**: Show a realistic preview of what the app will look like.

1. **Preview renderers per block** — Each block ID maps to a preview component. Simple: static mock data like the prototype. Complex blocks (schedule, manage-contacts) use realistic fake data.
2. **Visibility switcher** — Toggle between public / auth / admin views. Filters blocks by visibility level.
3. **Identity in preview** — App name, description reflected in hero, nav.
4. **Preview page** — Replaces the current Phase 3 seed data view (seed data generation moves to scaffold time).

**Outcome**: User can see what their app looks like before generating it.

### Phase C: Custom blocks + AI (Architect + Designer)

**Goal**: Handle "Something else" blocks via the Architect/Designer pipeline.

1. **Custom block AI prompt** — When the user describes a custom block, the Architect:
   - Determines if it needs new collections or can reuse existing
   - Produces schemas for new collections
2. **Integrate with existing collection design** — Custom block schemas feed into `useCollectionEditor` (the Phase 2 infrastructure stays, it just gets invoked differently)
3. **Designer pass** — After schemas are ready, the Designer adds presentation hints ($list, $card) or flags for custom component generation. Invoked only for custom blocks.

**Outcome**: User can add custom blocks that get AI-designed schemas and components. Standard blocks skip AI entirely.

### Phase C.5: Visualizations + AI (Analyst)

**Goal**: Create meaningful data visualizations from domain collections + available packages.

1. **Analyst context** — The Analyst receives: collection schemas (field shapes, relationships), available visualization packages (crouton-charts, crouton-maps).
2. **Chart presets** — If crouton-charts is installed, create chart configurations: time series from date fields, distributions from status/category fields, aggregations from numeric + grouping fields.
3. **Map configs** — If crouton-maps is installed, create collection map configurations for collections with address/coordinate fields.
4. **Registration** — Generated chart presets and map configs are registered as editor blocks in the generated layer's app.config, available to the page editor and the Editor AI.

**Outcome**: The app ships with meaningful, domain-specific visualizations. An admin page can show "Booking Trends" and "Revenue by Location" instead of a generic empty chart.

### Phase C.6: Page composition + AI (Editor)

**Goal**: Generate page layouts from selected blocks + Analyst visualizations.

1. **Editor context** — The Editor receives: app composition (selected blocks + visibility), available editor blocks (from manifests + Analyst output), collection view styles (from Designer hints + CLI defaults).
2. **Page composition** — The Editor outputs TipTap JSON per page:
   - Public landing: hero → visual collection blocks → CTA
   - Member dashboard: personal data → discovery
   - Admin overview: Analyst charts → data tables
3. **User editing** — Generated pages load in the `crouton-pages` editor. The user can rearrange, add, or remove blocks. The Editor gives them a good starting point, not a locked layout.

**Outcome**: Generated apps ship with composed pages, not blank canvases. The user edits from a designed starting point.

### Phase D: Automations (DEFERRED)

> Parked for now. The automation concept (event-driven rules tied to active packages) is valid but not needed for the initial builder. Revisit once A–C and E are shipped.

~~**Goal**: Expose automation toggles.~~

### Phase E: Scaffold integration

**Goal**: Wire blocks → schemas → CLI → deployed app. Generated layers are first-class packages.

1. **Block-to-schema mapper** — Convert selected blocks → required collections → schema JSON files. Package-provided collections come from manifests. Custom block collections come from AI.
2. **Hint injection** — Add $list, $card, $form hints to schemas based on block definitions. This requires the CLI hint system to be working (Priority #1 in strategy).
3. **Visibility config** — Generate route middleware or page metadata that encodes visibility rules.
4. **app.config generation** — The pipeline generates `layers/[domain]/app/app.config.ts` that registers everything: `croutonApps` (admin routes, page types), `croutonBlocks` (collection views, chart presets from Analyst, map configs). Generated layers register the same way packages do — the page editor, sidebar, and page tree discover them identically.
5. **Analyst pass** — If visualization packages are present (charts, maps), the Analyst creates pre-configured editor blocks from the generated collections and registers them in `app.config.ts`.
6. **Editor pass** — The Editor composes TipTap page content from all available blocks (built-in + Analyst-generated) and writes page records.
7. **Reuse existing scaffold** — The `scaffold-app.post.ts` endpoint stays. It receives richer input (schemas with hints, visibility metadata, app.config registration) but the core process is the same.

**Outcome**: "Build this app" button generates a working Nuxt app where generated domains are indistinguishable from installed packages. Collection views, charts, and maps are available as editor blocks. Pages are pre-composed, not blank.

## What changes in the designer package

| Current | Becomes |
|---|---|
| Phase 1: AI intake chat | Template selection + identity form |
| Phase 2: AI collection design | Block composition (standard) + AI (custom blocks only) |
| Phase 3: AI seed data | Moves to scaffold time (auto-generated) |
| Phase 4: (skipped) | Preview |
| Phase 5: Review + scaffold | Automations + scaffold |

The Atelier is a **standalone package** (`crouton-atelier`) extending `crouton-core` directly — not crouton-designer. The designer's AI/phase infrastructure is too coupled to reuse. When Phase E lands, the scaffold endpoint can be called via `$fetch` or shared utilities (`useSchemaExport`, `useFieldTypes`) extracted to crouton-core.

The designer package remains available for AI-first workflows. Atelier is the visual-first alternative.

## Dependencies

- **CLI hint system** — Blocks produce hints ($list, $card). The CLI must consume them. This is Priority #1 and must land first.
- **Block declarations in manifests** — Packages need to declare their blocks. This is a manifest schema extension.
- **Visibility metadata** — crouton-pages needs a visibility property on page types. May need route middleware generation in the CLI.

## Sequence

```
Priority #1: CLI hint system (active work)
    ↓
Phase A: Block registry + templates + block detail view (foundation)
    ↓
Phase B: Preview
    ↓
Phase C: Custom blocks + AI (Architect + Designer)
    ↓
Phase C.5: Visualizations + AI (Analyst)
    ↓
Phase C.6: Page composition + AI (Editor)
    ↓
Phase E: Scaffold integration

(Phase D: Automations — deferred)
```

Phases A and B are independent of the AI pipeline. They can ship as a purely visual, non-AI builder that works with standard blocks. Phases C, C.5, and C.6 add the four AI roles (Architect designs data, Designer creates components, Analyst creates visualizations, Editor composes pages). Phase E wires to generation. This means the builder is useful before the full pipeline is complete.
