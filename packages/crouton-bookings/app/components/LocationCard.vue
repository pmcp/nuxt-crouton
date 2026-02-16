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
  <UCard
    variant="outline"
    :ui="{
      root: [
        'group cursor-pointer transition-all duration-200',
        selected
          ? 'ring-1 ring-primary/30 border-primary bg-primary/5'
          : 'hover:border-muted hover:bg-elevated',
      ].join(' '),
      body: 'p-2.5',
    }"
    @click="emit('click')"
  >
    <div class="relative flex items-start gap-2.5">
      <!-- Color bar -->
      <div
        class="absolute left-0 top-0 bottom-0 w-1 rounded-full transition-opacity"
        :style="{ backgroundColor: location.color || '#3b82f6' }"
        :class="selected ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'"
      />

      <!-- Content -->
      <div class="flex-1 min-w-0 ml-2.5">
        <!-- Title row -->
        <div class="flex items-center gap-1.5">
          <span
            class="text-sm font-medium truncate"
            :class="selected ? 'text-primary' : 'text-default'"
          >
            {{ title }}
          </span>

          <!-- Slot count badge -->
          <UBadge
            v-if="slotCount > 0 || location.inventoryMode"
            size="xs"
            color="neutral"
            variant="subtle"
            class="flex-shrink-0"
          >
            {{ location.inventoryMode ? `×${location.quantity || 0}` : slotCount }}
          </UBadge>
        </div>

        <!-- City -->
        <span v-if="location.city" class="text-xs text-muted truncate block">
          {{ location.city }}
        </span>
      </div>

      <!-- Right side: edit button + selection check -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <CroutonItemButtonsMini
          v-if="editable"
          update
          class="opacity-0 group-hover:opacity-100 transition-opacity"
          @update="emit('edit', location)"
          @click.stop
        />

        <UIcon
          v-if="selected"
          name="i-lucide-check"
          class="w-4 h-4 text-primary"
        />
      </div>
    </div>
  </UCard>
</template>
