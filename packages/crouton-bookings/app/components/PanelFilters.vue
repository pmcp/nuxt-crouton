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
  /** Number of selected dates in calendar */
  selectedDatesCount?: number
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
  selectedDatesCount: 0,
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

</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Section toggles + view controls -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1">
        <!-- Section toggles -->
        <UButton
          size="sm"
          :color="showCalendar || selectedDatesCount > 0 ? 'primary' : 'neutral'"
          variant="soft"
          icon="i-lucide-calendar"
          @click="emit('update:showCalendar', !showCalendar)"
        >
          Calendar
          <UBadge v-if="!showCalendar && selectedDatesCount > 0" size="xs" color="primary" variant="solid" class="ml-0.5">
            {{ selectedDatesCount }}
          </UBadge>
        </UButton>

        <UButton
          v-if="locations && locations.length > 0"
          size="sm"
          :color="showLocations || selectedLocations.length > 0 ? 'primary' : 'neutral'"
          variant="soft"
          icon="i-lucide-map-pin"
          @click="emit('update:showLocations', !showLocations)"
        >
          Locations
          <UBadge v-if="!showLocations && selectedLocations.length > 0" size="xs" color="primary" variant="solid" class="ml-0.5">
            {{ selectedLocations.length }}
          </UBadge>
        </UButton>

        <UButton
          v-if="hasLocationsWithCoordinates"
          size="sm"
          :color="showMap ? 'primary' : 'neutral'"
          variant="soft"
          icon="i-lucide-map"
          @click="emit('update:showMap', !showMap)"
        >
          Map
        </UButton>

        <UButton
          size="sm"
          :color="showCancelled ? 'error' : 'neutral'"
          variant="soft"
          icon="i-lucide-x-circle"
          @click="emit('update:showCancelled', !showCancelled)"
        >
          Cancelled
        </UButton>

      </div>

      <!-- View controls (only visible when calendar is shown) -->
      <div v-if="showCalendar" class="flex items-center gap-1">
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          @click="emit('go-to-today')"
        >
          Today
        </UButton>

        <UButton
          size="sm"
          :color="calendarView === 'week' ? 'primary' : 'neutral'"
          variant="soft"
          @click="emit('update:calendarView', 'week')"
        >
          Week
        </UButton>

        <UButton
          size="sm"
          :color="calendarView === 'month' ? 'primary' : 'neutral'"
          variant="soft"
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
          size="sm"
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
