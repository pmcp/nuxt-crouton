# Atelier Strategy

## What nuxt-crouton Is

A monorepo with 25 packages that generates full-stack Nuxt applications from JSON schemas. A CLI reads schema definitions and produces Drizzle database schemas, typed API endpoints, Vue components, composables, and TypeScript types. Packages extend the framework as Nuxt layers, discovered at build time through a manifest system. At runtime, deep-merged `appConfig` and a hook-based event system enable cross-package communication.

Tech stack: Nuxt, Drizzle ORM, SQLite, Better Auth, NuxtHub, Nuxt UI 4, Tailwind CSS.

## What Atelier Is

Atelier is not a separate product. It's what nuxt-crouton becomes when the audience shifts from developers to the organisations they serve.

Today, a developer uses nuxt-crouton to build an app for a community center. Tomorrow, Atelier is the product where that community center describes what they need and gets a working app — or where the developer builds it faster because the framework handles more.

The core loop stays the same: schema defines shape → AI roles design the model, create components, generate visualizations → CLI generates code → pages get composed → packages extend functionality. What changes is who initiates it and how much is automated.

## Two Audiences

**Developers** use nuxt-crouton as a framework. They write schemas, run the CLI, extend packages, customise generated code. The docs site at nuxt-crouton.dev serves them. This audience exists today.

**Organisations** use Atelier as a product. They describe what they need, the generation pipeline designs, builds, and composes it, and they get a working app. They don't see schemas or CLI commands. This audience is the goal but doesn't exist yet.

Both audiences use the same underlying system. The difference is the interface layer on top.

## Principles

Use these to evaluate every feature, design decision, and priority call. If something violates a principle, it's wrong. If it serves several, it's right.

1. **The user describes what, never how.** They say "I need bookings." They never configure a database, write a query, or pick a component library.

2. **Everything connects by default.** Any package works alone. Any two packages work together. Adding a package never requires rewiring what's already there. Members are the connective tissue — bookings, email, invoicing, and the member area all reference the same identity through auth.

3. **The framework is the product. AI is the labour.** We build the rules. AI builds to the rules. Our value is the guarantee that generated output is compatible, not that it's generated fast.

4. **Generate → Customise → Own.** Every generated file belongs to the user. They can edit it, replace it, or keep it forever. The app doesn't know which files came from the CLI, the AI, or the user. Like Rails scaffolding — the scaffold gets you started, the code is yours.

5. **Schema carries everything.** The JSON schema is the single source of truth — data model, field metadata, layout hints. No separate configuration layer.

6. **Standard first, custom when it matters.** Most collections work fine with table + form + detail. Custom components only when the domain demands it. The test: would a user look at a generic table and think "this works" or "this doesn't feel right"?

7. **Packages, not features.** Every capability ships as a package. If it can't be installed, removed, or replaced independently, it's not designed right. Removing a package makes the app simpler, never broken.

8. **Opinionated for small organisations.** Community centers, clubs, charities, freelancers. A feature that makes sense for an enterprise but not for a 200-member club is a wrong feature.

9. **The CLI gets smarter, everyone does less.** Every project is a data point. Date + capacity → calendar. Image + name → grid. Status field → donut chart. Public page → hero first. Patterns are manual observations now, codified as CLI defaults over time.

10. **Open source framework, paid convenience.** The framework is free forever. Revenue comes from hosting, AI, and managed services. We never gate a capability behind payment — only the effort of running it yourself.

11. **Everything lands in layers.** Whether the CLI generated it or AI wrote it custom, files live in the same `layers/[domain]/` structure. No new conventions, no separate systems.

### Decision Filter

- **Does it serve a 200-member community center?** If not, it's probably too complex.
- **Can a non-technical person describe what they want and get it?** If they need to understand schemas, layers, or collections, the interface layer is incomplete.
- **Does the schema carry this, or does it need a new configuration surface?** If it can't live in the schema, question whether it's needed.
- **Is this a CLI default waiting to happen?** If the AI would make the same choice every time, it should be a CLI default instead.
- **Can I remove this package and the app still works?** If not, the dependency is too hard.
- **Does the generated file look like something a developer would write?** If the output needs immediate editing to be useful, the generator isn't good enough yet.

## The Generation Pipeline: Skills, Not UI

> **Status: PIVOTING.** The original plan called for a visual builder app (Atelier) with kanban canvas, drag-drop blocks, and a scaffold endpoint. That approach is superseded by a **skill chain** — Claude Code skills that do the same work through conversation instead of a custom UI. The Atelier UI phases (A-D in `atelier-plan.md`) are archived, not deleted, as reference for what the skills need to accomplish.

### Why skills instead of a builder app

The Atelier builder was a UI wrapper around the generation pipeline. Building it meant: kanban drag-drop, Yjs collab, block palette, template selector, scaffold panel, preview renderers — all custom UI for a flow that happens once per app. That's months of work for a tool used occasionally.

Skills accomplish the same thing:
- **Cheaper** — no UI, no state management, no components to maintain
- **More flexible** — natural language handles edge cases a kanban board can't
- **Already proven** — `/crouton` already generates collections from conversation
- **Iterative** — "make the schedule page public" is a follow-up prompt, not a UI redesign
- **Composable** — skills chain naturally, each one's output feeds the next

The user's interface is the conversation. The framework is still the product.

### The skill chain

Five skills turn a conversation into a deployed application:

```
/discover  → /architect  → /generate  → /compose  → /brand
```

**`/discover`** — Interviews the user about their organisation. What do you do? Who are your members? What do they need to do online? Outputs a structured brief: domain description, user roles, key workflows, package recommendations. The brief is a markdown file in `docs/briefings/`.

**`/architect`** — Takes the brief, designs the data model. Outputs JSON schemas, seed data, package selection, collection relationships. Understands what packages exist, what they provide, how they connect. Validates schemas against field types. Writes `crouton.config.js` and schema files.

**`/generate`** — Runs the CLI. Creates layers, collections, API routes, composables, types, database schema. Runs migrations. Seeds data. Verifies with typecheck. This skill already exists as `/crouton` — it just needs to accept architect output as input.

**`/compose`** — Builds pages from available components. Decides layout per page type: public landing → hero first, member dashboard → personal data first, admin → tables and charts. Outputs TipTap JSON for `crouton-pages`. Configures visibility rules (public/auth/admin). Uses visualization heuristics: date + count → time series, status → donut, address → map.

**`/brand`** — Applies identity: colors, logo, typography, tone of voice, language. Generates theme config, OG images, email templates. The least critical skill — can be manual initially.

### Visualization presets (deterministic, not a skill)

A function — not an AI role — that reads collection schemas and available packages (charts, maps), then generates pre-configured editor blocks using field-shape heuristics. Called by `/compose` as a subroutine, not a separate skill. Graduates to AI only when heuristics prove insufficient.

### What the Atelier package becomes

The `crouton-atelier` package still has value as a **project dashboard** — showing what's installed, what collections exist, what pages are live. But the *creation* flow moves to skills. The kanban canvas, block palette, and scaffold endpoint become unnecessary.

Existing Atelier work (block types, templates, composition types) becomes reference data for the `/discover` and `/architect` skills — they know what blocks are available and what templates have worked before.

## Architecture Decisions

### Members Are Contacts

Auth manages users, teams, and members. A member is a user who belongs to a team with a role. When someone books an event, they become a member with a "customer" role. Magic links or scoped access handle login when needed.

No separate contacts package. Bookings creates a member on first booking. Invoicing references the same member. Email history ties to the member.

The identity spectrum:
- **Persistent**: anonymous → member with customer role (known, can log in) → member with admin role (full access). One entity in the auth system.
- **Ephemeral**: scoped access tokens for helpers/volunteers. No user account, no member record. Time-limited, resource-scoped. Transient by design.

CRM-like features — tags, notes, activity timeline — are fields on the member profile or views over existing data (crouton-events captures every mutation).

> **Known limitation:** This conflates auth identity with contact identity. People on a mailing list, donors who never log in, or one-time event attendees don't fit cleanly into the member model. Revisit when invoicing or contact forms reveal the gap.

### Capabilities: Not Yet

The vision of packages relating through abstract capabilities instead of hard-coded names is architecturally sound but premature. The manifest system is the right place to add `requires` and `provides` fields when needed. Until then, existing patterns (dynamic imports, feature detection, fallback behavior) are sufficient.

### One App, Visibility Controls What's Shown

No separate surfaces. One app. Blocks and pages have visibility rules:
- **Public** — everyone sees it (hero, schedule, contact form)
- **Authenticated** — logged-in members see it (my bookings, my invoices, profile)
- **Admin** — team admins see it (manage bookings, manage contacts, all invoices)

The public site IS the app. When you log in, more pages and blocks appear.

> **Known limitation:** Three visibility tiers. Real apps may need role-based (instructor vs. member), group-based (youth vs. seniors), or temporal access. The block system is designed around exactly three levels. Adding more requires changes to types, kanban columns, preview switcher, and scaffold output.

### Standard Output Covers Most Cases

Most collections work fine with standard table + form + detail. The Designer only gets involved when a generic layout would feel wrong. Over time, the Designer's patterns become CLI defaults. The feedback loop is manual for now.

## Package Strategy

### Invest (Critical Path)

| Package | Role |
|---|---|
| **crouton-core** | Foundation. Every improvement benefits every app. |
| **crouton-auth** | Identity, teams, members, scoped access. The "contact" system. |
| **crouton-bookings** | Most complete domain package. Proves the framework. |
| **crouton-pages** | Public surface. Block editor. Page types. |
| **crouton-collab** | Real-time sync infrastructure. Powers Atelier, page editor, flow. |
| **crouton-email** | Transactional email. Used by bookings, auth, future packages. |
| **crouton-cli** | Code generation engine. The core value of the framework. |
| **crouton-i18n** | Multi-language. Table stakes for European small orgs. |
| **crouton-ai** | Multi-provider AI. Powers generation pipeline. |
| **crouton-editor** | TipTap rich text infrastructure. 5 components, variable system. |

### Maintain

| Package | Status |
|---|---|
| **crouton-assets** | Media library. 7 components. Works. |
| **crouton-maps** | Location fields, geocoding. 5 composables. Works. |
| **crouton-charts** | Collection data charts. Works. |
| **crouton-sales** | Event POS. 10 collections, 12 components. Complete. |
| **crouton-events** | Audit trail + mutation tracking. |
| **crouton-admin** | Super admin dashboard. Works. |
| **crouton-flow** | Visual DAG graphs with collab. |
| **crouton-triage** | Discussion-to-task pipeline. Niche. |
| **crouton-mcp** | AI agent integration. Forward-looking. |
| **crouton-themes** | Theming (KO hardware theme). |
| **crouton-devtools** | Developer tooling. Works. |

### Build Next

| What | Why |
|---|---|
| **Skill chain** | `/discover` → `/architect` → `/generate` → `/compose` → `/brand`. The generation pipeline as Claude Code skills. |
| **Invoicing** | Recurring billing, membership payments. References members. Second most common need after bookings. |

## The Broader Vision: Friendly Tools

Atelier serves a network of small organisations. One organisation's investment in building a tool makes it available to others. Patterns and components become shared across every similar organisation.

Each organisation owns their code, their data, their deployment. They benefit from the network through better CLI defaults, proven patterns, and an expanding package ecosystem.

## Strategy Docs Become AI Skills

Every strategy document follows the same shape: context, architecture, step-by-step file changes, verification. That's a skill definition. The convergence is intentional.

The manifest-driven block system illustrates this. The strategy doc (`atelier-editor-blocks-plan.md`) describes exactly what files to create, modify, and delete, in what order, with what content. Reformatting that into `.claude/skills/block.md` is mostly mechanical. The same applies to the generation pipeline, the server-side renderer, and future package scaffolding.

The loop:

```
Strategy doc (human designs the system)
    ↓
Skill definition (AI learns to operate the system)
    ↓
CLI default (the system operates itself)
```

Each cycle removes a manual step. Strategy docs capture the "how" once. Skills let AI execute the "how" repeatedly. CLI defaults eliminate the "how" entirely — the system just does it.

This means strategy docs should be written with skill conversion in mind:
- **Explicit file paths** — not "update the config" but "modify `packages/crouton-core/nuxt.config.ts`"
- **Declarative inputs/outputs** — what goes in, what comes out, what gets generated
- **Verification steps** — how to confirm it worked (typecheck, test, dev server check)
- **Decision boundaries** — when the AI should ask vs. proceed

The framework is the product. The strategy docs are the blueprint. The skills are the labour force.

## Priorities

1. **`/discover` + `/architect` skills** — The first two skills in the chain. `/discover` interviews, `/architect` designs schemas. These validate the approach end-to-end with a real app before investing in downstream skills.
2. **CLI + hint system** — `$list`, `$card`, `$form` hints. `/generate` (existing `/crouton` skill) needs these to produce better default layouts.
3. **`/compose` skill** — Page composition with visibility rules and visualization presets. Depends on `crouton-pages` being stable.
4. **Docs cleanup** — scope migration, document all packages. The site is the first thing developers see.
5. **Invoicing** — recurring billing with member references.
