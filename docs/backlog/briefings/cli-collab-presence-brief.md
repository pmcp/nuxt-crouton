# Briefing: Add Collab Presence Support to CLI Generator

## Overview

Add a `collab` configuration option to the collection generator that automatically includes presence indicators in generated List.vue files, showing which users are currently editing items.

## Current State

- `nuxt-crouton-collab` package provides `CollabEditingBadge` component
- Presence is manually enabled by adding `show-collab-presence` prop to `CroutonCollection`
- No CLI support for auto-generating collab-enabled collections

## Goal

When a collection has `collab: true` in its config, the generated List.vue should:
1. Include `show-collab-presence` prop on `CroutonCollection`
2. Add necessary script setup code (`useSession`, `collabConfig` computed)

## Files to Modify

| File | Purpose |
|------|---------|
| `packages/nuxt-crouton-cli/lib/generators/list-component.mjs` | Main template - add collab props/script |
| `packages/nuxt-crouton-cli/lib/generate-collection.mjs` | Detect `collab` option from schema |
| `packages/nuxt-crouton-cli/CLAUDE.md` | Document new option |
| `.claude/skills/crouton.md` | Update collection options reference |

## Implementation Pattern

Follow the existing `translations` and `useMaps` patterns:

### 1. Schema Config (user provides)

```yaml
# collection.yaml
name: bookings
collab: true  # NEW OPTION
fields:
  - name: title
    type: string
```

### 2. Detection in generate-collection.mjs (~line 800)

```javascript
// After hierarchy/sortable detection
const collab = collectionConfig?.collab === true
```

Pass to generator:
```javascript
const data = {
  // ... existing fields
  collab: { enabled: collab }
}
```

### 3. List Component Generator (list-component.mjs)

**Add detection (~line 50):**
```javascript
const hasCollab = data?.collab?.enabled === true
```

**Update template section:**
```javascript
// In CroutonCollection props (around line 120)
${hasCollab ? '    :show-collab-presence="collabConfig"\n' : ''}
```

**Update script section:**
```javascript
// Add to imports/setup (around line 180)
${hasCollab ? `
// Get current user for presence filtering
const { data: session } = useSession()

// Collab presence config
const collabConfig = computed(() => ({
  roomType: 'page',
  currentUserId: session.value?.user?.id,
  pollInterval: 5000
}))
` : ''}
```

## Generated Output Example

**Before (no collab):**
```vue
<template>
  <CroutonCollection
    :layout="layout"
    collection="bookingsBookings"
    :columns="columns"
    :rows="bookings || []"
    :loading="pending"
  >
    <!-- ... -->
  </CroutonCollection>
</template>

<script setup lang="ts">
const { columns } = useBookingsBookings()
const { items: bookings, pending } = await useCollectionQuery('bookingsBookings')
</script>
```

**After (collab: true):**
```vue
<template>
  <CroutonCollection
    :layout="layout"
    collection="bookingsBookings"
    :columns="columns"
    :rows="bookings || []"
    :loading="pending"
    :show-collab-presence="collabConfig"
  >
    <!-- ... -->
  </CroutonCollection>
</template>

<script setup lang="ts">
const { columns } = useBookingsBookings()
const { items: bookings, pending } = await useCollectionQuery('bookingsBookings')

// Get current user for presence filtering
const { data: session } = useSession()

// Collab presence config
const collabConfig = computed(() => ({
  roomType: 'page',
  currentUserId: session.value?.user?.id,
  pollInterval: 5000
}))
</script>
```

## Testing

1. Create test collection with `collab: true`
2. Generate with CLI: `pnpm crouton generate`
3. Verify List.vue has presence props
4. Run app with two browser windows
5. Open same item in both - verify presence badges appear

## Edge Cases

- **No auth**: If `useSession` isn't available, presence still works but won't filter current user
- **No collab package**: If `nuxt-crouton-collab` not installed, badge component won't resolve (graceful fallback already in place)

## Future Enhancements

- `collab.roomType` - custom room type per collection
- `collab.pollInterval` - custom polling interval
- Form-level presence indicators (show who's editing the same form)
- Real-time cursor positions (requires Yjs awareness)

## Estimated Scope

- ~30 lines in list-component.mjs
- ~10 lines in generate-collection.mjs
- ~5 lines documentation updates
- Total: ~45 lines of code

## Dependencies

- Requires `@fyit/crouton-collab` to be extended in app
- Uses `useSession()` from `nuxt-crouton-auth`
