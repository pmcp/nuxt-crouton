<script setup lang="ts">
/**
 * Event Scope Picker
 *
 * Block property editor for the salesChartBlock. Lets a CMS editor scope a
 * sales chart to one specific event or to "All events" (team-wide).
 *
 * Wired via the block definition's propertyComponents map:
 *   propertyComponents: { 'sales-event-scope': 'SalesBlocksPropertiesEventScopePicker' }
 *
 * Stored value is the event's `id` (or '' for all events) — passed to the
 * aggregation endpoints as ?eventId=.
 */
interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

interface EventItem {
  id: string
  title: string
  slug: string
  status?: string
}

const { items, pending } = await useCollectionQuery('salesEvents')

// USelectMenu (reka-ui Combobox) forbids an empty-string item value, so the
// "All events" choice uses a sentinel that maps back to '' on emit.
const ALL_EVENTS = '__all__'

const options = computed(() => {
  const events = (items.value as EventItem[] || [])
    .map(e => ({
      label: e.title || e.slug || e.id,
      value: e.id,
      status: e.status
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return [
    { label: 'All events', value: ALL_EVENTS, status: undefined },
    ...events
  ]
})

// Map '' (all events) ↔ the sentinel the select needs.
const selected = computed(() => props.modelValue || ALL_EVENTS)

function onChange(value: string) {
  emit('update:modelValue', value === ALL_EVENTS ? '' : (value || ''))
}
</script>

<template>
  <USelectMenu
    :model-value="selected"
    :items="options"
    value-key="value"
    label-key="label"
    placeholder="All events"
    :loading="pending"
    searchable
    class="w-full"
    @update:model-value="onChange"
  >
    <template #leading>
      <UIcon
        name="i-lucide-calendar"
        class="size-4 text-muted"
      />
    </template>
  </USelectMenu>
</template>
