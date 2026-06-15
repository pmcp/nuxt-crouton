<script setup lang="ts">
/**
 * Locations Picker
 *
 * Block property editor for the kitchen-display block's `locations` attr —
 * "which orders should this screen show?". A multi-select of locations
 * (Kitchen, Bar, …); leaving it empty means the screen shows every location in
 * the event.
 *
 * Wired via the block definition's propertyComponents map:
 *   propertyComponents: { locations: 'SalesBlocksPropertiesLocationsPicker' }
 *
 * Scoped to the block's selected event (#119): the kitchen-display block also
 * carries an `eventSlug` attr, so this picker only offers THAT event's
 * locations — not every location across every team event. It reads the sibling
 * attr via the `croutonBlockAttrs` inject provided by crouton-pages'
 * BlockPropertyPanel, resolves the slug to an event id, and filters on it. With
 * no event picked yet there's nothing to choose.
 *
 * Stored value is an array of location ids — what the display-jobs read filters
 * on (`?locations=...`).
 */
import type { Ref } from 'vue'

interface Props {
  modelValue?: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { t } = useT()

interface LocationItem { id: string, title: string, eventId: string }
interface EventItem { id: string, slug: string }

// The property panel provides the live block attrs so a custom editor can read
// sibling fields. Undefined when this component is mounted outside the panel —
// the optional chaining below degrades to "no event picked".
const blockAttrs = inject<Ref<Record<string, unknown>>>('croutonBlockAttrs')
const eventSlug = computed(() => String(blockAttrs?.value?.eventSlug ?? ''))

const { items: events } = await useCollectionQuery('salesEvents')
const { items, pending } = await useCollectionQuery('salesLocations')

// Resolve the block's eventSlug → event id (the column salesLocations filters on).
const eventId = computed(() =>
  (events.value as EventItem[] || []).find(e => e.slug === eventSlug.value)?.id ?? null
)

// Only the selected event's locations; nothing until an event is picked.
const options = computed(() =>
  !eventId.value
    ? []
    : (items.value as LocationItem[] || [])
        .filter(l => l.eventId === eventId.value)
        .map(l => ({ label: l.title || l.id, value: l.id }))
        .sort((a, b) => a.label.localeCompare(b.label))
)

function onChange(value: string[]) {
  emit('update:modelValue', value || [])
}
</script>

<template>
  <div class="w-full space-y-2">
    <USelectMenu
      :model-value="props.modelValue || []"
      :items="options"
      value-key="value"
      label-key="label"
      multiple
      searchable
      :placeholder="t('sales.blocks.kitchenDisplay.fields.locations.placeholder')"
      :loading="pending"
      :disabled="!eventId"
      class="w-full"
      @update:model-value="onChange"
    >
      <template #leading>
        <UIcon name="i-lucide-map-pin" class="size-4 text-muted" />
      </template>
    </USelectMenu>

    <p v-if="!eventId" class="text-xs text-muted">
      {{ t('sales.blocks.kitchenDisplay.fields.locations.needsEvent') }}
    </p>
  </div>
</template>
