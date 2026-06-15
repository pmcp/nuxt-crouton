# Atelier Generation Flow

## Four Roles, Shared Context

**Architect** — talks to the user, understands the domain, outputs schemas and seed data. Has full project context: what collections exist, what packages are installed, what relationships are in play.

**Designer** — receives schemas, decides how each collection should present itself. Component-level. Adds layout hints for the CLI or writes custom Vue components. Has the same project context so it keeps things consistent.

**Analyst** — receives schemas and knows which visualization packages are available (charts, maps). Creates meaningful data visualizations that bridge domain data with addon capabilities. Outputs pre-configured editor blocks: chart presets, map configurations, dashboard widgets. These get registered in the generated layer's manifest so the Editor and page editor can discover them. Only runs when visualization packages are present.

**Editor** — receives the app composition and the available components (from Designer + CLI + Analyst), composes actual pages. Page-level. Outputs TipTap JSON block arrangements per page. Knows what editor blocks are available from manifests, what collection view styles exist, and what visibility context each page serves.

All four read the same project file. No coordinator needed — the pipeline handles sequencing.

## The Pipeline

```
User: "We're a community center. We need events, room bookings, and memberships."
    ↓
architect(projectContext, userRequest)
    ↓
schemas/events.json
schemas/registrations.json
schemas/rooms.json
schemas/memberships.json
seed/events.json
seed/rooms.json
    ↓
designer(projectContext, schemas)
    ↓
adds $list, $card hints to rooms.json and memberships.json
writes custom List.vue, Form.vue, Detail.vue, Card.vue for events
writes custom Form.vue, List.vue for registrations
    ↓
cli(schemas)
    ↓
generates composables, types, api routes, database schema
generates standard components for anything the designer didn't touch
    ↓
analyst(projectContext, schemas, availablePackages)
    ↓
if crouton-charts installed:
  creates chart presets for bookings: "Booking Trends" (monthly count),
    "Revenue by Location", "Popular Timeslots" (heatmap)
  creates chart presets for memberships: "Active vs Expired", "Growth Over Time"
if crouton-maps installed:
  creates map config for locations: "All Locations" (collection map)
registers as editor blocks in generated layer manifest
    ↓
editor(projectContext, appComposition, availableComponents + analystBlocks)
    ↓
composes public landing page: hero → events calendar → rooms grid → location map → signup CTA
composes member dashboard: my-bookings list → upcoming events cards
composes admin overview: booking trends chart → revenue chart → recent bookings table → contact list
outputs TipTap JSON per page
```

Each step's output is files. Schemas are JSON. The Designer either modifies JSON (adding hints) or creates Vue files in the layer. The CLI reads the final JSON and generates everything it's responsible for. The Analyst creates visualization configurations from domain data + available packages. The Editor reads all available components (built-in + Analyst-generated) and composes TipTap page content.

Technically this is: run prompt A, write files, run prompt B, write files, run CLI, run prompt C, write files, run prompt D, write files. A single script orchestrating four AI calls and a CLI command.

## Project Context

Both roles read a project context file that tracks:

```json
{
  "name": "Westside Community Center",
  "domain": "center",
  "collections": ["events", "registrations", "rooms", "memberships"],
  "packages": ["crouton-auth", "crouton-email", "crouton-pages"],
  "designDecisions": {
    "events": { "$list": "calendar", "custom": true },
    "rooms": { "$list": "grid", "$card": "image-top" },
    "memberships": { "$list": "table", "$card": "compact" }
  }
}
```

When the user later asks "we also need a newsletter," the architect sees what exists and designs the schema to reference members and events. The designer sees the existing design patterns and keeps things consistent.

## Phase 1: Architect

User says: *"We're a community center. We run events people can sign up for, we have rooms that groups can reserve, and we want to track our members and their memberships."*

The architect figures out the data model:

**events.json**
```json
{
  "title": { "type": "string", "meta": { "required": true, "label": "Event Name", "area": "main" } },
  "description": { "type": "text", "meta": { "label": "Description", "area": "main" } },
  "date": { "type": "date", "meta": { "required": true, "label": "Date", "area": "main", "group": "schedule" } },
  "startTime": { "type": "string", "meta": { "required": true, "label": "Start Time", "area": "main", "group": "schedule" } },
  "endTime": { "type": "string", "meta": { "label": "End Time", "area": "main", "group": "schedule" } },
  "room": { "type": "string", "refTarget": "rooms", "meta": { "label": "Room", "area": "main", "group": "schedule" } },
  "capacity": { "type": "number", "meta": { "label": "Max Participants", "area": "sidebar" } },
  "category": { "type": "string", "meta": { "label": "Category", "area": "sidebar", "displayAs": "optionsSelect" } },
  "fee": { "type": "decimal", "meta": { "label": "Fee", "default": 0, "area": "sidebar" } },
  "membersOnly": { "type": "boolean", "meta": { "label": "Members Only", "default": false, "area": "sidebar" } },
  "image": { "type": "image", "meta": { "label": "Event Image", "area": "main" } }
}
```

**registrations.json**
```json
{
  "event": { "type": "string", "refTarget": "events", "meta": { "required": true, "label": "Event", "area": "main", "group": "registration" } },
  "member": { "type": "string", "refTarget": "members", "meta": { "required": true, "label": "Member", "area": "main", "group": "registration" } },
  "status": { "type": "string", "meta": { "required": true, "default": "registered", "label": "Status", "area": "sidebar" } },
  "paid": { "type": "boolean", "meta": { "label": "Paid", "default": false, "area": "sidebar" } },
  "notes": { "type": "text", "meta": { "label": "Notes", "area": "main" } }
}
```

**rooms.json**
```json
{
  "name": { "type": "string", "meta": { "required": true, "label": "Room Name", "area": "main" } },
  "capacity": { "type": "number", "meta": { "required": true, "label": "Capacity", "area": "sidebar" } },
  "amenities": { "type": "array", "meta": { "label": "Amenities", "area": "main" } },
  "hourlyRate": { "type": "decimal", "meta": { "label": "Hourly Rate", "area": "sidebar" } },
  "image": { "type": "image", "meta": { "label": "Photo", "area": "main" } },
  "description": { "type": "text", "meta": { "label": "Description", "area": "main" } }
}
```

**memberships.json**
```json
{
  "member": { "type": "string", "refTarget": "members", "meta": { "required": true, "label": "Member", "area": "main" } },
  "tier": { "type": "string", "meta": { "required": true, "label": "Tier", "area": "main", "displayAs": "optionsSelect" } },
  "startDate": { "type": "date", "meta": { "required": true, "label": "Start Date", "area": "main", "group": "period" } },
  "endDate": { "type": "date", "meta": { "required": true, "label": "End Date", "area": "main", "group": "period" } },
  "status": { "type": "string", "meta": { "required": true, "default": "active", "label": "Status", "area": "sidebar" } },
  "autoRenew": { "type": "boolean", "meta": { "label": "Auto-Renew", "default": true, "area": "sidebar" } }
}
```

Plus seed data — a few rooms, upcoming events, sample memberships.

## Phase 2: Designer

The designer reads the schemas and makes presentation decisions. Two modes.

### Hint (when standard output works)

**rooms.json** — simple entity, name + photo + capacity.

```json
{
  "$list": "grid",
  "$card": "image-top",
  ...fields unchanged...
}
```

**memberships.json** — tabular data, status tracking.

```json
{
  "$list": "table",
  "$card": "compact",
  ...fields unchanged...
}
```

Two strings added. The CLI does the rest.

### Custom components (when the domain demands it)

**Events** — a community center lives by its calendar. The designer writes:

- **Events/List.vue** — Calendar view, toggle to list. Colored blocks by category. Month/week/day.
- **Events/Card.vue** — Image, date badge, category tag, spots remaining.
- **Events/Detail.vue** — Image hero, schedule, room info. Registration button with capacity check. Attendee list for admins.
- **Events/Form.vue** — Form with room availability checker. Pick a date, see which rooms are free.

**Registrations** — nobody navigates to "create a registration." They register for an event. The designer writes:

- **Registrations/Form.vue** — Embedded in event detail. Logged-in member → one click. Not logged in → auth modal first. Fee → payment step.
- **Registrations/List.vue** — Attendee list with check-in toggles. Also works as standalone admin table.

Detail and card for registrations get standard CLI output — rarely used directly.

### How it decides

Standard works for: simple entities, settings, reference data. Anything where table + form + detail is natural.

Custom needed for: public-facing experiences, multi-step flows, calendar/timeline data, domain-specific interactions like check-in lists or availability checkers.

The test: would a user look at a generic table and think "this works" or "this doesn't feel right"?

## Phase 3: CLI Generation

The CLI generates everything the Designer didn't touch:

```
layers/center/
  components/
    Events/
      List.vue        ← Designer (calendar view)
      Form.vue        ← Designer (room availability)
      Detail.vue      ← Designer (event page)
      Card.vue        ← Designer (rich card)
    Registrations/
      List.vue        ← Designer (check-in list)
      Form.vue        ← Designer (contextual registration)
      Detail.vue      ← CLI (standard)
      Card.vue        ← CLI (standard)
    Rooms/
      List.vue        ← CLI (hint: grid)
      Form.vue        ← CLI (standard)
      Detail.vue      ← CLI (standard)
      Card.vue        ← CLI (hint: image-top)
    Memberships/
      List.vue        ← CLI (hint: table)
      Form.vue        ← CLI (standard)
      Detail.vue      ← CLI (standard)
      Card.vue        ← CLI (hint: compact)
  composables/        ← all CLI
  server/             ← all CLI
  types/              ← all CLI
```

The app doesn't know which path produced which file. The user owns all of them.

## Generated Layer = Package

The full pipeline produces a generated layer that is indistinguishable from a real package at runtime. Here's the complete output for the community center example:

```
layers/center/
  app/
    app.config.ts             ← registers everything (see below)
    components/
      Events/
        List.vue              ← Designer (calendar view)
        Form.vue              ← Designer (room availability)
        Detail.vue            ← Designer (event page)
        Card.vue              ← Designer (rich card)
      Registrations/
        List.vue              ← Designer (check-in list)
        Form.vue              ← Designer (contextual registration)
        Detail.vue            ← CLI (standard)
        Card.vue              ← CLI (standard)
      Rooms/
        List.vue              ← CLI (hint: grid)
        Form.vue              ← CLI (standard)
        Detail.vue            ← CLI (standard)
        Card.vue              ← CLI (hint: image-top)
      Memberships/
        List.vue              ← CLI (hint: table)
        Form.vue              ← CLI (standard)
        Detail.vue            ← CLI (standard)
        Card.vue              ← CLI (hint: compact)
    composables/              ← all CLI
    pages/                    ← Editor (TipTap JSON per page)
  server/
    api/                      ← all CLI
    database/
      schema.ts               ← CLI (Drizzle)
  types/                      ← all CLI
  nuxt.config.ts              ← CLI
```

**The key file: `app/app.config.ts`**

This is how the generated layer becomes a first-class citizen. It registers everything the same way a package like `crouton-charts` would:

```typescript
// Generated: layers/center/app/app.config.ts
export default defineAppConfig({
  // Register as an "app" so sidebar, page types, routes work
  croutonApps: {
    center: {
      id: 'center',
      name: 'Community Center',
      adminRoutes: [
        { path: '/events', label: 'Events', icon: 'i-lucide-calendar' },
        { path: '/rooms', label: 'Rooms', icon: 'i-lucide-door-open' },
        { path: '/memberships', label: 'Memberships', icon: 'i-lucide-users' },
      ],
      pageTypes: [
        { id: 'events-calendar', name: 'Events Calendar', component: 'CenterEventsList' }
      ]
    }
  },

  // Register collection views as editor blocks (usable in page editor)
  croutonBlocks: {
    // Collection views — always available
    eventsCalendar: {
      type: 'collectionBlock',
      name: 'Events Calendar',
      defaultAttrs: { collection: 'events', view: 'calendar' },
      // ...
    },
    roomsGrid: {
      type: 'collectionBlock',
      name: 'Rooms Grid',
      defaultAttrs: { collection: 'rooms', view: 'grid' },
      // ...
    },

    // Analyst chart presets — only if crouton-charts is installed
    bookingTrendsChart: {
      type: 'chartBlock',
      name: 'Booking Trends',
      defaultAttrs: { collection: 'registrations', preset: 'monthly-count' },
      // ...
    },
    revenueByLocationChart: {
      type: 'chartBlock',
      name: 'Revenue by Location',
      defaultAttrs: { collection: 'registrations', groupBy: 'room', aggregate: 'fee' },
      // ...
    },

    // Analyst map configs — only if crouton-maps is installed
    allLocationsMap: {
      type: 'collectionMapBlock',
      name: 'All Locations',
      defaultAttrs: { collection: 'rooms' },
      // ...
    },
  }
})
```

No manifest needed. The `app.config.ts` registration is the runtime equivalent. Generated layers are already part of the app — they register directly via Nuxt's deep-merge. The page editor discovers these blocks the same way it discovers `chartBlock` from `crouton-charts`.

This means: a custom "drink sales" collection generated from scratch gets the same treatment as bookings from `crouton-bookings` — List, Detail, Form, Card components, chart presets, map configs, all available as editor blocks in the page editor.

## Phase 4: Analyst

The Analyst bridges domain data with visualization capabilities. It only runs when visualization packages (charts, maps) are present. It reads the collection schemas and creates meaningful, pre-configured editor blocks.

### Input

The Analyst receives:
- **Collection schemas** — field names, types, relationships (from Architect)
- **Available visualization packages** — what's installed: crouton-charts, crouton-maps (from project context)
- **Collection view styles** — how collections are already presented (from Designer hints)

### Output

Pre-configured editor blocks registered in the generated layer's manifest and app.config. These become available in the page editor's `/` menu and for the Editor AI to place on pages.

### Example: Community Center with Charts + Maps

**If crouton-charts is installed:**

| Chart Preset | Collection | Type | What it shows |
|---|---|---|---|
| Booking Trends | registrations | line / bar | Registrations per month |
| Revenue by Location | registrations + rooms | bar (grouped) | Fee income grouped by room |
| Popular Timeslots | bookings | heatmap | Day-of-week × time-of-day heat |
| Membership Growth | memberships | area | New vs expired over time |
| Active Members | memberships | donut | Status breakdown |

**If crouton-maps is installed:**

| Map Config | Collection | What it shows |
|---|---|---|
| All Locations | rooms | Rooms on a map (if rooms have address/coordinates) |

### How it decides

The Analyst applies data-shape heuristics:

- **Date field + count** → time series chart (line or bar)
- **Status/category field** → distribution chart (donut or bar)
- **Decimal/number field + grouping** → aggregation chart (grouped bar, stacked)
- **Date × time fields** → heatmap
- **Address/coordinate fields** → collection map
- **Reference field + aggregation** → grouped breakdown

These heuristics become defaults over time. "Bookings with a date and a fee always get a revenue trend chart." Same feedback loop as the Designer and CLI.

### What makes it different from the Designer

The Designer asks: "How should bookings look as a list?" → calendar component.
The Analyst asks: "What's interesting about booking data?" → trends, revenue, popular times.

The Designer thinks in **UI patterns**. The Analyst thinks in **data patterns**. The Designer creates how you interact with one record. The Analyst creates how you understand the whole dataset.

### Conditional registration

The Analyst's output is conditional on installed packages. The generated layer registers editor blocks only when their dependency is present:

```typescript
// Generated: layers/center/app/app.config.ts
export default defineAppConfig({
  croutonBlocks: {
    // Only if crouton-charts is installed
    bookingTrendsChart: {
      type: 'chartBlock',
      name: 'Booking Trends',
      defaultAttrs: { collection: 'registrations', preset: 'monthly-count' },
      // ... full CroutonBlockDefinition
    }
  }
})
```

If crouton-charts isn't installed, these blocks don't register and the page editor never shows them. Clean degradation.

## Phase 5: Editor

The Editor composes pages from everything that's now available — built-in editor blocks, Designer components, CLI standard components, and Analyst visualizations. It arranges them into page layouts per visibility level.

### Input

The Editor receives:
- **App composition** — which blocks are active, which visibility level (from Atelier)
- **Available editor blocks** — from package manifests (`provides.editorBlocks`): charts, maps, collection views, content blocks
- **Analyst blocks** — pre-configured chart presets, map configs, dashboard widgets (from Analyst)
- **Collection view styles** — from Designer hints (`$list: "calendar"`, `$card: "image-top"`) and CLI defaults
- **Visibility context** — which pages serve public, authenticated, or admin audiences

### Output

TipTap JSON per page. Each page is a sequence of blocks that `crouton-pages` can render and the user can later edit.

### Example: Community Center

**Public landing page:**
```
hero: { title: "Westside Community Center", subtitle: "Events, classes & more" }
collectionBlock: { collection: "events", view: "calendar", limit: 10 }
collectionBlock: { collection: "rooms", view: "grid", limit: 6 }
textBlock: { content: "Join our community..." }
```

**Member dashboard:**
```
collectionBlock: { collection: "registrations", view: "list", filter: "my", title: "My Bookings" }
collectionBlock: { collection: "events", view: "card-row", limit: 4, title: "Upcoming Events" }
```

**Admin overview:**
```
chartBlock: { preset: "booking-trends", title: "Booking Trends" }        ← from Analyst
chartBlock: { preset: "revenue-by-location", title: "Revenue" }          ← from Analyst
collectionBlock: { collection: "registrations", view: "table", title: "Recent Bookings" }
collectionBlock: { collection: "members", view: "table", title: "Contacts" }
```

### How it decides

The Editor applies layout patterns based on visibility and block type:

- **Public pages** — hero first, visual blocks (calendars, grids, images), end with CTA
- **Member pages** — personal data first (my bookings, my profile), then discovery (upcoming events)
- **Admin pages** — overview charts first, then data tables for management

These patterns become defaults over time, same as the Designer's component heuristics. A public page always starts with a hero. A dashboard always leads with the user's own data. An admin page always opens with the big picture.

### What makes it different from the Designer

The Designer asks: "How should events look as a list?" → calendar component.
The Editor asks: "What should the public landing page contain?" → hero + calendar + rooms grid + signup.

The Designer doesn't care about page layout. The Editor doesn't care about how a calendar renders internally. Each has its own job.

## Getting Smarter Over Time

The CLI gets smarter through observation, not a separate AI. You work across projects, you notice patterns: date + capacity always becomes a calendar, image + name always becomes a grid. You update the CLI defaults.

The Designer does less work per project as the CLI absorbs proven patterns. Eventually, the Designer only fires for genuinely novel cases the CLI can't handle yet.

The same applies to the Analyst. Visualization patterns emerge: date + count always gets a time series, status fields always get a donut, fee + grouping always gets a revenue breakdown. These become Analyst defaults. Eventually the Analyst only fires for genuinely novel data shapes.

The same applies to the Editor. Layout patterns emerge: public pages always start with a hero, dashboards always lead with personal data, admin pages open with summary charts. These become Editor defaults. Eventually the Editor only fires for genuinely novel page compositions.

This could be automated later if there's enough data. For now, the feedback loop is manual and that's fine.

## Summary

| Role | Input | Output | Level |
|---|---|---|---|
| **Architect** | User conversation + project context | Schemas + seed data | Data model |
| **Designer** | Schemas + project context | Hints on schemas or custom Vue components | Component |
| **CLI** | Schemas (with hints) | Composables, types, API, database, standard components | Infrastructure |
| **Analyst** | Schemas + available visualization packages | Pre-configured chart presets, map configs, dashboard widgets (as editor blocks) | Data insight |
| **Editor** | App composition + all available components + Analyst blocks | TipTap JSON page content | Page layout |
