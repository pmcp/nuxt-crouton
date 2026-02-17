import type { DateValue } from '@internationalized/date'
import type { BlockedDateItem, SlotSchedule } from '../types/booking'

export interface SlotOption {
  id: string
  label: string
  capacity?: number
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
  maxBookingsPerMonth?: number | null
  slots?: SlotOption[] | string | null
  // Schedule rule fields
  openDays?: number[] | string | null
  slotSchedule?: SlotSchedule | string | null
  blockedDates?: BlockedDateItem[] | string | null
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

  // Schedule rules (open days, slot schedule, blocked dates)
  const {
    isDateUnavailable,
    isSlotAvailableByRules,
    getBlockedReason,
    getRuleBlockedSlotIds,
  } = useScheduleRules(location)

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
  // NOTE: The API returns duplicate slot IDs (one per booking), so this array
  // may contain the same slotId multiple times when capacity > 1
  function getBookedSlotsForDate(date: Date | DateValue): string[] {
    const dateKey = normalizeToDateKey(date)
    return availabilityData.value[dateKey]?.bookedSlots || []
  }

  // Count how many times a slot is booked on a date (for capacity checking)
  function getSlotBookedCountForDate(date: Date | DateValue, slotId: string): number {
    const bookedSlots = getBookedSlotsForDate(date)
    return bookedSlots.filter(id => id === slotId).length
  }

  // Get remaining capacity for a slot on a date
  function getSlotRemainingForDate(date: Date | DateValue, slotId: string): number {
    const slot = allSlots.value.find(s => s.id === slotId)
    const capacity = slot?.capacity ?? 1
    const bookedCount = getSlotBookedCountForDate(date, slotId)
    return Math.max(0, capacity - bookedCount)
  }

  // Get booked count for a specific date (inventory mode)
  function getBookedCountForDate(date: Date | DateValue): number {
    const dateKey = normalizeToDateKey(date)
    return availabilityData.value[dateKey]?.bookedCount ?? 0
  }

  // Get inventory availability for a specific date
  // Optional quantityOverride for use in components that don't have location context
  function getInventoryAvailability(date: Date | DateValue, quantityOverride?: number): InventoryAvailability {
    const bookedCount = getBookedCountForDate(date)
    const total = quantityOverride ?? inventoryQuantity.value
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

    // Slot mode: capacity-aware logic
    const bookedSlots = getBookedSlotsForDate(date)

    // If "all-day" is booked, the date is fully booked
    if (bookedSlots.includes('all-day')) {
      return true
    }

    // All individual slots are full when booked count >= capacity for each
    const individualSlots = locationSlots.value
    if (individualSlots.length === 0) return false

    return individualSlots.every((slot) => {
      const capacity = slot.capacity ?? 1
      const bookedCount = bookedSlots.filter(id => id === slot.id).length
      return bookedCount >= capacity
    })
  }

  // Get available slots for a specific date (slot mode only)
  function getAvailableSlotsForDate(date: Date | DateValue): SlotOption[] {
    if (isInventoryMode.value) return []

    // If date is completely unavailable by rules, no slots available
    if (isDateUnavailable(date)) return []

    const bookedSlots = getBookedSlotsForDate(date)
    const ruleBlockedSlots = getRuleBlockedSlotIds(date)

    // If "all-day" is booked, no slots available
    if (bookedSlots.includes('all-day')) {
      return []
    }

    // If ANY slot is booked or rule-blocked, "all-day" is not available
    const hasAnyBooking = bookedSlots.length > 0 || ruleBlockedSlots.length > 0

    return allSlots.value.filter(slot => {
      // Remove rule-blocked slots
      if (ruleBlockedSlots.includes(slot.id)) return false

      // Capacity-aware: slot is full when booked count >= capacity
      const capacity = slot.capacity ?? 1
      const bookedCount = bookedSlots.filter(id => id === slot.id).length
      if (bookedCount >= capacity) return false

      // Remove "all-day" if any slot is booked or rule-blocked
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
    getSlotBookedCountForDate,
    getSlotRemainingForDate,
    getBookedSlotLabelsForDate,
    getAvailableSlotsForDate,

    // Inventory mode
    getBookedCountForDate,
    getInventoryAvailability,

    // Both modes
    hasBookingsOnDate,
    isDateFullyBooked,
    normalizeToDateKey,

    // Schedule rules
    isDateUnavailable,
    getBlockedReason,
    getRuleBlockedSlotIds,

    // Constants
    ALL_DAY_SLOT
  }
}
