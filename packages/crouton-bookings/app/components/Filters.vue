<script setup lang="ts">
import type { LocationData, SettingsData, SlotItem } from '../types/booking'

interface FilterState {
  statuses: string[]
  locations: string[]
}

interface Props {
  modelValue?: FilterState
  settings?: SettingsData | null
  locations?: LocationData[]
  /** Available statuses in current context (for disabling empty filters) */
  availableStatuses?: string[]
  /** Available location IDs in current context (for disabling empty filters) */
  availableLocations?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ statuses: [], locations: [] }),
  settings: null,
  locations: () => [],
  availableStatuses: undefined,
  availableLocations: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: FilterState]
}>()

const { parseLocationSlots } = useBookingSlots()

// Parse statuses - may be JSON string or array
const parsedStatuses = computed(() => {
  const raw = props.settings?.statuses
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    }
    catch {
      return []
    }
  }
  return []
})

// Internal state synced with modelValue
const selectedStatuses = computed({
  get: () => props.modelValue?.statuses || [],
  set: (val) => {
    emit('update:modelValue', {
      ...props.modelValue,
      statuses: val,
    })
  },
})

const selectedLocations = computed({
  get: () => props.modelValue?.locations || [],
  set: (val) => {
    emit('update:modelValue', {
      ...props.modelValue,
      locations: val,
    })
  },
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return selectedStatuses.value.length > 0 || selectedLocations.value.length > 0
})

// Toggle status filter
function toggleStatus(statusId: string) {
  const current = [...selectedStatuses.value]
  const index = current.indexOf(statusId)
  if (index === -1) {
    current.push(statusId)
  }
  else {
    current.splice(index, 1)
  }
  selectedStatuses.value = current
}

// Toggle location filter
function toggleLocation(locationId: string) {
  const current = [...selectedLocations.value]
  const index = current.indexOf(locationId)
  if (index === -1) {
    current.push(locationId)
  }
  else {
    current.splice(index, 1)
  }
  selectedLocations.value = current
}

// Clear all filters
function clearFilters() {
  emit('update:modelValue', { statuses: [], locations: [] })
}

// Check if status is selected
function isStatusSelected(statusId: string): boolean {
  return selectedStatuses.value.includes(statusId)
}

// Check if location is selected
function isLocationSelected(locationId: string): boolean {
  return selectedLocations.value.includes(locationId)
}

// Get status color for badge
function getStatusColor(status: { id: string, color?: string }): string {
  return status.color || '#6b7280'
}

// Parse location slots for mini card
function getLocationSlots(location: LocationData): SlotItem[] {
  return parseLocationSlots(location)
}

// Check if status is available (has matching bookings in current context)
function isStatusAvailable(statusValue: string): boolean {
  // If no availability data provided, all are available
  if (!props.availableStatuses) return true
  return props.availableStatuses.includes(statusValue)
}

// Check if location is available (has matching bookings in current context)
function isLocationAvailable(locationId: string): boolean {
  // If no availability data provided, all are available
  if (!props.availableLocations) return true
  return props.availableLocations.includes(locationId)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header with clear button -->
    <div v-if="hasActiveFilters" class="flex items-center justify-between">
      <span class="text-xs text-muted">Filters active</span>
      <UButton
        variant="ghost"
        color="neutral"
        size="xs"
        @click="clearFilters"
      >
        Clear all
      </UButton>
    </div>

    <!-- Status filters -->
    <div v-if="parsedStatuses.length > 0" class="flex flex-col gap-1.5">
      <span class="text-xs text-muted font-medium">Status</span>
      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="status in parsedStatuses"
          :key="status.id || status.value"
          size="xs"
          :variant="isStatusSelected(status.value || status.id) ? 'solid' : 'soft'"
          :color="isStatusSelected(status.value || status.id) ? 'primary' : 'neutral'"
          :disabled="!isStatusAvailable(status.value || status.id) && !isStatusSelected(status.value || status.id)"
          :class="{ 'opacity-40': !isStatusAvailable(status.value || status.id) && !isStatusSelected(status.value || status.id) }"
          @click="toggleStatus(status.value || status.id)"
        >
          <template #leading>
            <span
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: getStatusColor(status) }"
            />
          </template>
          {{ status.label }}
        </UButton>
      </div>
    </div>

    <!-- Location filters -->
    <div v-if="locations && locations.length > 0" class="flex flex-col gap-1.5">
      <span class="text-xs text-muted font-medium">Location</span>
      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="location in locations"
          :key="location.id"
          size="xs"
          :variant="isLocationSelected(location.id) ? 'solid' : 'soft'"
          :color="isLocationSelected(location.id) ? 'primary' : 'neutral'"
          :disabled="!isLocationAvailable(location.id) && !isLocationSelected(location.id)"
          :class="{ 'opacity-40': !isLocationAvailable(location.id) && !isLocationSelected(location.id) }"
          @click="toggleLocation(location.id)"
        >
          <template #leading>
            <span
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: location.color || '#3b82f6' }"
            />
          </template>
          {{ location.title }}
        </UButton>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="(!settings?.statuses || settings.statuses.length === 0) && (!locations || locations.length === 0)"
      class="text-xs text-muted text-center py-2"
    >
      No filters available
    </div>
  </div>
</template>
