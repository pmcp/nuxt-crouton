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
  /** Whether user can manage locations (admin) */
  canManageLocations?: boolean
  /** Current calendar view mode */
  calendarView?: 'week' | 'month'
}

const props = withDefaults(defineProps<Props>(), {
  canManageLocations: false,
  calendarView: 'week',
})

const emit = defineEmits<{
  'update:selectedLocations': [value: string[]]
  'update:showLocations': [value: boolean]
  'update:showMap': [value: boolean]
  'update:showCalendar': [value: boolean]
  'update:showCancelled': [value: boolean]
  'update:calendarView': [value: 'week' | 'month']
  'go-to-today': []
  'add-location': []
  'edit-location': [location: LocationData]
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

const pillClass = 'flex items-center gap-1 bg-muted/60 backdrop-blur-sm rounded-full border border-default px-1 py-1'
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Combined pill: section toggles + view controls -->
    <div class="flex justify-center">
      <div :class="pillClass">
        <!-- Section toggles -->
        <UButton
          size="xs"
          :color="showCalendar ? 'primary' : 'neutral'"
          :variant="showCalendar ? 'solid' : 'ghost'"
          icon="i-lucide-calendar"
          class="rounded-full"
          @click="emit('update:showCalendar', !showCalendar)"
        >
          Calendar
        </UButton>

        <UButton
          v-if="locations && locations.length > 0"
          size="xs"
          :color="showLocations ? 'primary' : 'neutral'"
          :variant="showLocations ? 'solid' : 'ghost'"
          icon="i-lucide-map-pin"
          class="rounded-full"
          @click="emit('update:showLocations', !showLocations)"
        >
          Locations
        </UButton>

        <UButton
          v-if="hasLocationsWithCoordinates"
          size="xs"
          :color="showMap ? 'primary' : 'neutral'"
          :variant="showMap ? 'solid' : 'ghost'"
          icon="i-lucide-map"
          class="rounded-full"
          @click="emit('update:showMap', !showMap)"
        >
          Map
        </UButton>

        <UButton
          size="xs"
          :color="showCancelled ? 'error' : 'neutral'"
          :variant="showCancelled ? 'solid' : 'ghost'"
          icon="i-lucide-x-circle"
          class="rounded-full"
          @click="emit('update:showCancelled', !showCancelled)"
        >
          Cancelled
        </UButton>

        <!-- Separator -->
        <USeparator orientation="vertical" class="h-5 mx-1" />

        <!-- View controls -->
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          class="rounded-full"
          @click="emit('go-to-today')"
        >
          Today
        </UButton>

        <UButton
          size="xs"
          :color="calendarView === 'week' ? 'primary' : 'neutral'"
          :variant="calendarView === 'week' ? 'solid' : 'ghost'"
          class="rounded-full"
          @click="emit('update:calendarView', 'week')"
        >
          Week
        </UButton>

        <UButton
          size="xs"
          :color="calendarView === 'month' ? 'primary' : 'neutral'"
          :variant="calendarView === 'month' ? 'solid' : 'ghost'"
          class="rounded-full"
          @click="emit('update:calendarView', 'month')"
        >
          Month
        </UButton>
      </div>
    </div>

    <!-- Empty state when no locations (admin only) -->
    <div
      v-if="locations.length === 0 && canManageLocations"
      class="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-muted bg-muted/30"
    >
      <UIcon name="i-lucide-map-pin-off" class="w-5 h-5 text-muted flex-shrink-0" />
      <span class="text-sm text-muted">No locations yet</span>
      <UButton
        size="xs"
        variant="outline"
        icon="i-lucide-plus"
        @click="emit('add-location')"
      >
        Add Location
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
        <CroutonBookingsLocationCard
          v-for="location in locations"
          :key="location.id"
          :location="location"
          :selected="isLocationSelected(location.id)"
          :editable="canManageLocations"
          @click="toggleLocation(location.id)"
          @edit="emit('edit-location', $event)"
        />

        <!-- Add Location button (at end of location cards) -->
        <UButton
          v-if="canManageLocations"
          size="xs"
          variant="outline"
          icon="i-lucide-plus"
          class="self-center"
          @click="emit('add-location')"
        >
          Add Location
        </UButton>
      </div>
    </Transition>
  </div>
</template>
