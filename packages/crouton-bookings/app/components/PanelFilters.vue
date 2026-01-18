<script setup lang="ts">
import type { LocationData } from '../types/booking'

interface Props {
  locations: LocationData[]
  /** Selected location IDs */
  selectedLocations: string[]
  /** Whether locations panel is expanded */
  showLocations: boolean
  /** Whether map is visible */
  showMap: boolean
  /** Whether calendar is visible */
  showCalendar: boolean
  /** Whether there are locations with coordinates (for map toggle) */
  hasLocationsWithCoordinates: boolean
  /** Whether to show cancelled bookings */
  showCancelled: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:selectedLocations': [value: string[]]
  'update:showLocations': [value: boolean]
  'update:showMap': [value: boolean]
  'update:showCalendar': [value: boolean]
  'update:showCancelled': [value: boolean]
}>()

// Toggle location selection
function toggleLocation(locationId: string) {
  const current = [...props.selectedLocations]
  const index = current.indexOf(locationId)
  if (index === -1) {
    current.push(locationId)
  } else {
    current.splice(index, 1)
  }
  emit('update:selectedLocations', current)
}

// Check if location is selected
function isLocationSelected(locationId: string): boolean {
  return props.selectedLocations.includes(locationId)
}

// Get localized location title with fallbacks
function getLocationTitle(location: LocationData): string {
  const { locale } = useI18n()
  const translations = location.translations as Record<string, { title?: string }> | undefined

  return translations?.[locale.value]?.title
    || translations?.en?.title
    || location.title
    || 'Untitled'
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Toggle controls row -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Show calendar toggle -->
      <UButton
        size="xs"
        :color="showCalendar ? 'primary' : 'neutral'"
        :variant="showCalendar ? 'solid' : 'ghost'"
        icon="i-lucide-calendar"
        @click="emit('update:showCalendar', !showCalendar)"
      >
        Calendar
      </UButton>

      <!-- Show locations toggle -->
      <UButton
        v-if="locations && locations.length > 0"
        size="xs"
        :color="showLocations ? 'primary' : 'neutral'"
        :variant="showLocations ? 'solid' : 'ghost'"
        icon="i-lucide-map-pin"
        @click="emit('update:showLocations', !showLocations)"
      >
        Locations
      </UButton>

      <!-- Show map toggle -->
      <UButton
        v-if="hasLocationsWithCoordinates"
        size="xs"
        :color="showMap ? 'primary' : 'neutral'"
        :variant="showMap ? 'solid' : 'ghost'"
        icon="i-lucide-map"
        @click="emit('update:showMap', !showMap)"
      >
        Map
      </UButton>

      <!-- Show cancelled toggle -->
      <UButton
        size="xs"
        :color="showCancelled ? 'error' : 'neutral'"
        :variant="showCancelled ? 'solid' : 'ghost'"
        icon="i-lucide-x-circle"
        @click="emit('update:showCancelled', !showCancelled)"
      >
        Cancelled
      </UButton>
    </div>

    <!-- Location filter cards (collapsible) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[200px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[200px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="showLocations && locations && locations.length > 0" class="flex flex-wrap gap-2 overflow-hidden">
        <button
          v-for="location in locations"
          :key="location.id"
          class="group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200"
          :class="[
            isLocationSelected(location.id)
              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
              : 'border-default bg-default hover:border-muted hover:bg-elevated',
          ]"
          @click="toggleLocation(location.id)"
        >
          <!-- Color indicator bar -->
          <div
            class="absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity"
            :style="{ backgroundColor: location.color || '#3b82f6' }"
            :class="isLocationSelected(location.id) ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'"
          />

          <!-- Location info -->
          <div class="flex flex-col items-start min-w-0 ml-2">
            <span
              class="text-sm font-medium truncate max-w-[120px]"
              :class="isLocationSelected(location.id) ? 'text-primary' : 'text-default'"
            >
              {{ getLocationTitle(location) }}
            </span>
            <span v-if="location.city" class="text-xs text-muted truncate max-w-[120px]">
              {{ location.city }}
            </span>
          </div>

          <!-- Selection indicator -->
          <UIcon
            v-if="isLocationSelected(location.id)"
            name="i-lucide-check"
            class="w-4 h-4 text-primary ml-1 flex-shrink-0"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>