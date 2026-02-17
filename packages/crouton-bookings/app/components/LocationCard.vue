<script setup lang="ts">
import type { LocationData } from '../types/booking'

interface Props {
  location: LocationData
  selected?: boolean
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  editable: false,
})

const emit = defineEmits<{
  click: []
  edit: [location: LocationData]
}>()

const { locale } = useI18n()

// Parse slots count
const slotCount = computed(() => {
  const slots = props.location.slots
  if (!slots) return 0
  if (Array.isArray(slots)) return slots.length
  if (typeof slots === 'string') {
    try {
      const parsed = JSON.parse(slots)
      return Array.isArray(parsed) ? parsed.length : 0
    } catch {
      return 0
    }
  }
  return 0
})

// Localized title with fallbacks
const title = computed(() => {
  const translations = props.location.translations as Record<string, { title?: string }> | undefined
  return translations?.[locale.value]?.title
    || translations?.en?.title
    || props.location.title
    || 'Untitled'
})
</script>

<template>
  <UButton
    size="xs"
    color="neutral"
    :variant="selected ? 'soft' : 'outline'"
    class="group relative"
    :style="selected ? {
      backgroundColor: (location.color || '#3b82f6') + '20',
      borderColor: (location.color || '#3b82f6') + '40',
    } : undefined"
    @click="emit('click')"
  >
    <!-- Color bar -->
    <div
      class="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-opacity"
      :style="{ backgroundColor: location.color || '#3b82f6' }"
      :class="selected ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'"
    />

    <span class="truncate">{{ title }}</span>

    <span v-if="location.city" class="text-muted truncate font-normal">
      {{ location.city }}
    </span>

    <UBadge
      v-if="slotCount > 0 || location.inventoryMode"
      size="xs"
      color="neutral"
      variant="subtle"
      class="flex-shrink-0"
    >
      {{ location.inventoryMode ? `×${location.quantity || 0}` : slotCount }}
    </UBadge>

    <UIcon
      v-if="selected"
      name="i-lucide-check"
      class="w-3.5 h-3.5"
    />

    <!-- Edit button: collapsed to 0 width, expands on hover -->
    <div
      v-if="editable"
      class="overflow-hidden max-w-0 group-hover:max-w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out"
      @click.stop
    >
      <CroutonItemButtonsMini
        update
        @update="emit('edit', location)"
      />
    </div>
  </UButton>
</template>
