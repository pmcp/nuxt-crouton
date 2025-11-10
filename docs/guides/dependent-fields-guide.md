# Dependent Fields Guide

## Overview

Dependent fields are fields that reference objects within another collection's JSON array. For example, a `Bookings` collection might have a `slot` field that references items within a `Location`'s `slots` array.

## Type Requirements

### ModelValue Type

**Important:** Dependent field `modelValue` must be of type `string[] | null`, never an empty string `''`.

#### ✅ Correct Initialization

```typescript
// In your collection composable
export const useBookingsBookings = () => {
  const schema = z.object({
    slot: z.array(z.string()).min(1, 'At least one slot is required'),
    // ... other fields
  })

  const defaultValues = {
    slot: null,  // ✅ Correct - use null
    // ... other fields
  }

  return {
    schema,
    defaultValues,
    // ...
  }
}
```

#### ❌ Incorrect Initialization

```typescript
const defaultValues = {
  slot: '',  // ❌ Wrong - will cause Vue warnings
}
```

### Why Array Type?

Dependent fields use arrays for consistency and future-proofing:
- **Single selection:** `['slot-id-123']` (array with one item)
- **Multiple selection:** `['slot-id-123', 'slot-id-456']` (array with multiple items)

This approach:
- Simplifies schema definitions (no union types)
- Makes components more consistent
- Enables easy switching between single/multiple selection
- Aligns with reference field patterns

## Component Naming Convention

### Card Components Use Singular Names

Card components should follow **singular naming conventions**, even though field names are plural in data:

```
Field name (plural): slots
Component name (singular): Slot
Full component: BookingsLocationsSlotCardMini
```

#### ✅ Correct Component Structure

```
layers/bookings/collections/locations/app/components/
  └── Slot/              # Singular - correct!
      ├── CardMini.vue
      ├── CardMedium.vue
      ├── Select.vue
      └── Input.vue
```

#### ❌ Incorrect Component Structure

```
layers/bookings/collections/locations/app/components/
  └── Slots/             # Plural - incorrect!
      └── CardMini.vue
```

### Automatic Singularization

The `FormDependentSelectOption` component automatically converts plural field names to singular for component resolution:

```typescript
// Field name in data
slot: ['abc123']  // field name: "slots" (plural)

// Component resolution
// "slots" → singularized to "slot" → "SlotCardMini"
<CroutonFormDependentSelectOption
  dependent-field="slots"  // Plural in data
  card-variant="Mini"
  // Resolves to: BookingsLocationsSlotCardMini (singular component)
/>
```

Singularization handles common patterns:
- `slots` → `slot`
- `items` → `item`
- `entries` → `entry`
- `categories` → `category`

## Usage Examples

### Basic Usage

```vue
<template>
  <CroutonFormDependentFieldLoader
    v-model="booking.slot"
    dependent-value="booking.location"
    dependent-collection="bookingsLocations"
    dependent-field="slots"
  />
</template>

<script setup lang="ts">
const booking = ref({
  location: 'loc-123',
  slot: null  // Initialize with null, not ''
})
</script>
```

### With Custom Card Variant

```vue
<CroutonFormDependentFieldLoader
  v-model="booking.slot"
  dependent-value="booking.location"
  dependent-collection="bookingsLocations"
  dependent-field="slots"
  card-variant="Medium"  # Uses SlotCardMedium component
  :multiple="false"
/>
```

### Multiple Selection

```vue
<CroutonFormDependentFieldLoader
  v-model="booking.slots"
  dependent-value="booking.location"
  dependent-collection="bookingsLocations"
  dependent-field="slots"
  :multiple="true"  # Allow multiple selections
/>
```

## Schema Definition

```typescript
import { z } from 'zod'

// Single selection
const singleSelectSchema = z.object({
  slot: z.array(z.string()).min(1, 'Select at least one slot')
})

// Multiple selection with max limit
const multiSelectSchema = z.object({
  slots: z.array(z.string())
    .min(1, 'Select at least one slot')
    .max(3, 'Select at most 3 slots')
})

// Optional field
const optionalSchema = z.object({
  slot: z.array(z.string()).optional()
})
```

## Common Mistakes

### 1. Using Empty String Instead of Null

**Problem:**
```typescript
const booking = ref({
  slot: ''  // ❌ Causes Vue warning
})
```

**Error:**
```
[Vue warn]: Invalid prop: type check failed for prop "modelValue".
Expected Array | Null, got String with value "".
```

**Solution:**
```typescript
const booking = ref({
  slot: null  // ✅ Correct
})
```

### 2. Creating Plural Component Folders

**Problem:**
```
components/
  └── Slots/CardMini.vue  # ❌ Plural folder name
```

**Solution:**
```
components/
  └── Slot/CardMini.vue   # ✅ Singular folder name
```

### 3. Using String Type Instead of Array

**Problem:**
```typescript
slot: z.string()  // ❌ Wrong type
```

**Solution:**
```typescript
slot: z.array(z.string())  // ✅ Correct type
```

## Architecture

### Data Flow

```
1. User selects option in form
   ↓
2. FormDependentFieldLoader receives selection
   ↓
3. FormDependentSelectOption resolves Card component
   - Converts "slots" (plural) → "slot" (singular)
   - Looks for: BookingsLocationsSlotCardMini
   ↓
4. Renders selection using SlotCardMini component
   ↓
5. Value saved as array: ['slot-id-123']
```

### Component Resolution

```
dependentCollection: "bookingsLocations"
dependentField: "slots"
cardVariant: "Mini"

Resolution:
1. Singularize field: "slots" → "slot"
2. PascalCase: "slot" → "Slot"
3. Build name: "Crouton" + "BookingsLocations" + "Slot" + "Card" + "Mini"
4. Result: CroutonBookingsLocationsSlotCardMini
```

## Best Practices

1. **Always use `null` for empty dependent fields**, never `''`
2. **Create components with singular names** (`Slot/`, not `Slots/`)
3. **Use array schema** even for single selection
4. **Validate with Zod** to ensure proper data types
5. **Test with actual data** to verify component resolution works

## Troubleshooting

### Vue Warning About Type Mismatch

If you see:
```
Invalid prop: type check failed for prop "modelValue"
Expected Array | Null, got String
```

**Fix:** Change your default value from `''` to `null`

### Component Not Found Warning

If you see:
```
[Vue warn]: Failed to resolve component: CroutonBookingsLocationsSlotsCardMini
```

**Possible causes:**
1. Component folder is named with plural (`Slots/`) instead of singular (`Slot/`)
2. Component file doesn't exist
3. Component auto-import configuration is incorrect

**Fix:** Ensure your component structure uses singular naming:
```
Slot/CardMini.vue  # Not Slots/CardMini.vue
```

## See Also

- [Collection Generator Guide](./collection-generator-guide.md)
- [Component Naming Conventions](./component-naming-guide.md)
- [Form Patterns](./form-patterns-guide.md)
