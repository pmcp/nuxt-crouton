# CLAUDE.md - @fyit/crouton-triage

## Package Purpose

Discussion-to-task triage system for Nuxt applications. Receives discussions from multiple sources (Slack, Figma, email), analyzes them with AI (Claude), detects actionable tasks, and creates Notion pages. Works as a Nuxt layer that integrates with `@fyit/crouton-core` and `@fyit/crouton-ai`.

## Key Files

| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Layer configuration, component registration, i18n setup |
| `crouton.manifest.ts` | Defines 8 collections with `triage` table prefix |
| `app/types/index.ts` | Core types: Flow, FlowInput, FlowOutput, ParsedDiscussion, AdapterConfig, etc. |
| `app/composables/useTriageOAuth.ts` | OAuth flow for Slack integration |
| `app/composables/useTriageAutoMatch.ts` | Auto-match users across platforms |
| `app/composables/useTriageNotionSchema.ts` | Fetch Notion database schema |
| `app/composables/useTriageNotionUsers.ts` | Fetch Notion workspace users |
| `app/composables/useTriageSlackUsers.ts` | Fetch Slack workspace users |
| `app/composables/useTriageFieldMapping.ts` | Notion field mapping configuration |
| `app/composables/useTriagePromptPreview.ts` | AI prompt preview and testing |
| `app/components/flows/FlowBuilder.vue` | Multi-step flow configuration wizard |
| `app/components/flows/FlowList.vue` | Flow list with create/edit actions |
| `app/components/flows/InputManager.vue` | Manage flow inputs (sources) |
| `app/components/flows/OutputManager.vue` | Manage flow outputs (Notion targets) |
| `app/components/usermappings/` | User mapping discovery and management |
| `server/adapters/` | Source adapters: Slack, Figma, Notion |
| `server/services/processor.ts` | Main processing pipeline (~2100 lines) |
| `server/services/ai.ts` | Claude AI analysis (summarization, task detection) |
| `server/services/notion.ts` | Notion API integration |
| `server/services/reply-generator.ts` | AI reply generation with personality |
| `server/services/userMapping.ts` | Cross-platform user mapping |
| `server/utils/domain-routing.ts` | AI-powered domain routing for multi-output flows |
| `server/api/crouton-triage/` | API endpoints |
| `schemas/` | 8 JSON schema definitions |

## Architecture

### Processing Pipeline

```
Source (Slack/Figma/Email)
  → Webhook received
  → Adapter parses incoming data
  → Find matching Flow + FlowInput
  → Build discussion thread
  → AI Analysis (Claude)
    ├── Summarize discussion
    ├── Detect actionable tasks
    └── Route to domains
  → Create Notion pages (per FlowOutput)
  → Post reply to source thread
  → Store in database
```

### Components (Prefixed: CroutonTriage)

```
CroutonTriage
├── flows/
│   ├── FlowBuilder.vue      - Multi-step flow configuration
│   ├── FlowList.vue          - Flow listing and management
│   ├── FlowPipelineVisual.vue - Visual pipeline diagram
│   ├── InputManager.vue      - Source input configuration
│   └── OutputManager.vue     - Notion output configuration
├── usermappings/
│   ├── UserMappingTable.vue  - Mapping list/table
│   ├── UserMappingDrawer.vue - Edit mapping drawer
│   ├── SlackUserDiscovery.vue - Discover Slack users
│   ├── FigmaUserDiscovery.vue - Discover Figma users
│   ├── NotionUserDiscovery.vue - Discover Notion users
│   └── NotionUserPicker.vue  - Notion user selection
├── shared/
│   └── PromptPreviewModal.vue - AI prompt preview
├── EmptyState.vue
└── LoadingSkeleton.vue
```

### API Endpoints

**Webhooks (no auth):**

| Path | Method | Purpose |
|------|--------|---------|
| `/api/crouton-triage/webhooks/slack` | POST | Slack event webhooks |
| `/api/crouton-triage/webhooks/slack-test` | POST | Slack webhook testing |
| `/api/crouton-triage/webhooks/figma-email` | POST | Figma email via Mailgun |
| `/api/crouton-triage/webhooks/resend` | POST | Figma email via Resend |
| `/api/crouton-triage/webhooks/notion` | POST | Notion task completion |
| `/api/crouton-triage/webhooks/notion-input` | POST | Notion as input source |

**Team-scoped (auth required):**

| Path | Method | Purpose |
|------|--------|---------|
| `/api/crouton-triage/teams/[id]/discussions/process` | POST | Manual discussion processing |
| `/api/crouton-triage/teams/[id]/discussions/[discussionId]/retry` | POST | Retry failed discussion |
| `/api/crouton-triage/teams/[id]/notion/users` | GET | List Notion users |
| `/api/crouton-triage/teams/[id]/notion/schema/[databaseId]` | GET | Get Notion DB schema |
| `/api/crouton-triage/teams/[id]/notion/test-connection` | POST | Test Notion connection |
| `/api/crouton-triage/teams/[id]/slack/users` | GET | List Slack users |
| `/api/crouton-triage/teams/[id]/user-mappings/bulk-import` | POST | Bulk import user mappings |
| `/api/crouton-triage/teams/[id]/ai/suggest-icons` | POST | AI icon suggestions |

**OAuth:**

| Path | Method | Purpose |
|------|--------|---------|
| `/api/crouton-triage/oauth/slack/install` | GET | Start Slack OAuth |
| `/api/crouton-triage/oauth/slack/callback` | GET | Slack OAuth callback |

**Utility:**

| Path | Method | Purpose |
|------|--------|---------|
| `/api/crouton-triage/health` | GET | Health check |
| `/api/crouton-triage/metrics` | GET | Processing metrics |

### Key Concepts

- **Flow**: A processing pipeline configuration (AI settings, domains, prompts)
- **FlowInput**: A source connection (Slack channel, Figma file, email address)
- **FlowOutput**: A Notion database target with field mapping and domain filter
- **AdapterConfig**: Slim type with only what adapters need (id, teamId, sourceType, apiToken, sourceMetadata, webhookUrl)
- **Domain Routing**: AI detects task domains and routes to matching FlowOutputs

## Configuration

### App Requirements

Apps using this package must enable KV storage for Slack OAuth state:

```typescript
hub: { db: 'sqlite', kv: true }
```

### Nuxt Config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-triage',
    './layers/triage'  // Generated collections (MUST be last)
  ],

  hub: { db: 'sqlite', kv: true },

  runtimeConfig: {
    croutonTriage: {
      anthropicApiKey: '',  // or NUXT_CROUTON_TRIAGE_ANTHROPIC_API_KEY
      slack: {
        clientId: '',
        clientSecret: '',
        signingSecret: ''
      },
      resend: {
        apiToken: '',
        webhookSigningSecret: ''
      }
    }
  }
})
```

## Common Tasks

### Add a New Adapter

1. Create `server/adapters/mySource.ts` extending `BaseAdapter`
2. Implement `parseIncoming()`, `fetchThread()`, `postReply()`
3. Register in `server/adapters/index.ts`

### Add a New Composable

1. Create `app/composables/useTriageFeature.ts`
2. Export composable function
3. Auto-imports via Nuxt layer

### Add a New Component

1. Create in `app/components/[Category]/MyComponent.vue`
2. Auto-registers as `CroutonTriage[Category]MyComponent`
3. Use Composition API with `<script setup lang="ts">`

### Add a New API Endpoint

1. Create in `server/api/crouton-triage/teams/[id]/endpoint.get.ts`
2. Use `defineEventHandler`
3. Use `resolveTeamAndCheckMembership(event)` for auth

## Dependencies

- **Required**: `@fyit/crouton-core`, `@fyit/crouton-ai`
- **Runtime**: `cheerio`, `human-id`
- **Peer**: `nuxt`, `zod`

## Table Naming Convention

Package expects tables prefixed with `triage`:

| Schema | Table Name |
|--------|------------|
| discussion.json | `triageDiscussions` |
| flow.json | `triageFlows` |
| flow-input.json | `triageFlowinputs` |
| flow-output.json | `triageFlowoutputs` |
| task.json | `triageTasks` |
| job.json | `triageJobs` |
| user-mapping.json | `triageUsermappings` |
| inbox-message.json | `triageInboxmessages` |

## i18n Keys

Translations in `i18n/locales/{en,nl,fr}.json`:

```
triage.
└── admin.*  - Admin sidebar labels
```

## Naming Conventions

```
Component: CroutonTriage[Category][Name]
Composable: useTriage[Feature]
API: /api/crouton-triage/teams/[id]/[resource]
Type: [Entity] (e.g., Flow, FlowInput, ParsedDiscussion)
Table: triage[Collection] (e.g., triageDiscussions)
```
