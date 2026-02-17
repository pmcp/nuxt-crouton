<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Booking, LocationData } from '../types/booking'

interface Props {
  /** The date for this booking */
  date: Date
  /** Active location filter - if set, only these locations are selectable */
  activeLocationFilter?: string[]
  /** Existing booking to edit (if provided, component is in edit mode) */
  booking?: Booking
}

const props = withDefaults(defineProps<Props>(), {
  activeLocationFilter: undefined,
  booking: undefined,
})

const emit = defineEmits<{
  created: []
  updated: []
  cancel: []
  cancelled: []
}>()

// Are we in edit mode?
const isEditMode = computed(() => !!props.booking)

const {
  formState,
  locations,
  locationsStatus,
  selectedLocation,
  allSlots,
  isSlotDisabled,
  getSlotRemaining,
  getSlotCapacity,
  canAddToCart,
  addToCart,
  submitAll,
  isSubmitting,
  isInventoryMode,
  getInventoryAvailability,
  availabilityLoading,
  fetchAvailability,
  // Group support
  enableGroups,
  groupOptions,
} = useBookingCart()

// For parsing slot JSON strings
const { parseSlotIds } = useBookingSlots()
const { locale } = useI18n()

// Helper to extract first slot ID from booking slot (which is JSON string like '["09:00"]')
function getFirstSlotId(slot: string | null | undefined): string | null {
  if (!slot) return null
  const parsed = parseSlotIds(slot)
  return parsed.length > 0 ? parsed[0] : null
}

// Get localized location title with fallbacks
function getLocationTitle(location: LocationData): string {
  const translations = location.translations as Record<string, { title?: string }> | undefined

  return translations?.[locale.value]?.title
    || translations?.en?.title
    || location.title
    || 'Untitled'
}

// Local state - initialize from booking if in edit mode
const localLocationId = ref<string | null>(props.booking?.location ?? null)
const localSlotId = ref<string | null>(getFirstSlotId(props.booking?.slot))
const localGroupId = ref<string | null>(props.booking?.group ?? null)

// Track if we're updating
const isUpdating = ref(false)

// Track if we're cancelling the booking
const isCancelling = ref(false)
const showCancelConfirm = ref(false)

// Track if we're in initial edit mode setup (to prevent clearing slot)
const isInitialEditSetup = ref(!!props.booking)

// Team ID from auth context
const { currentTeam } = useTeam()
const teamId = computed(() => currentTeam.value?.id)

// Sync form state when component mounts or date changes
watch(() => props.date, (newDate) => {
  formState.date = newDate
  formState.locationId = localLocationId.value
  formState.slotId = localSlotId.value
  formState.groupId = localGroupId.value
}, { immediate: true })

// Initialize from booking when entering edit mode
watch(() => props.booking, (booking) => {
  if (booking) {
    // Set editing booking ID to exclude from availability check
    formState.editingBookingId = booking.id
    localLocationId.value = booking.location
    localSlotId.value = getFirstSlotId(booking.slot)
    localGroupId.value = booking.group ?? null
  } else {
    // Clear editing state when not in edit mode
    formState.editingBookingId = null
  }
}, { immediate: true })

// Sync local location to form state
watch(localLocationId, (v) => {
  formState.locationId = v
  // Don't clear slot during initial edit mode setup
  if (isInitialEditSetup.value) {
    isInitialEditSetup.value = false
    return
  }
  localSlotId.value = null
  formState.slotId = null
})

// Sync local slot to form state
watch(localSlotId, (v) => {
  formState.slotId = v
})

// Sync local group to form state
watch(localGroupId, (v) => {
  formState.groupId = v
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

  // If groups are enabled, require a group selection
  if (enableGroups.value && !localGroupId.value) return false

  if (isInventoryMode.value) {
    return inventoryInfo.value?.available ?? false
  } else {
    return !!localSlotId.value
  }
})

// Handle create or update
async function handleSubmit() {
  if (!canSubmit.value) return

  if (isEditMode.value && props.booking) {
    // Update existing booking
    isUpdating.value = true
    try {
      await $fetch(`/api/crouton-bookings/teams/${teamId.value}/bookings/${props.booking.id}`, {
        method: 'PATCH',
        body: {
          location: localLocationId.value,
          // Slot is stored as JSON array string in DB
          slot: localSlotId.value ? JSON.stringify([localSlotId.value]) : null,
          group: localGroupId.value,
          date: props.date.toISOString().split('T')[0],
        },
      })
      // Clear editing state
      formState.editingBookingId = null
      emit('updated')
    } catch (error) {
      console.error('Failed to update booking:', error)
    } finally {
      isUpdating.value = false
    }
  } else {
    // Create new booking
    addToCart()
    const result = await submitAll()
    if (result) {
      emit('created')
    }
  }
}

// Format date for display
const formattedDate = computed(() => {
  return new Intl.DateTimeFormat(locale.value, {
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

// Handle cancel - clear editing state
function handleCancel() {
  formState.editingBookingId = null
  emit('cancel')
}

// Handle cancel booking (change status to cancelled)
async function handleCancelBooking() {
  if (!props.booking || !teamId.value) return

  isCancelling.value = true
  try {
    await $fetch(`/api/crouton-bookings/teams/${teamId.value}/bookings/${props.booking.id}`, {
      method: 'PATCH',
      body: {
        status: 'cancelled',
      },
    })
    // Clear editing state
    formState.editingBookingId = null
    showCancelConfirm.value = false
    emit('cancelled')
  } catch (error) {
    console.error('Failed to cancel booking:', error)
  } finally {
    isCancelling.value = false
  }
}

// Check if booking is already cancelled
const isAlreadyCancelled = computed(() => props.booking?.status === 'cancelled')
</script>

<template>
  <UCard
    variant="outline"
    :ui="{
      root: 'bg-elevated shadow-md',
      body: 'p-3',
    }"
  >
    <div class="flex flex-col gap-3">
      <!-- Header with date and close -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon :name="isEditMode ? 'i-lucide-pencil' : 'i-lucide-calendar-plus'" class="size-4 text-primary" />
          <span class="text-sm font-medium">{{ isEditMode ? 'Edit booking for' : 'New booking for' }} {{ formattedDate }}</span>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="handleCancel"
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
          {{ getLocationTitle(location) }}
        </UButton>
      </div>

      <!-- Group selection (when groups are enabled) -->
      <div v-if="enableGroups && groupOptions.length > 0" class="flex flex-wrap gap-1.5">
        <UButton
          v-for="group in groupOptions"
          :key="group.id"
          size="xs"
          :variant="localGroupId === group.id ? 'solid' : 'soft'"
          :color="localGroupId === group.id ? 'primary' : 'neutral'"
          @click="localGroupId = group.id"
        >
          {{ group.label }}
        </UButton>
      </div>

      <!-- Slot selection (slot mode) - show "All Day" even when no slots configured -->
      <div v-if="selectedLocation && !isInventoryMode" class="flex flex-wrap gap-1.5">
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
            <span v-if="getSlotCapacity(slot.id) > 1 && !isSlotDisabled(slot.id)" class="text-xs opacity-60 ml-0.5">
              ({{ getSlotRemaining(slot.id) }} left)
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

      <!-- Cancel booking confirmation -->
      <div v-if="isEditMode && showCancelConfirm" class="bg-error/10 rounded-lg px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted">Cancel this booking?</span>
          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              @click="showCancelConfirm = false"
            >
              Keep
            </UButton>
            <UButton
              variant="soft"
              color="error"
              size="xs"
              :loading="isCancelling"
              @click="handleCancelBooking"
            >
              Cancel Booking
            </UButton>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between gap-2">
        <!-- Cancel booking button (only in edit mode, not already cancelled) -->
        <div>
          <UButton
            v-if="isEditMode && !isAlreadyCancelled && !showCancelConfirm"
            color="error"
            variant="ghost"
            size="xs"
            icon="i-lucide-x-circle"
            @click="showCancelConfirm = true"
          >
            Cancel Booking
          </UButton>
        </div>

        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="handleCancel"
          >
            {{ isEditMode ? 'Close' : 'Cancel' }}
          </UButton>
          <UButton
            color="primary"
            size="xs"
            :disabled="!canSubmit || isSubmitting || isUpdating || isAlreadyCancelled"
            :loading="isSubmitting || isUpdating"
            @click="handleSubmit"
          >
            {{ isEditMode ? 'Save' : 'Create' }}
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
