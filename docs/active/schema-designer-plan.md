# Schema Designer — High Level Plan

## Overview

The Schema Designer is an AI-guided application that helps developers scaffold full Nuxt Crouton applications through a conversational interface. Instead of manually writing collection JSONs and configuring packages, the developer is walked through a structured flow where the AI asks the right questions, visualizes decisions in real-time, and ultimately passes everything to the Crouton CLI for code generation.

The key principle: the output is always code. The developer owns it, can modify it, and is never locked into the designer. The Schema Designer is a starting point accelerator, not a no-code platform.

The AI operates within strong guardrails — the Crouton system, Nuxt UI component library, and existing package ecosystem constrain what can be generated, which makes AI output more reliable and predictable.

---

## User Flow

### Phase 1 — App Setup & Intake

**Purpose:** Establish the foundational decisions that affect everything downstream.

**What happens:**
The AI opens with a structured intake conversation. This is partly fixed (always asks certain things) and partly adaptive (follows up based on answers). The goal is to collect all the high-level decisions before diving into collections.

**Key questions the AI should cover:**
- What is the app called? Short description?
- Is this a multi-tenant app? Does it need teams/organizations?
- Does it need authentication? What kind — email/password, OAuth, both?
- What languages should the app support? What is the default language?
- Any specific Crouton packages the developer already knows they want?
- What is the general nature of the app — internal tool, SaaS, CMS, content app, project management, etc.?

**What the user sees:**
- Chat on the left side of the screen
- On the right, a summary card that fills in as decisions are made — app name, selected features, languages, etc.
- The summary card is editable — the user can click into it and change things directly without going back through chat

**Output of this phase:**
An app config object that captures all foundational decisions. This gets passed forward to every subsequent phase and ultimately to the CLI.

---

### Phase 2 — Collection Design

**Purpose:** Define the data model — what entities exist, what fields they have, how they relate to each other.

**What happens:**
The AI helps the developer define collections one by one. It asks about each collection's purpose, suggests fields based on the description, and helps define relationships between collections. The AI should be opinionated here — if someone says "I need a blog," the AI should suggest a posts collection with title, slug, content (rich text), author (relation to users), published date, status, and tags, rather than asking about every field individually.

**Key interactions:**
- Developer describes a collection in natural language ("I need tasks that belong to projects and are assigned to users")
- AI proposes a full collection schema with field names, types, and relationships
- Developer confirms, modifies, or rejects
- AI asks follow-up questions if things are ambiguous (e.g., "Should tasks have priorities? Deadlines? Subtasks?")
- When relationships are detected, AI visualizes them and confirms the direction (e.g., "A project has many tasks, a task belongs to one project — correct?")

**Package suggestions:**
Throughout this phase, the AI should recognize patterns and suggest relevant packages. For example:
- If a collection has a "content" field with rich text → suggest the TipTap/editor package
- If collections look like pages with slugs and nested structures → suggest the CMS/pages package
- If the user mentions real-time editing or collaboration → suggest the collab package (Yjs)
- These suggestions are non-intrusive — shown as cards or inline suggestions, not blocking the flow

**What the user sees:**
- Chat on the left (1/3 of screen)
- On the right (2/3), a visual overview of all collections — could be a simple entity-relationship diagram or a card-based layout showing each collection with its fields
- Collections are clickable/expandable to see full field details
- Relationships shown as lines/connections between collections
- The visual updates in real-time as the AI and user iterate

**Iteration:**
The user should be able to:
- Go back to any collection and modify it
- Ask the AI to add fields or change types
- Directly edit the visual representation (click a field, rename it, change its type)
- Remove collections entirely
- Ask the AI "what am I missing?" for a sanity check

**Output of this phase:**
Collection JSON files for each entity, ready for the CLI. Relationship mappings between collections.

---

### Phase 3 — Seed Data Generation

**Purpose:** Generate realistic sample data so the developer can validate their schema and have something to design against in the next phase.

**What happens:**
After collections are defined, the AI generates seed data for each collection. This isn't random data — it should be contextually appropriate. If the app is a project management tool, the seed data should have realistic project names, task descriptions, and user names. If it's a recipe app, the data should have actual recipe-like content.

**Key interactions:**
- AI generates seed data automatically after collection design is confirmed
- Developer can ask for more entries, different data, or specific scenarios ("give me some tasks that are overdue")
- Seed data respects relationships — if a task belongs to a project, the seed data references actual seed projects

**What the user sees:**
- Each collection's seed data shown in a Nuxt UI table
- Tables are interactive — sortable, filterable
- Developer can manually edit seed entries inline if needed
- A "regenerate" button per collection to get fresh sample data

**Why this matters:**
- Validates the schema makes sense with real-ish data — sometimes you realize you're missing a field only when you see actual entries
- Provides the foundation for Phase 4 — designing detail views is much easier when you have data to render
- The seed file itself gets included in the generation output, so the developer has sample data from day one

**Output of this phase:**
Seed data files per collection that get passed to the CLI.

---

### Phase 4 — Detail View Design

**Purpose:** Design how individual items look when viewed — the detail/show page for each collection.

**What happens:**
This is the most design-oriented phase. The Crouton CLI already generates forms and lists automatically, but detail views require more intentional design because layout, hierarchy, and visual presentation matter. The AI generates a detail view based on the schema and seed data, and the developer can iterate on it.

**Key interactions:**
- AI proposes a detail view layout based on the collection's fields and their types
- The AI is smart about this — it knows an image should be prominent, a title should be large, a description comes below, metadata (dates, status, tags) goes in a sidebar or header, related items get their own section
- Developer can ask for changes ("move the image to full-width at the top," "put the metadata in a sidebar," "add a section for related tasks")
- Developer can also directly edit the generated code

**What the user sees — three-panel layout:**
- **Left (1/3):** Chat with the AI — for requesting changes, asking questions
- **Center (1/3):** Code editor showing the generated Vue template — developer can edit directly
- **Right (1/3):** Live preview rendering the detail view with seed data

**Yjs integration:**
The code editor and AI share state through a Yjs document (using the existing collab package). This means:
- When the developer edits code manually, the AI is immediately aware of the current state
- When the AI generates or modifies code, the editor updates in real-time
- No need for explicit "sync" actions or re-reading files — the shared document is the source of truth
- The AI can comment on or react to manual changes ("I see you removed the sidebar — want me to move the metadata into the header instead?")

**Guardrails:**
- All generated detail views use Nuxt UI components, keeping things consistent and professional
- The AI works within the Crouton component system — it doesn't generate arbitrary HTML
- The preview uses the app's actual Nuxt UI theme, so what you see is what you get

**Iteration:**
- Developer can switch between collections to design each detail view
- Changes to one detail view don't affect others
- Developer can ask the AI to make detail views consistent across collections ("use the same sidebar layout for all collections")

**Output of this phase:**
Vue component files for each collection's detail view, ready for the CLI.

---

### Phase 5 — Review & Generation

**Purpose:** Final review before generating the actual code.

**What happens:**
Before running the CLI, the developer gets a summary of everything that's been decided and designed. This is the last chance to make changes before code is generated.

**What the user sees:**
- Full summary: app config, all collections with their fields and relationships, selected packages, seed data stats, detail view previews
- Each section is expandable and editable — can still go back to any phase
- A clear "Generate" button that triggers the CLI

**After generation:**
- The CLI produces the full Crouton app — collections, forms, lists, detail views, auth, teams, translations, seed data, all configured
- The developer gets their code and takes it from there
- The Schema Designer's job is done

---

## UI Concept

### Layout Principles

The interface adapts based on the current phase:

- **Phases 1-3:** Two-panel layout — chat on the left (1/3), visual content on the right (2/3). The right panel shows the summary card (Phase 1), entity diagram (Phase 2), or seed data tables (Phase 3).
- **Phase 4:** Three-panel layout — chat (1/3), code editor (1/3), preview (1/3). This is the most space-hungry phase.
- **Phase 5:** Single-panel summary view with expandable sections.

### Navigation

- A progress indicator at the top shows which phase the user is in
- Phases are navigable — the user can click back to any completed phase
- Going back doesn't destroy work done in later phases, but changes may trigger the AI to suggest updates downstream (e.g., adding a field in Phase 2 → AI suggests updating the detail view in Phase 4)

### Responsiveness

- The three-panel layout in Phase 4 is the tightest — consider allowing panels to collapse or offering a tab-based alternative for smaller screens
- Chat panel should be collapsible in all phases when the user wants more space for the visual content

---

## Package Ecosystem Integration

Crouton packages are a core part of the value proposition. The Schema Designer should integrate them throughout:

- **During intake:** Ask about known needs (teams, auth type, languages)
- **During collection design:** Suggest packages based on patterns the AI recognizes
- **During detail view design:** If a package adds UI components (e.g., the collab package adds presence indicators), the AI should know about them and offer to include them
- **Package catalog:** The user should be able to browse available packages at any point — maybe a sidebar or modal that lists what's available with short descriptions
- **Growing ecosystem:** As you build more apps and extract more packages, they automatically become available in the Schema Designer for future projects

---

## Iterative Design Philosophy

The entire flow should feel iterative, not linear. Key principles:

- **No dead ends:** The user can always go back and change things
- **AI remembers context:** If the user changes something in Phase 2, the AI should flag potential impacts on Phase 4
- **Seed data as validation:** The seed data phase exists specifically to catch schema problems before investing time in detail view design
- **Progressive disclosure:** Don't overwhelm the user upfront — start simple, add complexity as needed
- **Developer escape hatch:** At any point, the developer can just take what's been generated so far and run with it. The Schema Designer doesn't need to be completed end-to-end to be useful

---

## Priorities & Phasing

### Phase A — Foundation (Build First)
- Intake conversation (Phase 1)
- Collection design with AI (Phase 2)
- CLI integration — generate app from intake + collections
- Basic two-panel UI (chat + visual)

### Phase B — Validation Layer
- Seed data generation (Phase 3)
- Nuxt UI table display for seed data
- Ability to regenerate and edit seed data
- Pass seed data to CLI

### Phase C — Detail View Design
- Three-panel layout (chat + editor + preview)
- AI-generated detail views from schema + seed data
- Yjs integration for shared editor state between AI and user
- Live preview with Nuxt UI components

### Phase D — Polish & Ecosystem
- Package suggestion engine throughout the flow
- Navigation between phases with downstream impact detection
- Summary/review phase before generation
- Collapsible panels, responsive layout improvements
