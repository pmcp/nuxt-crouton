# Atelier Generation Flow

## Two Roles, Shared Context

**Architect** — talks to the user, understands the domain, outputs schemas and seed data. Has full project context: what collections exist, what packages are installed, what relationships are in play.

**Designer** — receives schemas, decides how each collection should present itself. Adds layout hints for the CLI or writes custom Vue components. Has the same project context so it keeps things consistent.

Both read the same project file. No coordinator needed — the pipeline handles sequencing.

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
```

Each step's output is files. Schemas are JSON. The designer either modifies JSON (adding hints) or creates Vue files in the layer. The CLI reads the final JSON and generates everything it's responsible for.

Technically this is: run prompt A, write files, run prompt B, write files, run CLI. A single script orchestrating two AI calls and a CLI command.

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
  "member": { "type": "string", "refTarget": "members", "meta": { "label": "Member", "area": "main", "group": "registration" } },
  "guestName": { "type": "string", "meta": { "label": "Guest Name", "area": "main", "group": "guest" } },
  "guestEmail": { "type": "string", "meta": { "label": "Guest Email", "area": "main", "group": "guest" } },
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

- **Registrations/Form.vue** — Embedded in event detail. Member → one click. Guest → name + email. Fee → payment step.
- **Registrations/List.vue** — Attendee list with check-in toggles. Also works as standalone admin table.

Detail and card for registrations get standard CLI output — rarely used directly.

### How it decides

Standard works for: simple entities, settings, reference data. Anything where table + form + detail is natural.

Custom needed for: public-facing experiences, multi-step flows, calendar/timeline data, domain-specific interactions like check-in lists or availability checkers.

The test: would a user look at a generic table and think "this works" or "this doesn't feel right"?

## Phase 3: Generation

Everything lands in the same place:

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

## Getting Smarter Over Time

The CLI gets smarter through observation, not a separate AI. You work across projects, you notice patterns: date + capacity always becomes a calendar, image + name always becomes a grid. You update the CLI defaults.

The designer does less work per project as the CLI absorbs proven patterns. Eventually, the designer only fires for genuinely novel cases the CLI can't handle yet.

This could be automated later if there's enough data. For now, the feedback loop is manual and that's fine.

## Summary

| Role | Input | Output |
|---|---|---|
| **Architect** | User conversation + project context | Schemas + seed data |
| **Designer** | Schemas + project context | Hints on schemas or custom Vue components |
| **CLI** | Schemas (with hints) | Composables, types, API, database, standard components |
