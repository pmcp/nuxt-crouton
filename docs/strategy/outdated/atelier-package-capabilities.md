# Package Capabilities Map

What packages provide, and where it becomes available.

## The Three Block Systems

Crouton has three distinct "block" concepts. They serve different purposes at different levels.

```
                    ATELIER                    PAGE EDITOR                  CMS
                    (app composition)          (page content)              (page routing)
                    ─────────────────          ──────────────              ────────────────
What it is:         Capability blocks          TipTap nodes               Page type components
                    on a kanban canvas         in the content editor      in the page tree

Examples:           schedule, hero,            chartBlock, mapBlock,      regular, booking,
                    my-bookings, signup        heroBlock, collectionBlock collection-detail

Defined in:         crouton-atelier/           crouton-core/              crouton-core/
                    app/data/blocks.ts         app/types/block-def.ts     app/types/app.ts

Registered via:     (static data, Phase A)     app.config.ts →            app.config.ts →
                    manifest (Phase B)         croutonBlocks              croutonApps.pageTypes

Accessed via:       useBlockRegistry()         useCroutonBlocks()         usePageTypes()

Who creates them:   User in Atelier UI         User in page editor        Admin in page tree

Output:             AppComposition (Yjs)       TipTap JSON in page        Page record in DB
                                               content field              with pageType field
```

## What Each Package Provides

### crouton-core (foundation)

```
PROVIDES
├── Field Types: string, text, number, decimal, boolean, date,
│                json, repeater, array, reference, image, file
│
├── Components (shared)
│   ├── CroutonCollection          ← generic CRUD wrapper
│   ├── CroutonDetail              ← generic detail view
│   ├── CroutonFormLayout          ← form with area/group system
│   ├── CroutonDefaultCard         ← generic card
│   ├── CroutonImageUpload         ← file handling
│   ├── CroutonKanbanColumn        ← drag-drop columns
│   ├── CroutonFormExpandableSlideOver ← maximisable slideover
│   └── stubs/                     ← no-op fallbacks (priority: -1)
│       ├── CroutonAssetsPicker
│       ├── CroutonEditorField
│       ├── CroutonMapsPreview
│       └── CroutonCollabPresence
│
├── Composables
│   ├── useCroutonApps()           ← package detection (hasApp)
│   ├── useCroutonBlocks()         ← editor block registry
│   ├── useCollections()           ← collection metadata
│   ├── useDisplayConfig()         ← field rendering config
│   └── useCrouton()               ← modal/slideover state
│
└── Types
    ├── CroutonManifest            ← manifest schema
    ├── CroutonBlockDefinition     ← editor block runtime type
    ├── CroutonAppConfig           ← app registration type
    └── CroutonPageType            ← page type definition
```

### crouton-pages (public surface + page editor)

```
PROVIDES
├── Collections
│   └── pages                      ← page tree with hierarchy
│
├── Editor Blocks (built-in TipTap nodes)
│   ├── heroBlock                  ← hero section
│   ├── sectionBlock               ← content section
│   ├── ctaBlock                   ← call to action
│   ├── cardGridBlock              ← card grid layout
│   ├── separatorBlock             ← visual separator
│   ├── richTextBlock              ← rich text content
│   ├── collectionBlock            ← collection view (table/grid/cards)
│   ├── faqBlock                   ← FAQ accordion
│   ├── twoColumnBlock             ← two-column layout
│   ├── imageBlock                 ← image with caption
│   └── embedBlock                 ← external embed
│
├── Page Types
│   ├── regular                    ← rich text / block content
│   └── collection-binder          ← navigation binder for collections
│
├── Components
│   ├── CroutonPagesRenderer       ← public page rendering
│   ├── CroutonPagesBlockContent   ← block content renderer
│   └── CroutonPagesEditorBlockEditor ← TipTap editor
│
└── CONSUMES (from other packages via runtime discovery)
    ├── croutonBlocks.*            ← addon editor blocks (charts, maps)
    └── croutonApps.*.pageTypes    ← page types from any package
```

### crouton-bookings (domain: scheduling)

```
PROVIDES
├── Collections
│   ├── booking                    ← time slots / classes
│   ├── location                   ← venues / rooms
│   ├── settings                   ← booking configuration
│   ├── emailtemplate              ← (conditional, if crouton-email)
│   └── emaillog                   ← (conditional, if crouton-email)
│
├── Components
│   ├── CroutonBookingCalendar     ← calendar view
│   ├── CroutonBookingList         ← list view
│   ├── CroutonBookingPanel        ← public booking interface
│   ├── CroutonBookingCustomerBookingWizard ← multi-step booking
│   └── CroutonBookingCart         ← cart for multiple bookings
│
├── Page Types
│   └── booking                    ← public booking calendar page
│
├── Atelier Blocks
│   ├── schedule      (public)     ← calendar view of bookings
│   ├── book-now      (public)     ← booking interface
│   ├── my-bookings   (member)     ← personal booking list
│   ├── manage-bookings (admin)    ← admin booking management
│   └── manage-locations (admin)   ← admin location management
│
└── Routes
    ├── /dashboard/[team]/bookings
    └── /admin/[team]/bookings/**
```

### crouton-charts (addon: data visualisation)

```
PROVIDES
├── Editor Blocks (TipTap)
│   └── chartBlock                 ← collection data chart
│       ├── editorView: CroutonChartsBlocksChartBlockView
│       ├── renderer:   CroutonChartsBlocksChartBlockRender
│       └── property:   CroutonChartsBlocksChartPresetPicker
│
├── Components
│   └── CroutonChartsWidget        ← standalone chart component
│
└── Composables
    └── useCollectionChart()        ← chart data from any collection

REGISTERED IN app.config.ts
├── croutonApps.charts             ← detected via hasApp('charts')
└── croutonBlocks.chartBlock       ← full CroutonBlockDefinition
```

### crouton-maps (addon: geolocation)

```
PROVIDES
├── Editor Blocks (TipTap)
│   ├── mapBlock                   ← single location map
│   │   ├── editorView: CroutonMapsBlocksMapBlockView
│   │   └── renderer:   CroutonMapsBlocksMapBlockRender
│   └── collectionMapBlock         ← collection items on map
│       ├── editorView: CroutonMapsBlocksCollectionMapBlockView
│       └── renderer:   CroutonMapsBlocksCollectionMapBlockRender
│
├── Components
│   ├── CroutonMapsMap             ← map component
│   ├── CroutonMapsMarker          ← map marker
│   ├── CroutonMapsPopup           ← marker popup
│   └── CroutonMapsPreview         ← field-level map preview
│
├── Field Enhancement
│   └── Detects address/coordinate fields → adds map preview
│
└── Composables
    ├── useMap()
    ├── useGeocode()
    └── useMapConfig()

REGISTERED IN app.config.ts
├── croutonApps.maps               ← detected via hasApp('maps')
├── croutonBlocks.mapBlock         ← full CroutonBlockDefinition
└── croutonBlocks.collectionMapBlock
```

### crouton-auth (identity)

```
PROVIDES
├── Collections (auth system)
│   ├── user, session, account     ← Better Auth core
│   ├── organization, member       ← team system
│   ├── invitation                 ← team invites
│   ├── scopedAccessToken          ← ephemeral access
│   └── teamSettings               ← per-team config
│
├── Components
│   └── CroutonAuthForm            ← login/signup form
│
├── Atelier Blocks
│   ├── signup           (public)  ← sign up form
│   └── manage-contacts  (admin)   ← member list management
│
├── Composables
│   ├── useAuth()                  ← auth state
│   └── useTeamContext()           ← team context (ALWAYS use this)
│
└── Routes
    └── /admin/[team]/members/**
```

### crouton-atelier (app composer)

```
PROVIDES
├── Collections
│   └── atelierProject             ← project metadata
│
├── Block Registry (static, Phase A)
│   ├── From crouton-bookings: schedule, book-now, my-bookings, manage-bookings, manage-locations
│   ├── From crouton-pages: hero, text-page, blog
│   └── From crouton-auth: signup, manage-contacts
│
├── Templates
│   ├── yoga-studio                ← hero + schedule + signup + my-bookings + manage-*
│   ├── sports-club                ← hero + schedule + my-bookings + manage-*
│   ├── charity                    ← hero + text-page + manage-contacts
│   └── blank                      ← empty canvas
│
├── Composables
│   ├── useBlockRegistry()         ← block lookup + filtering
│   ├── useAppComposition()        ← Yjs-backed composition state
│   ├── useAtelierSync()           ← collab room management
│   └── useAtelierScaffold()       ← generate flow
│
└── Routes
    └── /admin/[team]/atelier/**
```

## How It All Flows Together

### Registration Flow (build time)

```
Package source files
    │
    ├── crouton.manifest.ts        → declares capabilities (metadata)
    │
    ├── app/app.config.ts          → registers runtime definitions
    │   ├── croutonApps.{id}       → app routes, page types
    │   └── croutonBlocks.{type}   → editor block definitions
    │
    └── nuxt.config.ts             → layer dependencies, component dirs
            │
            ▼
    Nuxt deep-merges all layers at build time
            │
            ▼
    Single appConfig with combined croutonApps + croutonBlocks
```

### Discovery Flow (runtime)

```
useCroutonApps()                   useCroutonBlocks()
    │                                  │
    ├── hasApp('charts')               ├── hasBlock('chartBlock')
    ├── hasApp('maps')                 ├── getBlock('chartBlock')
    ├── adminRoutes                    └── blocksList
    ├── dashboardRoutes                    │
    └── pageTypes                          ▼
        │                          Page editor discovers blocks
        ▼                          Creates TipTap extensions dynamically
    Sidebar navigation             User inserts via / menu
    Page tree page types
```

### Generation Pipeline (AI roles)

```
ARCHITECT              DESIGNER               CLI                    ANALYST              EDITOR
(data model)           (components)           (infrastructure)       (visualizations)     (pages)
────────────           ────────────           ──────────────         ────────────────     ───────

Schemas:               Components:            Generates:             If charts installed: Pages:
├── events.json        ├── Events/List.vue    ├── composables/       ├── Booking Trends   ├── Public landing
├── registrations.json │   (calendar)         ├── types/             ├── Revenue by Room   │   hero
├── rooms.json         ├── Events/Card.vue    ├── server/api/        ├── Popular Times     │   → events calendar
├── memberships.json   │   (rich)             ├── server/database/   ├── Membership Growth │   → rooms grid
│                      ├── Events/Detail.vue  └── standard           │                     │   → location map
Seed data:             ├── Events/Form.vue        components         If maps installed:    │   → signup CTA
├── seed/events.json   ├── Registrations/                            └── All Locations     │
├── seed/rooms.json        List.vue           Everything Designer                          ├── Member dashboard
                       ├── Registrations/     didn't touch           Registered in         │   → my-bookings
                       │   Form.vue                                  app.config.ts as      │   → upcoming events
                       │                                             editor blocks         │
                       Hints (for CLI):                                                    ├── Admin overview
                       ├── rooms: $list=grid                                               │   → booking trends ←─ Analyst
                       └── memberships:                                                    │   → revenue chart  ←─ Analyst
                           $list=table                                                     │   → bookings table
                                                                                           │   → contacts table
                                                                                           │
                                                                                           TipTap JSON per page
```

### Where Each Piece Becomes Available

```
SOURCE                    AVAILABLE AT              CONSUMED BY
──────                    ────────────              ───────────

manifest.provides        Build time                CLI (code generation)
  .editorBlocks          (manifest-loader)         Atelier (Phase B: auto-discovery)
  .collections
  .composables
  .components

app.config               Runtime                   ─── SAME FOR PACKAGES AND GENERATED LAYERS ───
  .croutonApps           (Nuxt deep-merge)         Sidebar navigation
    .adminRoutes                                   Dashboard navigation
    .pageTypes                                     Page tree (create page → pick type)
                                                   Public renderer (route → component)

  .croutonBlocks         Runtime                   Page editor (TipTap / menu)
    .{type}              (Nuxt deep-merge)         Block property panel
                                                   Public page renderer (BlockContent)

atelier blocks           Runtime                   Atelier kanban canvas
  (static data           (useBlockRegistry)        Template selection
   → manifest Phase B)                             Scaffold generation

collections              Runtime                   CRUD composables
  (generated layer)      (useCollections)           Collection views (List, Detail, Form)
                                                   Editor collectionBlock
                                                   Charts (useCollectionChart)
                                                   Maps (collectionMapBlock)
```

### Generated Layers = Packages

A generated layer (e.g. `layers/fundraiser/`) registers identically to an npm package:

```
GENERATED LAYER                         NPM PACKAGE
layers/fundraiser/app/app.config.ts     packages/crouton-bookings/app/app.config.ts
───────────────────────────────────     ──────────────────────────────────────────
croutonApps.fundraiser = {              croutonApps.bookings = {
  adminRoutes: ['/drinks', '/sales']      adminRoutes: ['/bookings', '/locations']
  pageTypes: [...]                        pageTypes: [{ id: 'booking', ... }]
}                                       }

croutonBlocks.drinksGrid = { ... }      (registered in manifest + app.config)
croutonBlocks.salesTrends = { ... }     ← Analyst chart preset
croutonBlocks.revenueByDrink = { ... }  ← Analyst chart preset

SAME RUNTIME DISCOVERY                  SAME RUNTIME DISCOVERY
useCroutonApps().hasApp('fundraiser')   useCroutonApps().hasApp('bookings')
useCroutonBlocks().getBlock('...')      useCroutonBlocks().getBlock('chartBlock')
```

No manifest needed for generated layers. `app.config.ts` IS the registration.
The four AI roles (Architect, Designer, Analyst, Editor) + CLI produce everything
a package would: components, composables, types, API, chart presets, page layouts.

## Summary Table

| Source | Collections | Editor Blocks | Analyst Blocks | Atelier Blocks | Page Types | Admin Routes |
|--------|-------------|---------------|----------------|----------------|------------|--------------|
| **crouton-core** | (field types) | - | - | - | - | - |
| **crouton-pages** | pages | hero, section, cta, cardGrid, separator, richText, collection, faq, twoColumn, image, embed | - | hero, text-page, blog | regular, collection-binder | /workspace |
| **crouton-bookings** | booking, location, settings | - | - | schedule, book-now, my-bookings, manage-bookings, manage-locations | booking | /bookings/** |
| **crouton-charts** | - | chartBlock (generic) | - | - | - | - |
| **crouton-maps** | - | mapBlock, collectionMapBlock (generic) | - | - | - | - |
| **crouton-auth** | user, member, session, ... | - | - | signup, manage-contacts | - | /members/** |
| **crouton-atelier** | atelierProject | - | - | (hosts the registry) | - | /atelier/** |
| **crouton-email** | (conditional via bookings) | - | - | - | - | - |
| **crouton-assets** | - | - | - | - | - | /assets/** |
| **crouton-editor** | - | (provides TipTap) | - | - | - | - |
| **crouton-collab** | - | - | - | - | - | - |
| | | | | | | |
| **Generated layer** (e.g. fundraiser) | drinks, sales, transactions | drinksGrid, salesTable (collection views) | salesTrends, revenueByDrink, topSellers (chart presets), allVenuesMap (if maps) | (custom atelier blocks if needed) | drinks-catalog | /drinks, /sales |

The last row shows what the full AI pipeline produces for a custom domain. Same registration pattern, same discovery, same page editor experience.
