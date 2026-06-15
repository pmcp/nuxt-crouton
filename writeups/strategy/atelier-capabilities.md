# Package Capabilities

What packages provide, and where it becomes available.

> This document should be generated from package manifests. Until that automation exists, maintain manually. Last verified against code: 2026-02-23.

## The Three Block Systems

Crouton has three distinct "block" concepts at different levels.

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

## Core Packages

### crouton-core (foundation)

```
PROVIDES
├── Field Types (12): string, text, number, decimal, boolean, date,
│                     json, repeater, array, reference, image, file
│
├── Components (shared)
│   ├── CroutonCollection            ← multi-layout CRUD (table/list/grid/tree/kanban)
│   ├── CroutonDetail                ← generic detail view
│   ├── CroutonForm                  ← CRUD form handler
│   ├── CroutonFormLayout            ← form with area/group system
│   ├── CroutonDefaultCard           ← display-aware card
│   ├── CroutonItemCardMini          ← compact reference card
│   ├── CroutonImageUpload           ← file picker with crop
│   ├── CroutonImageCropper          ← crop modal
│   ├── CroutonDropZone              ← drag-and-drop upload
│   ├── CroutonKanbanColumn          ← drag-drop columns
│   ├── CroutonFormExpandableSlideOver ← maximisable slideover
│   ├── CroutonExportButton          ← CSV/JSON export
│   ├── CroutonImportButton          ← CSV/JSON import
│   ├── CroutonShortcutHint          ← keyboard shortcut badges
│   └── stubs/ (priority: -1)        ← no-op fallbacks
│       ├── AuthRouteModal
│       ├── CollabEditingBadge
│       ├── CroutonAssetsPicker
│       ├── CroutonEditorPreview
│       ├── CroutonEditorSimple
│       ├── CroutonMapsMap
│       └── CroutonMapsPreview
│
├── Composables
│   ├── useCroutonApps()             ← package detection (hasApp)
│   ├── useCroutonBlocks()           ← editor block registry
│   ├── useCollections()             ← collection metadata
│   ├── useCollectionQuery()         ← data fetching with cache
│   ├── useCollectionMutation()      ← CRUD with cache invalidation
│   ├── useCollectionExport()        ← CSV/JSON export
│   ├── useCollectionImport()        ← CSV/JSON import
│   ├── useDisplayConfig()           ← field rendering config
│   ├── useCrouton()                 ← modal/slideover state
│   ├── useCroutonShortcuts()        ← keyboard shortcuts
│   ├── useTeamContext()             ← team ID/slug from route
│   └── useImageCrop()              ← cropperjs composable
│
├── Server Utils
│   ├── encryptSecret / decryptSecret ← AES-256-GCM for third-party keys
│   └── maskSecret                    ← display hints for encrypted values
│
├── Types
│   ├── CroutonManifest              ← manifest schema
│   ├── CroutonBlockDefinition       ← editor block runtime type
│   ├── CroutonAppConfig             ← app registration type
│   ├── CroutonPageType              ← page type definition
│   └── GeneratorContribution        ← package code-gen hooks
│
├── Hooks
│   └── crouton:mutation             ← CRUD event hook (operation, collection, itemId, data)
│
└── Auto-Includes
    ├── @nuxthub/core                ← database, KV, blob
    ├── crouton-i18n                 ← translations
    ├── crouton-auth                 ← identity
    └── crouton-admin                ← super admin
```

### crouton-pages (public surface + page editor)

```
PROVIDES
├── Collections
│   └── pages                        ← page tree with hierarchy
│
├── Editor Blocks (11 built-in TipTap nodes)
│   ├── heroBlock                    ← hero section
│   ├── sectionBlock                 ← content section
│   ├── ctaBlock                     ← call to action
│   ├── cardGridBlock                ← card grid layout
│   ├── separatorBlock               ← visual separator
│   ├── richTextBlock                ← rich text content
│   ├── collectionBlock              ← collection view (table/grid/cards)
│   ├── faqBlock                     ← FAQ accordion
│   ├── twoColumnBlock               ← two-column layout
│   ├── imageBlock                   ← image with caption
│   └── embedBlock                   ← external embed
│
├── Page Types
│   ├── regular                      ← rich text / block content
│   └── collection-binder            ← navigation binder for collections
│
├── Components
│   ├── CroutonPagesRenderer         ← public page rendering
│   ├── CroutonPagesBlockContent     ← block content renderer
│   └── CroutonPagesEditorBlockEditor ← TipTap editor
│
├── Addon Block System
│   ├── addon-block-factory.ts       ← creates TipTap Node from CroutonBlockDefinition
│   └── AddonBlockView.vue           ← generic NodeView for addon blocks
│
└── CONSUMES (from other packages via runtime discovery)
    ├── croutonBlocks.*              ← addon editor blocks (charts, maps)
    └── croutonApps.*.pageTypes      ← page types from any package
```

### crouton-auth (identity)

```
PROVIDES
├── Collections (13)
│   ├── user, session, account       ← Better Auth core
│   ├── verification                 ← email verification
│   ├── organization, member         ← team system
│   ├── invitation                   ← team invites
│   ├── passkey                      ← WebAuthn
│   ├── twoFactor                    ← 2FA
│   ├── subscription                 ← membership tiers
│   ├── domain                       ← custom domains
│   ├── scopedAccessToken            ← ephemeral access
│   └── teamSettings                 ← per-team config
│
├── Components
│   └── CroutonAuthForm              ← login/signup form
│
├── Composables
│   ├── useAuth()                    ← auth state
│   └── useTeamContext()             ← team context (ALWAYS use this)
│
├── Atelier Blocks (declared in crouton-atelier, Phase A)
│   ├── signup           (public)    ← sign up form
│   └── manage-contacts  (admin)     ← member list management
│
└── Routes
    └── /admin/[team]/members/**
```

## Domain Packages

### crouton-bookings (scheduling)

```
PROVIDES
├── Collections (5)
│   ├── booking                      ← time slots / classes
│   ├── location                     ← venues / rooms
│   ├── settings                     ← booking configuration
│   ├── emailtemplate                ← (conditional, if crouton-email)
│   └── emaillog                     ← (conditional, if crouton-email)
│
├── Components (8)
│   ├── CroutonBookingPanel          ← public booking interface
│   ├── CroutonBookingCalendar       ← calendar view
│   ├── CroutonBookingList           ← list view
│   ├── CroutonBookingCard           ← booking card
│   ├── CroutonBookingCustomerBookingWizard ← multi-step booking
│   ├── CroutonBookingWeekStrip      ← week navigation
│   ├── CroutonBookingSlotIndicator  ← availability indicator
│   └── CroutonBookingDateBadge      ← date display
│
├── Page Types
│   └── booking                      ← public booking calendar page
│
├── Atelier Blocks (declared in crouton-atelier, Phase A)
│   ├── schedule         (public)    ← calendar view of bookings
│   ├── book-now         (public)    ← booking interface
│   ├── my-bookings      (member)    ← personal booking list
│   ├── manage-bookings  (admin)     ← admin booking management
│   └── manage-locations (admin)     ← admin location management
│
└── Routes
    ├── /dashboard/[team]/bookings
    └── /admin/[team]/bookings/**
```

### crouton-sales (event POS)

```
PROVIDES
├── Collections (10)
│   ├── event, product, category     ← catalog
│   ├── order, orderItem             ← transactions
│   ├── location, client             ← context
│   ├── eventSetting                 ← configuration
│   ├── printer, printQueue          ← (conditional, receipt printing)
│
├── Components (12)
│   └── Full POS interface: product grid, cart, checkout, receipt
│
└── Routes
    └── /admin/[team]/sales/**
```

## Addon Packages

### crouton-charts (data visualisation)

```
PROVIDES
├── Editor Blocks (TipTap)
│   └── chartBlock                   ← collection data chart
│       ├── editorView: CroutonChartsBlocksChartBlockView
│       ├── renderer:   CroutonChartsBlocksChartBlockRender
│       └── property:   CroutonChartsBlocksChartPresetPicker
│
├── Components
│   └── CroutonChartsWidget          ← standalone chart component
│
└── Composables
    └── useCollectionChart()          ← chart data from any collection

REGISTERED IN app.config.ts
├── croutonApps.charts               ← detected via hasApp('charts')
└── croutonBlocks.chartBlock         ← full CroutonBlockDefinition
```

### crouton-maps (geolocation)

```
PROVIDES
├── Editor Blocks (TipTap)
│   ├── mapBlock                     ← single location map
│   └── collectionMapBlock           ← collection items on map
│
├── Components (4)
│   ├── CroutonMapsMap               ← map component
│   ├── CroutonMapsMarker            ← map marker
│   ├── CroutonMapsPopup             ← marker popup
│   └── CroutonMapsPreview           ← field-level map preview
│
├── Field Enhancement
│   └── Detects address/coordinate fields → adds map preview
│
└── Composables (5)
    ├── useMap()
    ├── useGeocode()
    ├── useMapConfig()
    ├── useMarkerColor()
    └── useMapboxStyles()

REGISTERED IN app.config.ts
├── croutonApps.maps                 ← detected via hasApp('maps')
├── croutonBlocks.mapBlock
└── croutonBlocks.collectionMapBlock
```

### crouton-email (transactional email)

```
PROVIDES
├── Email infrastructure             ← standalone package, not bookings-only
├── Template system                  ← email templates with variables
└── Send API                         ← used by bookings, auth, any package

CONSUMED BY
├── crouton-bookings                 ← confirmation, reminder emails
└── crouton-auth                     ← magic links, verification
```

### crouton-assets (media library)

```
PROVIDES
├── Components (7)
│   ├── CroutonAssetsPicker          ← file/image picker modal
│   ├── CroutonAssetsLibrary         ← media browser
│   ├── CroutonAssetsUploader        ← upload interface
│   ├── CroutonAssetsCard            ← asset card
│   ├── CroutonAssetsAssetTile       ← compact asset tile
│   ├── CroutonAssetsForm            ← asset metadata form
│   └── CroutonAssetsFormUpdate      ← asset update form
│
└── Routes
    └── /admin/[team]/media
```

### crouton-editor (rich text)

```
PROVIDES
├── Components (5)
│   ├── CroutonEditorSimple          ← basic rich text editor
│   ├── CroutonEditorBlocks          ← block-based editor
│   ├── CroutonEditorVariables       ← variable insertion
│   ├── CroutonEditorPreview         ← rendered preview
│   └── CroutonEditorWithPreview     ← editor + preview split
│
└── Composables
    └── useEditorVariables()         ← variable system
```

### crouton-collab (real-time collaboration)

```
PROVIDES
├── Composables (8)
│   ├── useCollabConnection()        ← WebSocket connection management
│   ├── useCollabSync()              ← Yjs Y.Map/Y.Doc sync
│   ├── useCollabPresence()          ← user presence tracking
│   ├── useCollabEditor()            ← TipTap collaborative editing
│   ├── useCollabLocalizedContent()  ← i18n-aware collaboration
│   ├── useCollabRoomUsers()         ← room user list
│   ├── useFormCollabPresence()      ← form-level presence
│   └── useCollectionSyncSignal()    ← mutation notifications
│
├── Components (5)
│   ├── CollabStatus                 ← connection indicator
│   ├── CollabPresence               ← user avatars
│   ├── CollabCursors                ← cursor tracking
│   ├── CollabIndicator              ← inline collaboration badge
│   └── CollabEditingBadge           ← "X is editing" badge
│
├── Server
│   ├── /api/collab/[roomId]/ws      ← WebSocket endpoint
│   └── /api/collab/[roomId]/users   ← room users API
│
└── Infrastructure
    ├── Durable Objects (prod)        ← Cloudflare Workers
    └── Nitro handler (dev)           ← local development
```

### crouton-i18n (translations)

```
PROVIDES
├── Composables
│   └── useT()                       ← DB-backed translations with team overrides
│
├── Translation management UI
│
└── AI translation (if crouton-ai)   ← automatic translation via AI
```

### crouton-ai (AI infrastructure)

```
PROVIDES
├── Multi-provider AI interface       ← powers generation pipeline
├── Tool system                       ← structured AI tool calls (uses zod/v3)
│
└── CONSUMED BY
    ├── crouton-designer              ← schema design chat
    ├── crouton-i18n                  ← AI translation
    └── Atelier (Phase C)             ← Architect, Designer, Editor roles
```

## Infrastructure Packages

### crouton-events (audit trail)

```
PROVIDES
├── Mutation tracking                ← hooks into crouton:mutation
├── Activity timeline components
└── Foundation for CRM-like views    ← who did what, when
```

### crouton-flow (visual DAG)

```
PROVIDES
├── Composables (5)                  ← graph state, node management
├── Components (1)                   ← graph canvas
├── Collaborative via crouton-collab
└── Routes: /admin/[team]/flows/**
```

### crouton-admin (super admin)

```
PROVIDES
├── Super admin dashboard            ← user/team management, impersonation
└── Routes: /super-admin/**
```

### crouton-triage (discussions)

```
PROVIDES
└── Discussion-to-task pipeline      ← niche, complete
```

### crouton-mcp / crouton-mcp-toolkit (AI agents)

```
PROVIDES
├── MCP server for AI collection generation
│   ├── design_schema → validate_schema → generate_collection
│   └── list_collections, list_layers
├── Resources: crouton://field-types, crouton://schema-template
└── Docs MCP in apps/docs/server/mcp/
```

### crouton-themes (theming)

```
PROVIDES
└── KO theme (hardware-inspired)     ← extends: ['@fyit/crouton-themes/ko']
```

### crouton-devtools (developer tooling)

```
PROVIDES
└── Developer tooling panel          ← package info, collection inspector
```

## crouton-atelier (app composer)

```
PROVIDES
├── Collections
│   └── atelierProject               ← project metadata
│
├── Block Registry (static, Phase A → manifest Phase B)
│   ├── From crouton-bookings: schedule, book-now, my-bookings, manage-bookings, manage-locations
│   ├── From crouton-pages: hero, text-page, blog
│   └── From crouton-auth: signup, manage-contacts
│
├── Templates: yoga-studio, sports-club, charity, blank
│
├── Composables
│   ├── useBlockRegistry()           ← block lookup + filtering
│   ├── useAppComposition()          ← Yjs-backed composition state
│   ├── useAtelierSync()             ← collab room management
│   └── useAtelierScaffold()         ← generate flow
│
└── Routes: /admin/[team]/atelier/**
```

## How It Flows Together

### Registration (build time)

```
Package source files
    │
    ├── crouton.manifest.ts          → declares capabilities (metadata)
    │
    ├── app/app.config.ts            → registers runtime definitions
    │   ├── croutonApps.{id}         → app routes, page types
    │   └── croutonBlocks.{type}     → editor block definitions
    │
    └── nuxt.config.ts               → layer dependencies, component dirs
            │
            ▼
    Nuxt deep-merges all layers at build time
            │
            ▼
    Single appConfig with combined croutonApps + croutonBlocks
```

### Discovery (runtime)

```
useCroutonApps()                     useCroutonBlocks()
    │                                    │
    ├── hasApp('charts')                 ├── hasBlock('chartBlock')
    ├── hasApp('maps')                   ├── getBlock('chartBlock')
    ├── adminRoutes                      └── blocksList
    ├── dashboardRoutes                      │
    └── pageTypes                            ▼
        │                            Page editor discovers blocks
        ▼                            Creates TipTap extensions dynamically
    Sidebar navigation               User inserts via / menu
    Page tree page types
```

### Generation Pipeline (PLANNED — not yet built)

```
ARCHITECT              DESIGNER              CLI                 VIZ PRESETS           EDITOR
(schemas)              (components)          (infrastructure)    (charts/maps)         (pages)
───────────            ────────────          ────────────────    ─────────────         ──────

JSON schemas    →      Hints ($list/$card)   composables/        chartBlock presets    Public landing
Seed data              or custom .vue files  types/              mapBlock configs      Member dashboard
                                             server/api/         (deterministic)       Admin overview
                                             server/database/                          (TipTap JSON)
                                             standard components
```

## Summary Table

| Package | Collections | Editor Blocks | Atelier Blocks | Page Types | Admin Routes |
|---------|-------------|---------------|----------------|------------|--------------|
| **crouton-core** | (field types) | — | — | — | — |
| **crouton-pages** | pages | hero, section, cta, cardGrid, separator, richText, collection, faq, twoColumn, image, embed (11) | hero, text-page, blog | regular, collection-binder | /workspace |
| **crouton-bookings** | booking, location, settings (+2 conditional) | — | schedule, book-now, my-bookings, manage-bookings, manage-locations | booking | /bookings/** |
| **crouton-charts** | — | chartBlock | — | — | — |
| **crouton-maps** | — | mapBlock, collectionMapBlock | — | — | — |
| **crouton-auth** | 13 (user, member, session, etc.) | — | signup, manage-contacts | — | /members/** |
| **crouton-atelier** | atelierProject | — | (hosts registry) | — | /atelier/** |
| **crouton-email** | — | — | — | — | — |
| **crouton-assets** | — | — | — | — | /media |
| **crouton-editor** | — | (provides TipTap infra) | — | — | — |
| **crouton-collab** | — | — | — | — | — |
| **crouton-sales** | 10 (event, product, order, etc.) | — | — | — | /sales/** |
| **crouton-events** | — | — | — | — | — |
| **crouton-flow** | — | — | — | — | /flows/** |
| **crouton-i18n** | — | — | — | — | — |
| **crouton-ai** | — | — | — | — | — |
| **crouton-admin** | — | — | — | — | /super-admin/** |
| **crouton-triage** | — | — | — | — | — |
| **crouton-mcp** | — | — | — | — | — |
| **crouton-themes** | — | — | — | — | — |
| **crouton-devtools** | — | — | — | — | — |
