# Briefing: Auto-Generate Select Fields from Schema Options

## Summary

Enhance the crouton generator to automatically create `<USelect>` components when a schema field has `meta.options` and `meta.displayAs: "optionsSelect"`.

## Current Behavior

When a schema field has options defined:

```json
"triggerType": {
  "type": "string",
  "meta": {
    "required": true,
    "label": "Trigger Type",
    "options": ["booking_created", "reminder_before", "booking_cancelled", "follow_up_after"],
    "displayAs": "optionsSelect",
    "area": "sidebar",
    "group": "configuration"
  }
}
```

The generator creates a plain `<UInput>`:

```vue
<UFormField label="TriggerType" name="triggerType">
  <UInput v-model="state.triggerType" class="w-full" size="xl" />
</UFormField>
```

## Desired Behavior

The generator should create a `<USelect>` with properly formatted options:

```vue
<UFormField label="Trigger Type" name="triggerType">
  <USelect
    v-model="state.triggerType"
    :items="triggerTypeOptions"
    class="w-full"
    size="xl"
  />
</UFormField>
```

And add the options array in the `<script setup>` section:

```typescript
const triggerTypeOptions = [
  { label: 'Booking Created', value: 'booking_created' },
  { label: 'Reminder Before', value: 'reminder_before' },
  { label: 'Booking Cancelled', value: 'booking_cancelled' },
  { label: 'Follow Up After', value: 'follow_up_after' }
]
```

## Implementation Details

### 1. Detection Logic

In the form generator, check for:
```typescript
if (field.meta?.displayAs === 'optionsSelect' && Array.isArray(field.meta?.options)) {
  // Generate USelect instead of UInput
}
```

### 2. Label Formatting

Convert snake_case values to human-readable labels:
- `booking_created` → `Booking Created`
- `reminder_before` → `Reminder Before`

Helper function:
```typescript
function formatOptionLabel(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
```

### 3. Options Array Generation

For each field with options, generate a const in the script section:
```typescript
const ${fieldName}Options = [
  ${options.map(opt => `{ label: '${formatLabel(opt)}', value: '${opt}' }`).join(',\n  ')}
]
```

### 4. Template Generation

Replace the UInput template with:
```vue
<USelect
  v-model="state.${fieldName}"
  :items="${fieldName}Options"
  class="w-full"
  size="xl"
/>
```

## Files to Modify

Look in `packages/nuxt-crouton-cli/` for:
- Form template generator (likely `templates/form.ts` or similar)
- Field rendering logic

## Edge Cases to Handle

1. **Empty options array** - Fall back to UInput
2. **Options with objects** - Support `{ label: string, value: string }` format in schema
3. **Numeric options** - Handle number values properly
4. **Boolean displayAs** - Some schemas might use `displayAs: true` instead of `"optionsSelect"`

## Testing

After implementation, regenerate the emailtemplates collection and verify:
1. `triggerType` renders as USelect
2. `recipientType` renders as USelect
3. Options are correctly formatted
4. Form submission works with selected values

## Reference Files

- Schema example: `packages/crouton-bookings/schemas/email-template.json`
- Manual implementation: `packages/crouton-bookings/layers/bookings/collections/emailtemplates/app/components/Form.vue`
