# Dependent Field CardMini Display - Technical Briefing

**Date:** 2025-01-17
**Status:** Ready for Implementation
**Complexity:** Medium
**Estimated Effort:** 4-6 hours

---

## Executive Summary

Dependent fields (fields that reference objects within another collection's JSON array) currently display only raw IDs in table columns. This briefing outlines the implementation of `CroutonDependentFieldCardMini` component to properly resolve and display these fields with support for custom rendering, caching, and consistent architecture.

**Example Use Case:**
- **Locations** collection has a `slots` field containing `[{id: '1', label: 'Morning'}, {id: '2', label: 'Afternoon'}]`
- **Bookings** collection has a `slot` field containing `['1']` (ID reference)
- **Goal:** Show "Morning" badge in Bookings table, not just "1"

---

## Problem Statement

### Current State

**In Source Collection (Locations):**
```typescript
// Data
slots: [{id: '1', label: 'Morning', value: 'morning'}, ...]

// Display (works perfectly)
<BookingsLocationsSlotsCardMini :value="row.original.slots" />
// Renders: [Morning] [Afternoon] badges
```

**In Target Collection (Bookings):**
```typescript
// Data
slot: '1'  // Just an ID!

// Display (BROKEN - shows raw ID)
<UBadge>{{ row.original.slot }}</UBadge>
// Renders: "1" (useless!)
```

**Generator TODO Comment** (list-component.mjs:76):
```javascript
// TODO: Could be enhanced to fetch and display the full item label
```

### Issues

1. **No component architecture** for dependent field display
2. **Inconsistent data models** (arrays in source, strings in target)
3. **Poor UX** (users see IDs instead of labels)
4. **No override pattern** for custom rendering
5. **Performance unknown** (should we pre-fetch or cache?)

---

## Current Architecture Analysis

### Pattern 1: Reference Fields (Cross-Collection)

**Component:** `CroutonItemCardMini`

```vue
<CroutonItemCardMini
  :id="row.original.locationId"
  collection="bookingsLocations"
/>
```

**How it works:**
- Data: Single ID string
- Fetches full item from another **collection**
- Uses `useCollectionItem(collection, id)` with cache key: `collection-item:{collection}:{id}`
- Resolves custom component: `Crouton{Collection}CardMini`
- Fallback: Shows `item.title` in badge

**File:** `packages/nuxt-crouton/app/components/ItemCardMini.vue`

### Pattern 2: Repeater Fields (Same Collection, JSON Array)

**Component:** Field-specific CardMini

```vue
<BookingsLocationsSlotsCardMini
  :value="row.original.slots"
/>
```

**How it works:**
- Data: Array of full objects `[{id, label, value}, ...]`
- No fetching needed (has all data)
- Component auto-generated in field folder
- Full custom control

**File:** `layers/bookings/collections/locations/app/components/Slot/CardMini.vue`

### Pattern 3: Dependent Fields (Cross-Collection, JSON Array Reference)

**Component:** `CroutonItemDependentField` (single value only!)

```vue
<CroutonItemDependentField
  :value-id="booking.slot"
  :parent-id="booking.locationId"
  parent-collection="bookingsLocations"
  parent-field="slots"
/>
```

**How it works:**
- Uses `useDependentFieldResolver` composable
- Fetches parent item using `useCollectionItem`
- Drills into parent's JSON array field
- Finds object by ID
- Shows single badge (no array support!)
- **NOT used in generators** (exists but incomplete)

**File:** `packages/nuxt-crouton/app/components/ItemDependentField.vue`

---

## Proposed Solution

### Architecture Decision: Extend ItemCardMini Pattern

Create `CroutonDependentFieldCardMini` that:
1. Follows `ItemCardMini` component resolution pattern
2. Uses caching for performance
3. Supports custom field-specific CardMini components
4. Handles both single and multiple selections
5. Always uses arrays for consistency

### Data Model: Always Arrays

**Decision: Use arrays for all dependent field values**

```typescript
// Single selection
slot: ['abc123']

// Multiple selection
slot: ['abc123', 'def456']

// Schema
slot: z.array(z.string())
```

**Rationale:**
- Consistent with reference field arrays (`refTarget` with `type: 'array'`)
- Future-proof for multiple selection
- Simpler schema (no union types)
- Easier database queries
- Component handles normalization

### Performance Strategy: Client-Side Caching

**Cache Behavior:**
```typescript
// useCollectionItem already caches!
cacheKey = `collection-item:bookingsLocations:location-123`
```

**Scenario: 100 bookings table load**
- 100 rows, all same location → **1 API call**
- 100 rows, 10 different locations → **10 API calls**
- Cache shared across entire app

**Why this is efficient:**
- No data duplication in database
- Smaller API responses
- Nuxt's `useFetch` handles caching automatically
- Cache persists across navigations

**Alternative Considered:** Server-side eager loading (`?expand=slot`)
- ❌ More complex implementation
- ❌ Larger API responses
- ❌ Data duplication
- ✅ Could be added later if needed

---

## Component Specification

### CroutonDependentFieldCardMini

**Location:** `packages/nuxt-crouton/app/components/DependentFieldCardMini.vue`

**Props:**
```typescript
interface Props {
  value: string | string[] | null       // ID(s) of selected option(s)
  dependentValue: string                // Parent item ID (e.g., locationId)
  dependentCollection: string           // Parent collection (e.g., 'bookingsLocations')
  dependentField: string                // Field in parent (e.g., 'slots')
  variant?: string                      // Future: 'CardMini', 'CardBig', etc.
}
```

**Behavior:**
1. Fetch parent item using `useCollectionItem(dependentCollection, dependentValue)`
2. Extract field array from parent item
3. Normalize `value` to array
4. Map IDs to full objects from field array
5. Try to resolve custom component: `Crouton{Collection}{Field}CardMini`
6. Pass resolved objects to custom component OR show fallback badges

**Component Resolution:**
```typescript
// Example: dependentCollection='bookingsLocations', dependentField='slots'
componentName = 'CroutonBookingsLocationsSlotsCardMini'

// Looks for auto-imported component (generated in field folder)
// Path: layers/bookings/collections/locations/app/components/Slot/CardMini.vue

// If not found, uses default badge rendering
```

**Pseudo-code:**
```vue
<script setup lang="ts">
// 1. Fetch parent item (cached!)
const { item: parentItem, pending } = await useCollectionItem(
  props.dependentCollection,
  computed(() => props.dependentValue)
)

// 2. Resolve custom component (mirrors ItemCardMini pattern)
const componentName = computed(() => {
  const collection = capitalize(props.dependentCollection)
  const field = capitalize(props.dependentField)
  return `Crouton${collection}${field}CardMini`
})

const customComponent = computed(() => {
  return useNuxtApp().vueApp.component(componentName.value) || null
})

// 3. Resolve IDs to full objects
const resolvedItems = computed(() => {
  const ids = Array.isArray(props.value) ? props.value : [props.value]
  const fieldData = parentItem.value?.[props.dependentField] || []

  return ids
    .map(id => fieldData.find(opt => opt.id === id))
    .filter(Boolean)
})
</script>

<template>
  <!-- Use custom component if exists -->
  <component
    v-if="customComponent"
    :is="customComponent"
    :value="resolvedItems"
  />

  <!-- Fallback: default badges -->
  <div v-else>
    <USkeleton v-if="pending" />
    <UBadge v-for="item in resolvedItems" :key="item.id">
      {{ item.label || item.value || item.id }}
    </UBadge>
  </div>
</template>
```

---

## Implementation Tasks

### 1. Create CroutonDependentFieldCardMini Component

**File:** `packages/nuxt-crouton/app/components/DependentFieldCardMini.vue`

**Requirements:**
- [ ] Accept props: value, dependentValue, dependentCollection, dependentField
- [ ] Fetch parent item using `useCollectionItem` (auto-cached)
- [ ] Normalize value to array
- [ ] Resolve IDs to full objects from parent's field array
- [ ] Try to resolve custom CardMini component
- [ ] Pass resolved objects to custom component or show fallback
- [ ] Handle loading states (skeleton)
- [ ] Handle error states
- [ ] Handle empty states

**Tests:**
- [ ] Single ID resolves correctly
- [ ] Array of IDs resolves correctly
- [ ] Uses custom component when available
- [ ] Falls back to default when no custom component
- [ ] Caching works (no duplicate fetches)

### 2. Update Field-Specific CardMini Template

**File:** `packages/nuxt-crouton-collection-generator/lib/generators/field-components.mjs`

**Changes:**
```javascript
// In generateCardMiniComponent function
function generateCardMiniComponent(fieldName, fieldPascalCase, collectionData) {
  return `<template>
  <div class="text-sm">
    <template v-if="normalizedValue.length > 0">
      <div class="flex flex-wrap gap-1">
        <UBadge
          v-for="(item, index) in normalizedValue.slice(0, 3)"
          :key="index"
          color="gray"
          variant="subtle"
        >
          {{ item.label || item.value || item }}
        </UBadge>
        <UBadge v-if="normalizedValue.length > 3" color="gray" variant="subtle">
          +{{ normalizedValue.length - 3 }} more
        </UBadge>
      </div>
    </template>
    <span v-else class="text-gray-400">—</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  value?: any[] | any | null  // Can be array of objects OR single object
}

const props = defineProps<Props>()

// Normalize to array for consistent handling
const normalizedValue = computed(() => {
  if (!props.value) return []
  return Array.isArray(props.value) ? props.value : [props.value]
})
</script>`
}
```

**Why:**
- Handles both source collection (array of objects) and target collection (resolved objects from DependentFieldCardMini)
- Consistent rendering regardless of context

### 3. Update List Component Generator

**File:** `packages/nuxt-crouton-collection-generator/lib/generators/list-component.mjs`

**Current Code (lines 74-83):**
```javascript
${dependentFields.map(field => {
  // TODO: Could be enhanced to fetch and display the full item label
  return `
    <template #${field.name}-cell="{ row }">
      <UBadge v-if="row.original.${field.name}" color="gray" variant="subtle">
        {{ row.original.${field.name} }}
      </UBadge>
      <span v-else class="text-gray-400">—</span>
    </template>`
}).join('')}
```

**New Code:**
```javascript
${dependentFields.map(field => {
  // Resolve the dependent collection with layer prefix
  const dependentCollectionCases = toCase(field.meta.dependsOnCollection)
  const resolvedDependentCollection = `${layerPascalCase.toLowerCase()}${dependentCollectionCases.pascalCasePlural}`

  return `
    <template #${field.name}-cell="{ row }">
      <CroutonDependentFieldCardMini
        v-if="row.original.${field.name} && row.original.${field.meta.dependsOn}"
        :value="row.original.${field.name}"
        :dependent-value="row.original.${field.meta.dependsOn}"
        dependent-collection="${resolvedDependentCollection}"
        dependent-field="${field.meta.dependsOnField}"
      />
      <span v-else class="text-gray-400">—</span>
    </template>`
}).join('')}
```

### 4. Update Select Component Template

**File:** `packages/nuxt-crouton-collection-generator/lib/generators/field-components.mjs`

**In generateSelectComponent function:**
```javascript
// Update props interface
interface Props {
  modelValue?: string[] | null  // Changed from string | null to string[] | null
  multiple?: boolean             // New optional prop
  // ... other props
}

// Update handleSelect
const handleSelect = (id: string) => {
  if (props.multiple) {
    const current = props.modelValue || []
    const newValue = current.includes(id)
      ? current.filter(i => i !== id)
      : [...current, id]
    emit('update:modelValue', newValue)
  } else {
    // Single selection still uses array
    emit('update:modelValue', [id])
  }
}

// Add selection check helper
const isSelected = (id: string) => {
  return props.modelValue?.includes(id) ?? false
}
```

**Template changes:**
```vue
<UButton
  v-for="option in options"
  :key="option.id"
  :variant="isSelected(option.id) ? 'solid' : 'outline'"
  :color="isSelected(option.id) ? 'primary' : 'gray'"
  @click="handleSelect(option.id)"
>
  {{ option.label }}
</UButton>
```

### 5. Update Form Component Generator

**File:** `packages/nuxt-crouton-collection-generator/lib/generators/form-component.mjs`

**In generateFieldMarkup function (around line 95):**

**Current:**
```javascript
return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <CroutonFormDependentFieldLoader
            v-model="state.${field.name}"
            :dependent-value="state.${dependsOn}"
            dependent-collection="${resolvedCollection}"
            dependent-field="${dependsOnField}"
            dependent-label="${dependentLabel}"
          />
        </UFormField>`
```

**Ensure v-model passes/receives arrays** (already correct if using v-model)

### 6. Update Composable Generator (Schema Generation)

**File:** `packages/nuxt-crouton-collection-generator/lib/generators/composable.mjs`

**Ensure dependent fields use array schema:**
```javascript
// In fieldsSchema generation
if (field.meta?.dependsOn) {
  // Dependent field - always array of IDs
  return `${field.name}: z.array(z.string())`
}
```

---

## Migration Considerations

### Existing Collections with Dependent Fields

**Data Migration:**
```javascript
// Old: string
slot: 'abc123'

// New: array
slot: ['abc123']
```

**Migration script:**
```typescript
// In database migration
await db.update(bookings)
  .set({
    slot: sql`json_array(slot)`  // SQLite: Wrap string in array
  })
  .where(sql`slot IS NOT NULL AND json_type(slot) = 'text'`)
```

**Or handle in composable with backward compatibility:**
```typescript
// In useCollectionItem transform
if (item.slot && typeof item.slot === 'string') {
  item.slot = [item.slot]
}
```

---

## Testing Requirements

### Unit Tests

**Test: `DependentFieldCardMini.test.ts`**
- [ ] Renders custom component when available
- [ ] Shows fallback when no custom component
- [ ] Handles single ID
- [ ] Handles array of IDs
- [ ] Shows loading state while fetching
- [ ] Handles missing parent item
- [ ] Handles missing field in parent
- [ ] Handles ID not found in field array

### Integration Tests

**Test: `DependentFieldDisplay.test.ts`**
- [ ] Full flow: Bookings table → Location fetch → Slot resolution → CardMini display
- [ ] Caching prevents duplicate fetches
- [ ] Multiple rows with same parent use cached data
- [ ] Form selection updates table display

### E2E Tests

**Test: `dependent-field-workflow.spec.ts`**
- [ ] Create location with slots
- [ ] Create booking with slot selection
- [ ] Verify slot displays correctly in bookings table
- [ ] Update slot in location
- [ ] Verify booking table updates
- [ ] Delete location slot
- [ ] Verify booking shows empty state

---

## Success Criteria

- [ ] Dependent fields show labels instead of IDs in tables
- [ ] Custom CardMini components work for dependent fields
- [ ] No duplicate API calls (caching works)
- [ ] Both single and multiple selection supported
- [ ] Consistent data model (always arrays)
- [ ] Override pattern works (can create custom CardMini)
- [ ] Generator automatically creates correct templates
- [ ] Documentation updated

---

## Example Usage

### Generated List Component

```vue
<template>
  <CroutonCollection :rows="bookings">
    <!-- Reference field: Cross-collection -->
    <template #location-cell="{ row }">
      <CroutonItemCardMini
        :id="row.original.location"
        collection="bookingsLocations"
      />
    </template>

    <!-- Dependent field: Cross-collection, JSON array reference -->
    <template #slot-cell="{ row }">
      <CroutonDependentFieldCardMini
        v-if="row.original.slot && row.original.location"
        :value="row.original.slot"
        :dependent-value="row.original.location"
        dependent-collection="bookingsLocations"
        dependent-field="slots"
      />
    </template>
  </CroutonCollection>
</template>
```

### Data Flow

```
1. Bookings table loads
   bookings = [
     { id: '1', location: 'loc-123', slot: ['slot-abc'] },
     { id: '2', location: 'loc-123', slot: ['slot-def'] }
   ]

2. First row renders:
   <CroutonDependentFieldCardMini
     value="['slot-abc']"
     dependent-value="loc-123"
     dependent-collection="bookingsLocations"
     dependent-field="slots"
   />

3. Component fetches parent (CACHED):
   useCollectionItem('bookingsLocations', 'loc-123')
   → { id: 'loc-123', slots: [{id: 'slot-abc', label: 'Morning'}, ...] }

4. Resolves IDs to objects:
   ['slot-abc'] → [{ id: 'slot-abc', label: 'Morning' }]

5. Tries to find custom component:
   'CroutonBookingsLocationsSlotsCardMini'
   → Found! (auto-imported from layers/bookings/collections/locations/app/components/Slot/CardMini.vue)

6. Passes to custom CardMini:
   <BookingsLocationsSlotsCardMini :value="[{ id: 'slot-abc', label: 'Morning' }]" />

7. Custom CardMini renders:
   <UBadge>Morning</UBadge>

8. Second row renders:
   → Uses CACHED location data (no API call!)
   → Shows 'Afternoon' badge
```

---

## Files to Create/Modify

### Create
- `packages/nuxt-crouton/app/components/DependentFieldCardMini.vue`
- `packages/nuxt-crouton/app/components/DependentFieldCardMini.test.ts` (optional)

### Modify
- `packages/nuxt-crouton-collection-generator/lib/generators/field-components.mjs`
  - Update `generateCardMiniComponent()` - handle single/array normalization
  - Update `generateSelectComponent()` - array modelValue, multiple support

- `packages/nuxt-crouton-collection-generator/lib/generators/list-component.mjs`
  - Update dependent field template generation (line 74-83)

- `packages/nuxt-crouton-collection-generator/lib/generators/composable.mjs`
  - Ensure dependent fields use array schema

### Regenerate (after generator changes)
- All existing collections with dependent fields
- Test with EchafTest bookings/locations example

---

## Open Questions

1. **Component naming:** Should variant be part of name? (CardMini vs Card)
   - **Recommendation:** Keep 'CardMini' suffix, add variant prop later if needed

2. **Multiple selection UI:** Different button style? Checkboxes?
   - **Recommendation:** Start with button group, checkboxes optional later

3. **Max items to display:** Current is 3, should this be configurable?
   - **Recommendation:** Make it a prop with default 3

4. **Error handling:** What if parent item deleted but dependent still references it?
   - **Recommendation:** Show "Not found" badge, don't break table

---

## Next Steps

1. Review this briefing with team
2. Assign to ui-builder agent for implementation
3. Create test plan
4. Implement component
5. Update generators
6. Test with EchafTest
7. Document in main docs
8. Update migration guide if needed

---

## References

- Existing patterns: `ItemCardMini.vue`, `ItemDependentField.vue`
- Caching: `useCollectionItem.ts` (line 62-93)
- Generator: `list-component.mjs`, `field-components.mjs`
- Example: `/Users/pmcp/Projects/EchafTest/layers/bookings/collections/locations`
