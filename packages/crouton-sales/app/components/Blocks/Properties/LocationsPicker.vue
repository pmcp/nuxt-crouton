<script setup lang="ts">
/**
 * Locations Picker
 *
 * Block property editor for the kitchen-display block's `locations` attr —
 * "which orders should this screen show?". A multi-select of the team's sales
 * locations (Kitchen, Bar, …); leaving it empty means the screen shows every
 * location in the event.
 *
 * Wired via the block definition's propertyComponents map:
 *   propertyComponents: { locations: 'SalesBlocksPropertiesLocationsPicker' }
 *
 * Stored value is an array of location ids — what the display-jobs read filters
 * on (`?locations=...`).
 */
interface Props {
  modelValue?: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { t } = useT()

interface LocationItem { id: string, title: string }

const { items, pending } = await useCollectionQuery('salesLocations')

const options = computed(() =>
  (items.value as LocationItem[] || [])
    .map(l => ({ label: l.title || l.id, value: l.id }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

function onChange(value: string[]) {
  emit('update:modelValue', value || [])
}
</script>

<template>
  <USelectMenu
    :model-value="props.modelValue || []"
    :items="options"
    value-key="value"
    label-key="label"
    multiple
    searchable
    :placeholder="t('sales.blocks.kitchenDisplay.fields.locations.placeholder')"
    :loading="pending"
    class="w-full"
    @update:model-value="onChange"
  >
    <template #leading>
      <UIcon name="i-lucide-map-pin" class="size-4 text-muted" />
    </template>
  </USelectMenu>
</template>
