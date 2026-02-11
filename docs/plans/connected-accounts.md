# RFC: Connected Services for crouton-triage

**Status**: Draft
**Date**: 2026-02-11
**Package**: `packages/crouton-triage`

---

## Problem

Tokens are stored inline on per-flow records:

- `FlowInput.apiToken` — Slack bot token or Figma PAT, stored per input per flow
- `FlowOutput.outputConfig.notionToken` — Notion token stored per output per flow

This creates:

1. **Token duplication** — same workspace on 3 flows = 3 OAuth flows + 3 token copies
2. **Rotation pain** — token expires? Update N records
3. **Re-OAuth fatigue** — new flow for same Slack workspace = full OAuth dance
4. **No visibility** — no single view of "what's connected to this team"

## Proposal

Add a team-scoped `triageServices` collection. Inputs/outputs reference services by ID instead of storing tokens inline.

```
Before:
  Flow A → Input (apiToken: "xoxb-...")
  Flow A → Input (apiToken: "figd_...")       ← Figma PAT
  Flow A → Output (outputConfig: { notionToken: "secret_..." })
  Flow B → Input (apiToken: "xoxb-...")       ← same Slack token, duplicated

After:
  Team → Service "FYIT Slack" (provider: slack, accessToken: encrypted)
  Team → Service "Design Figma" (provider: figma, accessToken: encrypted)
  Team → Service "Notion Workspace" (provider: notion, accessToken: encrypted)
  Flow A → Input (serviceId: "svc_1")         ← reference
  Flow A → Input (serviceId: "svc_2", emailSlug: "figma-comments")
  Flow B → Input (serviceId: "svc_1")         ← same reference, no re-auth
  Flow A → Output (serviceId: "svc_3", outputConfig: { databaseId, fieldMapping })
```

## How Each Provider Works Today

Understanding the differences is critical — they each connect differently:

### Slack (OAuth-based)
- **Connection**: Full OAuth flow (popup → Slack authorize → callback)
- **Token type**: Bot token (`xoxb-...`), does not expire
- **Stored on**: `FlowInput.apiToken`
- **Used for**: Fetch threads, post replies, add reactions, list users
- **Identifier**: `slackTeamId` in `sourceMetadata`
- **Input matching**: By `sourceMetadata.slackTeamId`

### Figma (Manual PAT)
- **Connection**: User manually enters a Personal Access Token
- **Token type**: PAT (`figd_...`), long-lived
- **Stored on**: `FlowInput.apiToken` (set manually, NOT via OAuth)
- **Used for**: Fetch comment threads, post replies, add reactions
- **Input is email-based**: Comments arrive via email webhook (Mailgun/Resend), NOT Figma API
- **Input matching**: By `emailSlug` (the email address prefix)
- **Key difference**: The email webhook is the input trigger, but the Figma API (using the PAT) is needed for fetching the full thread and posting replies

### Notion (Manual API token, used as both input AND output)
- **As output**: API token stored in `FlowOutput.outputConfig.notionToken`
- **As input**: Token in `FlowInput.sourceMetadata.notionToken` or `FlowInput.apiToken`
- **Token type**: Internal integration token (`secret_...`)
- **Used for**: Create pages (output), fetch pages (input), list users, get schema
- **Input matching**: By `sourceMetadata.notionWorkspaceId`

### Summary: What a "service" means per provider

| Provider | Token source | Token used for | Dedup key |
|----------|-------------|----------------|-----------|
| Slack | OAuth flow | API calls (threads, replies, reactions, users) | `slackTeamId` |
| Figma | Manual PAT | API calls (threads, replies, reactions) | User-provided label or Figma user ID |
| Notion | Manual token | API calls (create pages, fetch schema, list users) | Notion workspace ID |

---

## Schema: `schemas/service.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | yes | slack, notion, figma, github, linear |
| `label` | string | yes | User-friendly name ("FYIT Slack Workspace", "Design Team Figma") |
| `providerAccountId` | string | yes | Provider's unique ID for dedup (Slack team ID, Notion workspace ID, or user-provided for Figma) |
| `accessToken` | string | yes | Encrypted via `encryptSecret()` from crouton-core |
| `accessTokenHint` | string | no | Masked display hint ("xoxb-...4xkQ") via `maskSecret()` |
| `refreshToken` | string | no | Encrypted, for future OAuth refresh flows |
| `tokenExpiresAt` | date | no | Token expiry timestamp |
| `scopes` | string | no | OAuth scopes granted (Slack only) |
| `providerMetadata` | json | no | Provider-specific data (workspace name, bot user ID, etc.) |
| `status` | string | yes | connected / expired / revoked / error (default: "connected") |
| `lastVerifiedAt` | date | no | Last successful API call with this token |

Auto-generated fields (by crouton generator): `id`, `teamId`, `owner`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

### Changes to existing schemas

**input.json** — add:
```json
"serviceId": { "type": "string", "refTarget": "services", "meta": { "label": "Connected Service" } }
```

**output.json** — add:
```json
"serviceId": { "type": "string", "refTarget": "services", "meta": { "label": "Connected Service" } }
```

---

## Token Resolution

### Core principle
`AdapterConfig.apiToken` is the only token field adapters see. Resolution happens **before** adapters are called. **Zero adapter changes needed.**

### New utility: `server/utils/tokenResolver.ts`

```typescript
// For inputs (Slack, Figma, Notion-as-input)
async function resolveInputToken(input, teamId): Promise<string>
  // 1. If input.serviceId → lookup service, decryptSecret(service.accessToken)
  // 2. Else → return input.apiToken || input.sourceMetadata?.notionToken (backward compat)

// For outputs (Notion, future: GitHub, Linear)
async function resolveOutputToken(output, teamId): Promise<string>
  // 1. If output.serviceId → lookup service, decryptSecret(service.accessToken)
  // 2. Else → return output.outputConfig.notionToken (backward compat)
```

### Affected code in processor.ts

3 places build `AdapterConfig` from `flowData.matchedInput.apiToken`:

| Location | Stage | Current code |
|----------|-------|-------------|
| Line ~1212 | 2.25 (initial reaction) | `apiToken: flowData.matchedInput.apiToken \|\| ''` |
| Line ~1387 | 3 (thread building) | `apiToken: flowData.matchedInput.apiToken \|\| flowData.matchedInput.sourceMetadata?.notionToken \|\| ''` |
| Line ~1577 | 5 (reply) | `apiToken: flowData.matchedInput.apiToken \|\| ''` |

**Change**: Resolve token once after `loadFlow()` (~line 1185), reuse in all 3.

### Affected code in notion.ts

`createNotionConfigFromOutput()` (~line 120) reads `output.outputConfig.notionToken`. Changed to call `resolveOutputToken()`. Needs `teamId` as new parameter.

---

## Connection Flow Per Provider

### Slack: OAuth → Service
1. User clicks "Connect Slack" → OAuth popup
2. Callback exchanges code for `access_token`
3. **NEW**: Query `triageServices` by `(teamId, provider='slack', providerAccountId=slackTeamId)`
4. If exists → update token (re-auth refreshes it)
5. If not → create service with `encryptSecret(accessToken)`
6. Create FlowInput with `serviceId: service.id` (no inline `apiToken`)
7. If existing input has inline token for same workspace → auto-migrate to `serviceId`

### Figma: Manual Token → Service
1. User clicks "Connect Figma" in Service Manager
2. Pastes Figma PAT, provides label (e.g. "Design Team Figma")
3. **NEW**: Service created with encrypted token
4. When adding Figma input to a flow: select service from picker + configure email slug
5. FlowInput gets `serviceId: service.id` + `emailSlug` + `emailAddress`
6. The email webhook triggers remain unchanged — `emailSlug` still matches inputs
7. `resolveInputToken()` fetches the Figma PAT from the service for API calls (fetch thread, post reply)

### Notion: Manual Token → Service
1. User clicks "Connect Notion" in Service Manager
2. Pastes Notion API token, provides label
3. **NEW**: Service created with encrypted token, `providerAccountId` from workspace discovery
4. When adding Notion output: select service from picker + configure `databaseId` + `fieldMapping`
5. FlowOutput gets `serviceId: service.id` + `outputConfig: { databaseId, fieldMapping }` (no more `notionToken` in outputConfig)
6. For Notion-as-input: same pattern — FlowInput gets `serviceId` instead of inline token

---

## New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `teams/[id]/services/[serviceId]/verify` | POST | Test token validity (Slack `auth.test`, Figma `/me`, Notion `users/me`), updates status |
| `teams/[id]/services/connect` | POST | Manual service creation (Figma PAT, Notion token), encrypts + deduplicates |

### Updated endpoints (backward compat: accept `serviceId` OR inline token)

- `teams/[id]/slack/users.get.ts` — accept `?serviceId=` or `?slackToken=`
- `teams/[id]/notion/users.get.ts` — accept `?serviceId=` or `?notionToken=`
- `teams/[id]/notion/schema/[databaseId].get.ts` — accept `?serviceId=` or `?notionToken=`
- `teams/[id]/notion/test-connection.post.ts` — accept `serviceId` or `notionToken` in body

---

## UI Components

### New: `ServicePicker.vue`
Reusable dropdown for selecting a connected service. Props: `modelValue` (serviceId), `provider`, `teamId`. Shows label + status badge + token hint. "Connect new" action at bottom.

### New: `ServiceManager.vue`
Team-level list of all connected services. Shows provider icon, label, status, lastVerifiedAt, usage count. Actions: verify, delete (with safety check), reconnect. "Add Service" dropdown per provider type.

### Updated: `InputManager.vue`
- **Slack**: Replace direct OAuth + apiToken field with `<ServicePicker provider="slack">`. "Connect new" triggers OAuth which creates the service.
- **Figma**: Replace manual apiToken field with `<ServicePicker provider="figma">`. "Connect new" opens dialog to paste PAT. Email slug + email address fields remain unchanged.
- **Notion-as-input**: Same pattern with `<ServicePicker provider="notion">`.

### Updated: `OutputManager.vue`
- **Notion**: Replace inline `notionToken` input with `<ServicePicker provider="notion">`. Keep `databaseId` + `fieldMapping` in `outputConfig`. "Fetch Schema" uses serviceId instead of raw token.

### Updated: `Panel.vue`
Add "Connected Services" section rendering `<ServiceManager>`.

---

## Composables

### New: `useTriageServices.ts`
- `fetchServices()` — list all for team
- `getServicesByProvider(provider)` — filtered computed
- `verifyService(serviceId)` — calls verify endpoint
- `createManualService(data)` — calls connect endpoint (for Figma PAT, Notion token)

### Updated: `useTriageOAuth.ts`
- Success callback receives `{ serviceId, inputId }` instead of raw credentials

### Updated: `useTriageNotionSchema.ts`
- Accept `serviceId` as alternative to `notionToken`

---

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Existing input with inline `apiToken`, no `serviceId` | Works — falls back to `apiToken` |
| Existing output with `outputConfig.notionToken`, no `serviceId` | Works — falls back to `notionToken` |
| New Slack input created via OAuth | Gets `serviceId`, no inline token |
| New Figma input | Gets `serviceId` + `emailSlug`, no inline `apiToken` |
| New Notion output | Gets `serviceId`, `outputConfig` has `databaseId`+`fieldMapping` only |
| Re-OAuth for existing Slack workspace | Service updated, input auto-migrated |
| Service deleted while referenced | Prevention: UI warns about usage count |
| Service token expired | `resolveServiceToken` throws, error logged in job |
| Fresh project with no services | Everything works — `serviceId` is optional, inline tokens are fallback |

---

## Encryption

Reuses existing `packages/crouton-core/server/utils/encryption.ts`:
- `encryptSecret(plaintext)` → AES-256-GCM encrypted string
- `decryptSecret(encrypted)` → plaintext
- `maskSecret(value)` → display hint ("xoxb-...4xkQ")
- `isEncryptedSecret(value)` → boolean check

Requires `NUXT_ENCRYPTION_KEY` env var (32-byte base64).

---

## Files Changed

All paths relative to `packages/crouton-triage/`:

| File | Change |
|------|--------|
| `schemas/service.json` | **NEW** |
| `schemas/input.json` | Add `serviceId` |
| `schemas/output.json` | Add `serviceId` |
| `crouton.manifest.ts` | Register service collection |
| `app/types/index.ts` | Add `ConnectedService`, `ServiceProvider` types; add `serviceId` to FlowInput/FlowOutput |
| `server/utils/tokenResolver.ts` | **NEW** — centralized token resolution |
| `server/services/processor.ts` | Use `resolveInputToken` at 3 points |
| `server/services/notion.ts` | Use `resolveOutputToken` in `createNotionConfigFromOutput` |
| `server/api/.../oauth/slack/callback.get.ts` | Create service, reference from input |
| `server/api/.../teams/[id]/services/[serviceId]/verify.post.ts` | **NEW** |
| `server/api/.../teams/[id]/services/connect.post.ts` | **NEW** |
| `server/api/.../teams/[id]/slack/users.get.ts` | Accept `serviceId` |
| `server/api/.../teams/[id]/notion/users.get.ts` | Accept `serviceId` |
| `server/api/.../teams/[id]/notion/schema/[databaseId].get.ts` | Accept `serviceId` |
| `server/api/.../teams/[id]/notion/test-connection.post.ts` | Accept `serviceId` |
| `app/composables/useTriageServices.ts` | **NEW** |
| `app/composables/useTriageOAuth.ts` | Return `serviceId` |
| `app/composables/useTriageNotionSchema.ts` | Accept `serviceId` |
| `app/components/flows/ServicePicker.vue` | **NEW** |
| `app/components/flows/ServiceManager.vue` | **NEW** |
| `app/components/flows/InputManager.vue` | Use ServicePicker for Slack + Figma |
| `app/components/flows/OutputManager.vue` | Use ServicePicker for Notion |
| `app/components/Panel.vue` | Add services section |

---

## Implementation Phases

1. **Schema + types** — service.json, manifest, types (no runtime changes)
2. **Token resolver** — new utility + processor/notion updates (backward compat, no UI)
3. **OAuth callback** — create services on Slack OAuth, reference from inputs
4. **API endpoints** — verify, connect, update proxies for serviceId
5. **Composables** — useTriageServices + updates
6. **UI** — ServicePicker, ServiceManager, InputManager/OutputManager updates
7. **Test app** — regenerate collections, migrate database

---

## Open Questions

1. Do we need a migration script for existing inline tokens → services, or is gradual migration sufficient?
2. Should the "Connected Services" section live in the flow detail panel or in a separate team settings page?
3. For Figma: should `providerAccountId` be the Figma user email (from `/me` API call) or a user-provided identifier?
4. Should we add a Figma `/me` verification step when creating a Figma service (to auto-populate label and providerAccountId)?
