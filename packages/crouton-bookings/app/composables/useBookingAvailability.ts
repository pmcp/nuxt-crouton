import type { DateValue } from '@internationalized/date'

export interface SlotOption {
  id: string
  label: string
  color?: string
}

export interface AvailabilityData {
  [dateISO: string]: {
    bookedSlots: string[]
    bookedCount?: number // For inventory mode
  }
}

export interface InventoryAvailability {
  available: boolean
  remaining: number
  total: number
  bookedCount: number
}

export interface LocationWithInventory {
  id: string
  inventoryMode?: boolean
  quantity?: number
  slots?: SlotOption[] | string | null
}

const ALL_DAY_SLOT: SlotOption = {
  id: 'all-day',
  label: 'All Day'
}

/**
 * Composable for checking booking availability
 * Supports both slot-based and inventory-based booking modes
 */
export function useBookingAvailability(
  locationId: Ref<string | null>,
  location: Ref<LocationWithInventory | null | undefined>
) {
  const { currentTeam } = useTeam()
  const loading = ref(false)
  const availabilityData = ref<AvailabilityData>({})

  // Parse slots from location (handles string or array)
  const locationSlots = computed<SlotOption[]>(() => {
    if (!location.value?.slots) return []
    const slots = location.value.slots
    if (typeof slots === 'string') {
      try {
        const parsed = JSON.parse(slots)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return Array.isArray(slots) ? slots : []
  })

  // Check if location is in inventory mode
  const isInventoryMode = computed(() => location.value?.inventoryMode ?? false)

  // Total quantity for inventory mode
  const inventoryQuantity = computed(() => location.value?.quantity ?? 0)

  // All slots including "All Day" prepended (for slot mode only)
  const allSlots = computed<SlotOption[]>(() => {
    if (isInventoryMode.value) return []
    return [ALL_DAY_SLOT, ...locationSlots.value]
  })

  // Fetch availability for a date range
  async function fetchAvailability(startDate: Date, endDate: Date) {
    if (!locationId.value || !currentTeam.value?.id) return

    loading.value = true
    try {
      const data = await $fetch<AvailabilityData>(
        `/api/crouton-bookings/teams/${currentTeam.value.id}/availability`,
        {
          query: {
            locationId: locationId.value,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      )
      availabilityData.value = data
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      availabilityData.value = {}
    } finally {
      loading.value = false
    }
  }

  // Helper to normalize date to YYYY-MM-DD string
  function normalizeToDateKey(date: Date | DateValue): string {
    if (date instanceof Date) {
      const isoString = date.toISOString()
      return isoString.substring(0, 10) // YYYY-MM-DD
    }
    // DateValue from @internationalized/date
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  }

  // Get booked slots for a specific date (slot mode)
  function getBookedSlotsForDate(date: Date | DateValue): string[] {
    const dateKey = normalizeToDateKey(date)
    return availabilityData.value[dateKey]?.bookedSlots || []
  }

  // Get booked count for a specific date (inventory mode)
  function getBookedCountForDate(date: Date | DateValue): number {
    const dateKey = normalizeToDateKey(date)
    return availabilityData.value[dateKey]?.bookedCount ?? 0
  }

  // Get inventory availability for a specific date
  function getInventoryAvailability(date: Date | DateValue): InventoryAvailability {
    const bookedCount = getBookedCountForDate(date)
    const total = inventoryQuantity.value
    const remaining = Math.max(0, total - bookedCount)

    return {
      available: remaining > 0,
      remaining,
      total,
      bookedCount
    }
  }

  // Get booked slot objects with labels for a specific date
  function getBookedSlotLabelsForDate(date: Date | DateValue): SlotOption[] {
    const bookedIds = getBookedSlotsForDate(date)
    return allSlots.value.filter(slot => bookedIds.includes(slot.id))
  }

  // Check if a date has any bookings
  function hasBookingsOnDate(date: Date | DateValue): boolean {
    if (isInventoryMode.value) {
      return getBookedCountForDate(date) > 0
    }
    return getBookedSlotsForDate(date).length > 0
  }

  // Check if a date is fully booked
  function isDateFullyBooked(date: Date | DateValue): boolean {
    if (isInventoryMode.value) {
      // Inventory mode: fully booked when all units are taken
      const { remaining } = getInventoryAvailability(date)
      return remaining === 0
    }

    // Slot mode: existing logic
    const bookedSlots = getBookedSlotsForDate(date)

    // If "all-day" is booked, the date is fully booked
    if (bookedSlots.includes('all-day')) {
      return true
    }

    // If all individual slots (excluding all-day) are booked, it's fully booked
    const individualSlots = locationSlots.value.map(s => s.id)
    if (individualSlots.length === 0) return false

    return individualSlots.every(slotId => bookedSlots.includes(slotId))
  }

  // Get available slots for a specific date (slot mode only)
  function getAvailableSlotsForDate(date: Date | DateValue): SlotOption[] {
    if (isInventoryMode.value) return []

    const bookedSlots = getBookedSlotsForDate(date)

    // If "all-day" is booked, no slots available
    if (bookedSlots.includes('all-day')) {
      return []
    }

    // If ANY slot is booked, "all-day" is not available
    const hasAnyBooking = bookedSlots.length > 0

    return allSlots.value.filter(slot => {
      // Remove already booked slots
      if (bookedSlots.includes(slot.id)) return false

      // Remove "all-day" if any slot is booked
      if (slot.id === 'all-day' && hasAnyBooking) return false

      return true
    })
  }

  // Clear availability data when location changes
  watch(locationId, () => {
    availabilityData.value = {}
  })

  return {
    // State
    loading,
    availabilityData,

    // Mode detection
    isInventoryMode,
    inventoryQuantity,

    // Slot mode
    allSlots,
    locationSlots,
    fetchAvailability,
    getBookedSlotsForDate,
    getBookedSlotLabelsForDate,
    getAvailableSlotsForDate,

    // Inventory mode
    getBookedCountForDate,
    getInventoryAvailability,

    // Both modes
    hasBookingsOnDate,
    isDateFullyBooked,
    normalizeToDateKey,

    // Constants
    ALL_DAY_SLOT
  }
}
