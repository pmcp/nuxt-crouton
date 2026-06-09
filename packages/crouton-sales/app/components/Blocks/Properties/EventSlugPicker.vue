<script setup lang="ts">
/**
 * Event Slug Picker
 *
 * Custom block property editor for the event-scoped blocks (orderInterfaceBlock,
 * eventWorkspaceBlock). Fetches the current team's sales events and presents a
 * searchable dropdown so editors can pick one instead of typing the slug by hand.
 *
 * Wired via the block definition's propertyComponents map:
 *   propertyComponents: { eventSlug: 'SalesBlocksPropertiesEventSlugPicker' }
 *
 * Stored value is the event's `slug` string — matches the public by-slug
 * endpoint expected by the renderer.
 */
interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useT()

interface EventItem {
  id: string
  title: string
  slug: string
  status?: string
}

const { items, pending } = await useCollectionQuery('salesEvents')

const options = computed(() =>
  (items.value as EventItem[] || [])
    .filter(e => !!e.slug)
    .map(e => ({
      label: e.title || e.slug,
      value: e.slug,
      slug: e.slug,
      status: e.status
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

function onChange(value: string) {
  emit('update:modelValue', value || '')
}
</script>

<template>
  <USelectMenu
    :model-value="modelValue"
    :items="options"
    value-key="value"
    label-key="label"
    :placeholder="t('sales.block.pickEvent')"
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
    <template #item="{ item }">
      <div class="flex items-center justify-between gap-3 w-full">
        <span class="truncate">{{ item.label }}</span>
        <span class="text-xs font-mono text-muted">{{ item.slug }}</span>
      </div>
    </template>
  </USelectMenu>
</template>
