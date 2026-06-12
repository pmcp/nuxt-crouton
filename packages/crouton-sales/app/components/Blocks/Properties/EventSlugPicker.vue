<script setup lang="ts">
/**
 * Event Slug Picker
 *
 * Custom block property editor for the event-scoped block (eventWorkspaceBlock).
 * Fetches the current team's sales events and presents a
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
  helperPin?: string | null
}

const { items, pending } = await useCollectionQuery('salesEvents')

// On a scoped page this block gates the page behind the event's helper PIN
// (derive-scope hook). An event without a PIN means volunteers get a generic
// 401 with no way in — the endpoint deliberately doesn't say why, so this
// inline warning is the admin-visible signal.
const selectedEvent = computed(() =>
  (items.value as EventItem[] || []).find(e => e.slug === props.modelValue)
)
const missingHelperPin = computed(() =>
  !!selectedEvent.value && !String(selectedEvent.value.helperPin ?? '').trim()
)

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
  <div class="w-full space-y-2">
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

    <UAlert
      v-if="missingHelperPin"
      color="warning"
      variant="subtle"
      icon="i-lucide-key-round"
      :title="t('sales.block.noHelperPinTitle')"
      :description="t('sales.block.noHelperPinDescription')"
    />
  </div>
</template>
