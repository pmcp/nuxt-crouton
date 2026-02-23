# Atelier Strategy

## What nuxt-crouton is

A monorepo with 22 packages that generates full-stack Nuxt applications from JSON schemas. A CLI reads schema definitions and produces Drizzle database schemas, typed API endpoints, Vue components, composables, and TypeScript types. Packages extend the framework as Nuxt layers, discovered at build time through a manifest system. At runtime, a hook-based event system enables cross-package communication.

The framework is production-ready for the developer workflow: define a schema, run the CLI, get a working CRUD app. The booking system, email automation, real-time collaboration, POS, and triage system all work.

Tech stack: Nuxt, Drizzle ORM, SQLite, Better Auth, NuxtHub, Nuxt UI, Tailwind CSS.

## What Atelier is

Atelier is not a separate product. It's what nuxt-crouton becomes when the audience shifts from developers to the organisations they serve.

Today, a developer uses nuxt-crouton to build an app for a community center. Tomorrow, Atelier is the product where that community center describes what they need and gets a working app — or where the developer builds it faster because the framework handles more.

The core loop stays the same: schema defines shape → Architect designs the model → Designer creates the components → CLI generates code → Analyst creates visualizations → Editor composes the pages → packages extend functionality. What changes is who initiates it and how much is automated.

## Two audiences

**Developers** use nuxt-crouton as a framework. They write schemas, run the CLI, extend packages, customise generated code. The docs site at nuxt-crouton.dev serves them. This audience exists today.

**Organisations** use Atelier as a product. They describe what they need, four AI roles design, analyse, build, and compose it, and they get a working app. They don't see schemas or CLI commands. This audience is the goal but doesn't exist yet.

Both audiences use the same underlying system. The difference is the interface layer on top.

## The generation pipeline

Four AI roles turn a conversation into a deployed application:

**Architect** — talks to the user, understands the domain, designs the data model. Outputs JSON schemas and seed data. Has full project context: what collections exist, what packages are installed, what relationships are in play.

**Designer** — reads the schemas and decides how each collection should present itself. Component-level decisions. Two modes: adds simple layout hints (`$list`, `$form`, `$card`) for the CLI to interpret, or writes custom Vue components when the domain demands it (calendars, embedded flows, domain-specific interactions). Has the same project context.

**Analyst** — reads the schemas and the available visualization packages (charts, maps) and creates meaningful data visualizations. Bridges domain data with addon capabilities. Outputs pre-configured editor blocks: chart presets ("Booking Trends", "Revenue by Location"), map configurations ("All Locations"), dashboard widgets. These become available as editor blocks that the Editor can place on pages. Only runs when visualization packages are present.

**Editor** — composes pages from the available components. Page-level decisions. Knows what editor blocks are available (from package manifests + Analyst output), what collection view styles exist (from Designer hints + CLI output), and what visibility context each page serves (public landing vs. member dashboard vs. admin panel). Outputs TipTap JSON — the actual page content that `crouton-pages` renders and the user can later edit.

**CLI** — reads the schemas (with hints) and generates everything the Designer didn't touch: composables, types, API routes, database schema, standard components.

The pipeline is sequential: Architect outputs schemas → Designer creates/hints components → CLI generates the rest → Analyst creates visualizations from the data + available packages → Editor composes pages from all available pieces. One script orchestrating four AI calls and a CLI command. No orchestration framework needed.

See `atelier-generation-flow.md` for the full technical spec with examples.

## Architecture decisions

### Members are contacts

Auth already manages users, teams, and members. A member is a user who belongs to a team with a role. When someone books an event, they become a member with a "customer" role. They don't need a password — magic links or scoped access handle login when needed.

This means no separate contacts package. Bookings creates a member on first booking. Invoicing references the same member. Email history ties to the member. Logged-in pages show "my bookings," "my invoices" — all the same identity.

The identity spectrum has two tiers:

- **Persistent**: anonymous → member with customer role (known, can log in via magic link) → member with admin role (full access). One entity in the auth system.
- **Ephemeral**: scoped access tokens for helpers/volunteers. No user account, no member record. A display name and a time-limited token scoped to one resource (e.g., a POS event). Designed for temporary access on shared devices. These people don't become contacts — they're transient by design.

CRM-like features — tags, notes, activity timeline — are fields on the member profile or views over existing data (crouton-events already captures every mutation). Not worth a separate package.

### Capabilities matter, but not yet

The vision of packages relating through abstract capabilities ("contactable," "bookable") instead of hard-coded names is architecturally sound. But premature to build now.

What exists today works: bookings references locations by name, email checks a runtime config flag, the manifest system declares what each package provides. The bookings email integration already demonstrates the graceful degradation pattern (dynamic imports, feature detection, fallback behavior).

The capability system becomes necessary when a third-party package needs to reference something without knowing what's installed, or the builder UI needs to wire packages together dynamically. Until then, existing patterns are sufficient. When needed, the manifest system is the right place to add `requires` and `provides` fields. The infrastructure is ready; the abstraction can wait.

### One app, visibility controls what's shown

There are no separate surfaces. There's one app. Blocks and pages have visibility rules:

- **Public** — everyone sees it (hero, schedule, contact form)
- **Authenticated** — logged-in members see it (my bookings, my invoices, profile)
- **Admin** — team admins see it (manage bookings, manage contacts, all invoices)

The public site IS the app. When you log in, more pages and blocks appear. Auth modals handle login inline. No separate member portal, no separate admin app (admin routes exist but they're part of the same deployment). The app feels like an app.

In the builder, users compose one app by adding blocks. Each block has a visibility level. The builder shows a preview that switches between "what the public sees," "what a member sees," and "what an admin sees" — same app, different auth state.

"Contacts" in the builder maps to auth members. The builder says "All contacts" but under the hood it's a member list view.

### Generated layers are packages

A generated layer is indistinguishable from a real package at runtime. Whether the domain came from `crouton-bookings` (an npm package) or was generated from scratch by the AI pipeline (a layer in `layers/fundraiser/`), both produce the same artifacts:

- **Components**: List.vue, Detail.vue, Form.vue, Card.vue per collection
- **app.config.ts**: registers editor blocks (collection views, chart presets, map configs), admin routes, page types
- **Composables**: typed CRUD composables per collection
- **Server**: API routes, database schema, migrations
- **Types**: TypeScript definitions, Zod schemas

The generation pipeline produces all of this. The Architect creates the schema. The Designer creates the components (or hints for the CLI). The CLI generates infrastructure. The Analyst creates chart presets and map configs. The Editor composes pages. The generated layer's `app.config.ts` registers everything — collection views as editor blocks, Analyst visualizations as chart presets, admin routes — so the page editor discovers them the same way it discovers blocks from `crouton-charts` or `crouton-maps`.

No manifest file is needed for generated layers. The `app.config.ts` registration is the runtime equivalent. Manifests are for packages that ship as npm modules and need build-time discovery. Generated layers are already part of the app — they register directly.

This is principles 4 and 12 in action: "Generate → Customise → Own" and "Everything lands in layers."

### Standard output covers most cases

Most collections work fine with standard table + form + detail output. The Designer only gets involved when a generic layout would feel wrong — calendars for time-based data, embedded forms for child records, domain-specific interactions like check-in lists.

Over time, the Designer's patterns become CLI defaults. Date + capacity → calendar. Image + name → grid. Child record never browsed standalone → embed in parent. The feedback loop is manual for now (developer observes patterns across projects, updates CLI), with a door open for automation when project volume justifies it.

## Package strategy

### Invest

| Package | Role |
|---|---|
| **crouton-core** | Foundation. Every improvement benefits every app. |
| **crouton-auth** | Identity, teams, members, scoped access. The "contact" system. |
| **crouton-bookings** | Most complete domain package. Proves the framework for real use cases. |
| **crouton-pages** | Public surface. Block editor. Page types. |
| **crouton-email** | Transactional email. Used by bookings, auth, future packages. |
| **crouton-designer** | AI pipeline backend. Being refactored into architect + designer + analyst + editor roles. |
| **crouton-cli** | Code generation engine. The core value of the framework. |
| **crouton-i18n** | Multi-language. Table stakes for European small orgs. |
| **crouton-ai** | Multi-provider AI. Powers architect, designer, translation. |
| **crouton-events** | Audit trail + mutation tracking. Foundation for CRM-like views. |

### Maintain

| Package | Status |
|---|---|
| **crouton-assets** | Media library. Works. |
| **crouton-editor** | Tiptap rich text. Works. |
| **crouton-maps** | Location fields, geocoding. Works. |
| **crouton-sales** | Event POS. Niche but complete. |
| **crouton-admin** | Super admin dashboard. Works. |
| **crouton-collab** | Real-time collaboration. Impressive, not critical for target users. |
| **crouton-flow** | Visual node graphs. Could become automation builder later. |
| **crouton-triage** | Discussion-to-task pipeline. Niche. |
| **crouton-mcp** | AI agent integration. Forward-looking. |
| **crouton-themes** | Theming. Fun, not critical. |
| **crouton-devtools** | Developer tooling. Works. |

### Build next

| What | Why |
|---|---|
| **Atelier builder** | Evolve crouton-designer into the block-based app builder. Template selection → block composition with visibility rules → preview → automations → scaffold. Lives inside crouton as a package. |
| **Invoicing** | Recurring billing, membership payments. Different from POS. References members. Covers the second most common need after bookings. |

## What the docs site needs

The docs at nuxt-crouton.dev are well-written for developers. The "Generate → Customise → Own" philosophy is clear. The gaps:

- `@friendlyinternet` scope → `@fyit` throughout
- SuperSaaS references removed
- Package docs expanded (13 documented vs 22 actual)
- Vision page explaining where the project is heading
- Roadmap reflecting strategic priorities (member area, invoicing, Atelier pipeline)
- Manifest and hook system documented (these are architectural differentiators)

The site doesn't need a rewrite. It needs completeness.

## The broader vision: Friendly Tools

Atelier serves a network of small organisations. One organisation's investment in building a tool makes it available to others. A community center pays for a custom events-and-registration setup; the patterns and components become available to every community center after that.

This creates shared development costs while maintaining individual ownership and branding. Each organisation owns their code, their data, their deployment. They benefit from the network through better CLI defaults, proven patterns, and an expanding package ecosystem.

Success means: a small organisation can affordably get exactly what they need without compromising on customisation or data ownership. No vendor lock-in, no subscription creep, no feature gaps because they're on the wrong tier.

## Priorities in order

1. **CLI + hint system** — the CLI is active work. Next feature: `$list`, `$card`, `$form` hints so the designer role can add layout decisions to schemas and the CLI acts on them. This is the bridge between the builder and generation.

2. **Atelier builder** — evolve crouton-designer into the block-based app composer. Template → blocks with visibility → preview → automations → scaffold. See `atelier-builder-plan.md` for the implementation plan.

3. **Docs cleanup** — scope migration, SuperSaaS removal, document all packages. The site is the first thing developers see.

4. **Invoicing** — recurring billing with member references. Bookings + invoicing covers the two most common needs.

5. **Capabilities when needed** — add `requires` and `provides` to manifests when the pipeline needs to wire packages dynamically.
