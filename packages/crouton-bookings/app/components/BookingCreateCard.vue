<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { LocationData } from '../types/booking'

interface Props {
  /** The date for this booking */
  date: Date
  /** Active location filter - if set, only these locations are selectable */
  activeLocationFilter?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  activeLocationFilter: undefined,
})

const emit = defineEmits<{
  created: []
  cancel: []
}>()

const {
  formState,
  locations,
  locationsStatus,
  selectedLocation,
  allSlots,
  isSlotDisabled,
  canAddToCart,
  addToCart,
  submitAll,
  isSubmitting,
  isInventoryMode,
  getInventoryAvailability,
  availabilityLoading,
  fetchAvailability,
} = useBookingCart()

// Local state
const localLocationId = ref<string | null>(null)
const localSlotId = ref<string | null>(null)

// Sync form state when component mounts or date changes
watch(() => props.date, (newDate) => {
  formState.date = newDate
  formState.locationId = localLocationId.value
  formState.slotId = localSlotId.value
}, { immediate: true })

// Sync local location to form state
watch(localLocationId, (v) => {
  formState.locationId = v
  localSlotId.value = null
  formState.slotId = null
})

// Sync local slot to form state
watch(localSlotId, (v) => {
  formState.slotId = v
})

// Auto-select first enabled location
watch(
  [() => locations.value, () => props.activeLocationFilter],
  ([locs, filter]: [LocationData[] | undefined, string[] | undefined]) => {
    if (locs && locs.length > 0 && !localLocationId.value) {
      // Find first enabled location
      const firstEnabled = locs.find((loc: LocationData) => {
        if (!filter || filter.length === 0) return true
        return filter.includes(loc.id)
      })
      if (firstEnabled) {
        localLocationId.value = firstEnabled.id
      }
    }
    // If current selection becomes disabled, clear it
    if (localLocationId.value && filter && filter.length > 0) {
      if (!filter.includes(localLocationId.value)) {
        // Find first enabled location to switch to
        const firstEnabled = locs?.find((loc: LocationData) => filter.includes(loc.id))
        localLocationId.value = firstEnabled?.id || null
      }
    }
  },
  { immediate: true },
)

// Get inventory info for selected date
const inventoryInfo = computed(() => {
  if (!isInventoryMode.value) return null
  return getInventoryAvailability(props.date)
})

// Can submit
const canSubmit = computed(() => {
  if (!localLocationId.value) return false

  if (isInventoryMode.value) {
    return inventoryInfo.value?.available ?? false
  } else {
    return !!localSlotId.value
  }
})

// Handle create
async function handleCreate() {
  if (!canSubmit.value) return

  addToCart()
  const result = await submitAll()

  if (result) {
    emit('created')
  }
}

// Format date for display
const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(props.date)
})

// Check if a location is enabled based on active filter
function isLocationEnabled(locationId: string): boolean {
  // If no filter is set, all locations are enabled
  if (!props.activeLocationFilter || props.activeLocationFilter.length === 0) {
    return true
  }
  // Only locations in the active filter are enabled
  return props.activeLocationFilter.includes(locationId)
}
</script>

<template>
  <UCard
    variant="outline"
    :ui="{
      root: 'ring-2 ring-primary/50 bg-primary/[0.02]',
      body: 'p-3',
    }"
  >
    <div class="flex flex-col gap-3">
      <!-- Header with date and close -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar-plus" class="size-4 text-primary" />
          <span class="text-sm font-medium">New booking for {{ formattedDate }}</span>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="emit('cancel')"
        />
      </div>

      <!-- Location selection -->
      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="location in locations"
          :key="location.id"
          size="xs"
          :variant="localLocationId === location.id ? 'solid' : 'soft'"
          :color="localLocationId === location.id ? 'primary' : 'neutral'"
          :disabled="!isLocationEnabled(location.id)"
          :class="{ 'opacity-40': !isLocationEnabled(location.id) }"
          @click="localLocationId = location.id"
        >
          <template #leading>
            <span
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: isLocationEnabled(location.id) ? (location.color || '#3b82f6') : '#9ca3af' }"
            />
          </template>
          {{ location.title }}
        </UButton>
      </div>

      <!-- Slot selection (slot mode) -->
      <div v-if="localLocationId && !isInventoryMode && allSlots.length > 0" class="flex flex-wrap gap-1.5">
        <!-- Loading state -->
        <template v-if="availabilityLoading">
          <div v-for="i in 3" :key="i" class="h-6 w-16 bg-elevated rounded animate-pulse" />
        </template>

        <!-- Slots -->
        <template v-else>
          <UButton
            v-for="slot in allSlots"
            :key="slot.id"
            size="xs"
            :variant="localSlotId === slot.id ? 'solid' : 'soft'"
            :color="localSlotId === slot.id ? 'primary' : (isSlotDisabled(slot.id) ? 'error' : 'neutral')"
            :disabled="isSlotDisabled(slot.id)"
            @click="localSlotId = slot.id"
          >
            <span :class="{ 'line-through': isSlotDisabled(slot.id) }">
              {{ slot.label || slot.id }}
            </span>
            <UIcon
              v-if="isSlotDisabled(slot.id)"
              name="i-lucide-ban"
              class="size-3 ml-0.5"
            />
          </UButton>
        </template>
      </div>

      <!-- Inventory mode info -->
      <div v-if="localLocationId && isInventoryMode && inventoryInfo" class="flex items-center gap-2 text-sm">
        <UIcon
          :name="inventoryInfo.available ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
          :class="inventoryInfo.available ? 'text-success' : 'text-error'"
          class="size-4"
        />
        <span :class="inventoryInfo.available ? 'text-success' : 'text-error'">
          {{ inventoryInfo.remaining }} / {{ inventoryInfo.total }} available
        </span>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          size="xs"
          :disabled="!canSubmit || isSubmitting"
          :loading="isSubmitting"
          @click="handleCreate"
        >
          Create
        </UButton>
      </div>
    </div>
  </UCard>
</template>
