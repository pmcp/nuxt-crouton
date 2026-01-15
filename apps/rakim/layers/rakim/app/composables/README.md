# Discubot Composables

This directory contains reusable composables extracted from custom components to protect them from Crouton regeneration.

## Purpose

During the flows redesign (Phase 1), custom logic was extracted from `configs/Form.vue` into composables. This allows:
- **Protection from regeneration**: Crouton won't overwrite these files
- **Reusability**: Can be used in flow-related components later
- **Maintainability**: Easier to test and update logic
- **Separation of concerns**: UI vs business logic

## Available Composables

### `useFlowOAuth(config)`

Handles OAuth authorization flows in popup windows.

**Purpose**: Manages Slack/Figma OAuth without full-page redirect, preserving form state.

**Usage**:
```ts
const { openOAuthPopup, waitingForOAuth, oauthInstallUrl } = useFlowOAuth({
  teamId: currentTeam.value.id,
  provider: 'slack', // or 'figma'
  onSuccess: (credentials) => {
    // Merge OAuth credentials into form
    state.value.apiToken = credentials.apiToken
    state.value.sourceMetadata = credentials.sourceMetadata
  },
  onError: (error) => {
    console.error('OAuth failed:', error)
  }
})

// In template
<UButton @click="openOAuthPopup">Connect with Slack</UButton>
```

**Features**:
- Opens OAuth in popup window (600x800px, centered)
- Listens for `postMessage` from popup
- Handles success/error messages
- Automatic cleanup of event listeners

---

### `useNotionSchema()`

Fetches Notion database schema from API.

**Purpose**: Retrieve database properties and types for auto-mapping.

**Usage**:
```ts
const { fetchNotionSchema, schema, loading, error, clearSchema } = useNotionSchema()

// Fetch schema
await fetchNotionSchema({
  databaseId: 'abc123def456',
  notionToken: 'secret_xyz'
})

// Access results
if (schema.value) {
  console.log('Properties:', schema.value.properties)
  console.log('Database title:', schema.value.databaseTitle)
}

// Clear when done
clearSchema()
```

**Returns**:
- `schema`: Fetched schema object with properties
- `loading`: Boolean indicating fetch in progress
- `error`: Error message if fetch failed
- `fetchNotionSchema()`: Function to trigger fetch
- `clearSchema()`: Function to clear state

---

### `useFieldMapping()`

Provides fuzzy matching utilities for field mapping.

**Purpose**: Auto-generate mappings between AI fields and Notion properties.

**Usage**:
```ts
const {
  generateAutoMapping,
  calculateSimilarity,
  findBestMatch,
  generateValueMapping,
  getPropertyTypeColor
} = useFieldMapping()

// Generate complete auto-mapping
const mapping = generateAutoMapping(notionSchema, {
  aiFields: ['priority', 'type', 'assignee'],
  similarityThreshold: 0.5
})

// Result:
// {
//   priority: {
//     notionProperty: 'Priority',
//     propertyType: 'select',
//     valueMap: { high: 'P1', medium: 'P2', low: 'P3' }
//   },
//   type: {
//     notionProperty: 'Type',
//     propertyType: 'select',
//     valueMap: { bug: 'Bug', feature: 'Feature' }
//   }
// }

// Calculate similarity between strings
const score = calculateSimilarity('priority', 'Priority') // 0.8-1.0

// Find best match for AI field
const match = findBestMatch('priority', notionSchema.properties)

// Get color for badge
const color = getPropertyTypeColor('select') // 'blue'
```

**Fuzzy Matching Algorithm**:
- Exact match: 1.0 score
- Substring match: 0.8 score
- Prefix match: proportional score

---

### `usePromptPreview()`

Builds prompt previews for AI customization.

**Purpose**: Show users exactly what will be sent to Claude.

**Note**: This composable already existed before Phase 1 and is documented here for completeness.

**Usage**:
```ts
const { buildPreview } = usePromptPreview()

const preview = buildPreview(
  customSummaryPrompt,
  customTaskPrompt
)

console.log(preview)
// {
//   summaryPrompt: "...",
//   taskPrompt: "...",
//   summaryCharCount: 450,
//   taskCharCount: 620,
//   summaryTokenEstimate: 112,
//   taskTokenEstimate: 155
// }
```

---

## Testing Composables

Each composable can be tested independently:

```ts
import { describe, it, expect } from 'vitest'
import { calculateSimilarity, generateAutoMapping } from '#layers/discubot/composables/useFieldMapping'

describe('useFieldMapping', () => {
  it('calculates exact match similarity', () => {
    expect(calculateSimilarity('priority', 'priority')).toBe(1.0)
  })

  it('generates auto-mapping from schema', () => {
    const schema = {
      properties: {
        'Priority': { type: 'select', options: [{ name: 'P1' }] },
        'Task Type': { type: 'select', options: [{ name: 'Bug' }] }
      }
    }

    const mapping = generateAutoMapping(schema)
    expect(mapping.priority.notionProperty).toBe('Priority')
  })
})
```

---

## Migration Notes

### Original Location
- **Before**: Logic embedded in `layers/discubot/collections/configs/app/components/Form.vue`
- **After**: Extracted to `layers/discubot/composables/*.ts`

### What Was Extracted
1. **OAuth Logic** (lines 1275-1372): `openOAuthPopup()`, `handleOAuthMessage()`, event listeners
2. **Field Mapping** (lines 878-1238): `fetchNotionSchema()`, fuzzy matching, auto-mapping
3. **Prompt Preview**: Already existed in separate composable

### Components Using These Composables

**Current**:
- `layers/discubot/collections/configs/app/components/Form.vue`

**Future (after flows generation)**:
- `layers/discubot/components/flows/FlowBuilder.vue`
- `layers/discubot/components/flows/InputManager.vue`
- `layers/discubot/components/flows/OutputManager.vue`

---

## Architecture Decision

**Why Composables Instead of Services?**
- ✅ **Vue 3 pattern**: Composables are the recommended pattern for shared logic
- ✅ **Reactivity**: Automatic reactive state management with `ref()`/`computed()`
- ✅ **Auto-imports**: Nuxt auto-imports composables from this directory
- ✅ **Type-safe**: Full TypeScript support with type inference
- ✅ **Testable**: Can be tested without mounting components

**When to Use Services Instead?**
- When logic doesn't need reactivity (pure functions)
- When logic is server-side only
- When implementing complex patterns (singleton, factory, etc.)

---

## Related Documentation

- [Flows Redesign Brief](../../docs/briefings/flows-redesign-brief.md)
- [Flows Redesign Tracker](../../docs/FLOWS_REDESIGN_TRACKER.md)
- [CLAUDE.md](../../CLAUDE.md) - Project guidelines

---

**Last Updated**: 2025-11-20 (Phase 1, Task 1.1)
