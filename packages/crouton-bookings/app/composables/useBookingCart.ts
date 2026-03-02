import { useLocalStorage } from '@vueuse/core'
import type { LocationData, SlotItem, BookingData, SettingsData, CartItem } from '../types/booking'
import { toDateKey, isSameDay } from '@fyit/crouton-core/shared/utils/date'
import { useBookingMonthlyLimit } from './useBookingMonthlyLimit'
import { useBookingCartStorage } from './useBookingCartStorage'

interface AvailabilityData {
  [dateISO: string]: {
    bookedSlots: string[]
    bookedCount?: number // For inventory mode
    bookedGroupSlots?: Record<string, string[]> // slotId → groupIds that booked it
  }
}

const ALL_DAY_SLOT: SlotItem = {
  id: 'all-day',
  label: 'All Day',
}

/**
 * Composable for managing the booking cart and customer booking flow.
 * Supports both slot-based and inventory-based booking modes.
 *
 * Delegates to focused sub-composables:
 *   - useBookingCartStorage  — localStorage persistence, cart CRUD, submit/cancel/delete
 *   - useBookingMonthlyLimit — monthly booking limit tracking per location
 */
export function useBookingCart() {
  const { currentTeam } = useTeam()

  // Team ID from auth context (consistent with useBookingsList)
  const teamId = computed(() => currentTeam.value?.id)

  // Fetch customer bookings for the "My Bookings" count and list
  const { data: myBookings, status: myBookingsStatus, refresh: refreshMyBookings } = useFetch<BookingData[]>(
    () => teamId.value
      ? `/api/crouton-bookings/teams/${teamId.value}/customer-bookings`
      : null,
    {
      key: 'crouton-booking-sidebar-customer-bookings',
      watch: [teamId],
    },
  )

  // Count of upcoming bookings (future dates only)
  const upcomingBookingsCount = computed(() => {
    if (!myBookings.value) return 0
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return myBookings.value.filter((b) => {
      const bookingDate = new Date(b.date)
      return bookingDate >= now
    }).length
  })

  // Sidebar open state (for mobile)
  const isOpen = useState('croutonBookingSidebar', () => false)

  // Active tab: 'book' or 'my-bookings'
  const activeTab = useState('croutonBookingSidebarTab', () => 'book')

  // Cart drawer open state (bottom drawer)
  const isCartOpen = useState('croutonBookingCartDrawer', () => false)

  // Expanded state (XL mode with map)
  const isExpanded = useState('croutonBookingSidebarExpanded', () => false)

  // Cart pulse animation trigger (increments when item added)
  const cartPulse = useState('croutonBookingCartPulse', () => 0)

  // Fetch booking settings (for enableGroups and groups options)
  const { data: settingsData } = useFetch<SettingsData[]>(
    () => teamId.value
      ? `/api/teams/${teamId.value}/bookings-settings`
      : null,
    {
      key: 'crouton-booking-cart-settings',
      watch: [teamId],
    },
  )

  // Settings computed values
  const groupOptions = computed(() => settingsData.value?.[0]?.groups ?? [])
  // Enable groups if there are any group options defined
  const enableGroups = computed(() => groupOptions.value.length > 0)

  // Form state - use useState for shared state across components
  const formStateRef = useState<{
    locationId: string | null
    date: Date | null
    slotIds: string[]
    groupId: string | null
    quantity: number
    editingBookingId: string | null
  }>('croutonBookingFormState', () => ({
    locationId: null,
    date: null,
    slotIds: [],
    groupId: null,
    quantity: 1,
    editingBookingId: null,
  }))

  // Create a reactive wrapper to maintain the existing API
  const formState = reactive({
    get locationId() { return formStateRef.value.locationId },
    set locationId(v: string | null) { formStateRef.value.locationId = v },
    get date() { return formStateRef.value.date },
    set date(v: Date | null) { formStateRef.value.date = v },
    get slotIds() { return formStateRef.value.slotIds },
    set slotIds(v: string[]) { formStateRef.value.slotIds = v },
    get groupId() { return formStateRef.value.groupId },
    set groupId(v: string | null) { formStateRef.value.groupId = v },
    get quantity() { return formStateRef.value.quantity },
    set quantity(v: number) { formStateRef.value.quantity = v },
    get editingBookingId() { return formStateRef.value.editingBookingId },
    set editingBookingId(v: string | null) { formStateRef.value.editingBookingId = v },
  })

  // Availability data from API
  const availabilityData = ref<AvailabilityData>({})
  const availabilityLoading = ref(false)

  // Fetch allowed locations
  const { data: locations, status: locationsStatus, refresh: refreshLocations } = useFetch<LocationData[]>(
    () => teamId.value
      ? `/api/crouton-bookings/teams/${teamId.value}/customer-locations`
      : null,
    {
      key: 'crouton-booking-cart-locations',
      watch: [teamId],
      default: () => [],
    },
  )

  // Selected location object
  const selectedLocation = computed(() => {
    if (!formState.locationId || !locations.value) return null
    return locations.value.find(l => l.id === formState.locationId) || null
  })

  // Schedule rules (open days, slot schedule, blocked dates)
  const selectedLocationRef = computed(() => selectedLocation.value ?? null)
  const {
    isDateUnavailable,
    isSlotAvailableByRules,
    getBlockedReason,
    getRuleBlockedSlotIds,
  } = useScheduleRules(selectedLocationRef)

  // Monthly booking limit
  const monthlyBookingLimit = computed(() => selectedLocation.value?.maxBookingsPerMonth ?? null)

  // Cart persisted in localStorage — single ref passed to useBookingCartStorage
  const cart = useLocalStorage<CartItem[]>('crouton-booking-cart', [])

  // --- Monthly limit sub-composable ---
  const locationIdRef = computed(() => formState.locationId)
  const selectedDateRef = computed(() => formState.date)
  const editingBookingIdRef = computed(() => formState.editingBookingId)

  const {
    monthlyBookingRemaining,
  } = useBookingMonthlyLimit(
    teamId,
    locationIdRef,
    selectedDateRef,
    monthlyBookingLimit,
    cart,
    editingBookingIdRef,
  )

  // --- Cart storage sub-composable ---
  const refreshMyBookingsWrapper = async () => { await refreshMyBookings() }

  const {
    cartCount,
    isSubmitting,
    removeFromCart,
    clearCart,
    submitAll,
    cancelBooking,
    deleteBooking,
  } = useBookingCartStorage(
    teamId,
    refreshMyBookingsWrapper,
    isCartOpen,
    activeTab,
    cartPulse,
    cart,
  )

  // Check if selected location is in inventory mode
  const isInventoryMode = computed(() => selectedLocation.value?.inventoryMode ?? false)

  // Inventory quantity for selected location
  const inventoryQuantity = computed(() => selectedLocation.value?.quantity ?? 0)

  // Parse raw slots from selected location (without availability filtering)
  const rawSlots = computed<SlotItem[]>(() => {
    if (!selectedLocation.value?.slots) return []

    const slots = selectedLocation.value.slots

    if (typeof slots === 'string') {
      try {
        const parsed = JSON.parse(slots)
        return Array.isArray(parsed) ? parsed : []
      }
      catch {
        return []
      }
    }

    return Array.isArray(slots) ? slots : []
  })

  // Fetch availability for a date range
  async function fetchAvailability(startDate: Date, endDate: Date) {
    if (!formState.locationId || !teamId.value) return

    availabilityLoading.value = true
    try {
      // Build query params, optionally excluding a booking (for editing)
      const queryParams: Record<string, string> = {
        locationId: formState.locationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }
      if (formState.editingBookingId) {
        queryParams.excludeBookingId = formState.editingBookingId
      }

      const data = await $fetch<AvailabilityData>(
        `/api/crouton-bookings/teams/${teamId.value}/availability`,
        { query: queryParams },
      )
      availabilityData.value = data
    }
    catch (error) {
      console.error('Failed to fetch availability:', error)
      availabilityData.value = {}
    }
    finally {
      availabilityLoading.value = false
    }
  }

  // Get booked slots from API for a specific date (slot mode)
  function getApiBookedSlotsForDate(date: Date): string[] {
    const dateKey = toDateKey(date)
    return availabilityData.value[dateKey]?.bookedSlots || []
  }

  // Get booked count from API for a specific date (inventory mode)
  function getApiBookedCountForDate(date: Date): number {
    const dateKey = toDateKey(date)
    return availabilityData.value[dateKey]?.bookedCount ?? 0
  }

  // Get booked slots from cart for a specific date and location (slot mode)
  function getCartBookedSlotsForDate(date: Date): string[] {
    if (!formState.locationId) return []

    return cart.value
      .filter(item =>
        item.locationId === formState.locationId
        && !item.isInventoryMode
        && isSameDay(new Date(item.date), date),
      )
      .flatMap(item => item.slotIds)
  }

  // Get booked count from cart for a specific date and location (inventory mode)
  function getCartBookedCountForDate(date: Date): number {
    if (!formState.locationId) return 0

    return cart.value
      .filter(item =>
        item.locationId === formState.locationId
        && item.isInventoryMode
        && isSameDay(new Date(item.date), date),
      )
      .reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  }

  // Get inventory availability for a date
  function getInventoryAvailability(date: Date) {
    const apiBooked = getApiBookedCountForDate(date)
    const cartBooked = getCartBookedCountForDate(date)
    const bookedCount = apiBooked + cartBooked
    const total = inventoryQuantity.value
    const remaining = Math.max(0, total - bookedCount)

    return {
      available: remaining > 0,
      remaining,
      total,
      bookedCount
    }
  }

  // All slots for slot mode — "All Day" only when no named slots exist
  const allSlots = computed<SlotItem[]>(() => {
    if (!selectedLocation.value || isInventoryMode.value) return []
    if (rawSlots.value.length > 0) return rawSlots.value
    return [ALL_DAY_SLOT]
  })

  // Get all booked slot IDs for the selected date (from API + cart, with duplicates for capacity counting)
  const bookedSlotIds = computed<string[]>(() => {
    if (!formState.date || isInventoryMode.value) return []

    const apiBooked = getApiBookedSlotsForDate(formState.date)
    const cartBooked = getCartBookedSlotsForDate(formState.date)
    // Keep duplicates — needed for capacity counting
    return [...apiBooked, ...cartBooked]
  })

  // Get the capacity for a slot from rawSlots
  function getSlotCapacity(slotId: string): number {
    if (slotId === 'all-day') return 1
    const slot = rawSlots.value.find(s => s.id === slotId)
    return slot?.capacity ?? 1
  }

  // Count how many times a slot appears in the booked list
  function getSlotBookedCount(slotId: string): number {
    return bookedSlotIds.value.filter(id => id === slotId).length
  }

  // Get remaining capacity for a slot on the selected date
  function getSlotRemaining(slotId: string): number {
    const capacity = getSlotCapacity(slotId)
    const bookedCount = getSlotBookedCount(slotId)
    return Math.max(0, capacity - bookedCount)
  }

  // Check if a group+slot combination is already booked (API data)
  function isGroupSlotBookedInApi(slotId: string, groupId: string, date: Date): boolean {
    const dateKey = toDateKey(date)
    const groupSlots = availabilityData.value[dateKey]?.bookedGroupSlots
    return groupSlots?.[slotId]?.includes(groupId) ?? false
  }

  // Check if a group+slot combination is already in the cart
  function isGroupSlotInCart(slotId: string, groupId: string, date: Date): boolean {
    if (!formState.locationId) return false
    return cart.value.some(item =>
      item.locationId === formState.locationId
      && item.slotIds.includes(slotId)
      && item.groupId === groupId
      && isSameDay(new Date(item.date), date),
    )
  }

  // Check if a slot is disabled (slot mode only)
  function isSlotDisabled(slotId: string): boolean {
    if (!formState.date || isInventoryMode.value) return true

    // Check schedule rules first
    if (!isSlotAvailableByRules(slotId, formState.date)) {
      return true
    }

    // If "all-day" is booked, all slots are disabled
    if (bookedSlotIds.value.includes('all-day')) {
      return true
    }

    // Capacity-aware: slot is full when booked count >= capacity
    if (getSlotRemaining(slotId) <= 0) {
      return true
    }

    // When groups are enabled and a group is selected, check if this group already booked this slot
    if (enableGroups.value && formState.groupId && formState.date) {
      if (isGroupSlotBookedInApi(slotId, formState.groupId, formState.date)
        || isGroupSlotInCart(slotId, formState.groupId, formState.date)) {
        return true
      }
    }

    // If any slot is booked or rule-blocked, "all-day" is disabled
    const ruleBlocked = getRuleBlockedSlotIds(formState.date)
    if (slotId === 'all-day' && (bookedSlotIds.value.length > 0 || ruleBlocked.length > 0)) {
      return true
    }

    return false
  }

  // Compute available slots (slot mode only)
  const availableSlots = computed<SlotItem[]>(() => {
    if (!formState.date || !selectedLocation.value || isInventoryMode.value) return []
    return allSlots.value.filter(slot => !isSlotDisabled(slot.id))
  })

  // === Calendar availability helpers ===

  // Get all booked slots for a date (API + cart combined) - slot mode
  // Keeps duplicates for capacity counting
  function getBookedSlotsForDate(date: Date): string[] {
    const apiBooked = getApiBookedSlotsForDate(date)
    const cartBooked = getCartBookedSlotsForDate(date)
    return [...apiBooked, ...cartBooked]
  }

  // Check if a date has any bookings
  function hasBookingsOnDate(date: Date): boolean {
    if (isInventoryMode.value) {
      const { bookedCount } = getInventoryAvailability(date)
      return bookedCount > 0
    }
    return getBookedSlotsForDate(date).length > 0
  }

  // Check if a date is fully booked
  function isDateFullyBooked(date: Date): boolean {
    if (isInventoryMode.value) {
      const { remaining } = getInventoryAvailability(date)
      return remaining === 0
    }

    const bookedSlots = getBookedSlotsForDate(date)

    // If "all-day" is booked, the date is fully booked
    if (bookedSlots.includes('all-day')) {
      return true
    }

    // Capacity-aware: all individual slots are full when booked count >= capacity
    if (rawSlots.value.length === 0) return false

    return rawSlots.value.every((slot) => {
      const capacity = slot.capacity ?? 1
      const bookedCount = bookedSlots.filter(id => id === slot.id).length
      return bookedCount >= capacity
    })
  }

  // Get booked slot labels for tooltip display (slot mode)
  function getBookedSlotLabelsForDate(date: Date): string[] {
    const bookedIds = getBookedSlotsForDate(date)
    return bookedIds.map(id => getSlotLabel(id))
  }

  // Fetch availability when location or editing state changes
  watch([() => formState.locationId, () => formState.editingBookingId], () => {
    availabilityData.value = {}
    if (formState.locationId) {
      // Fetch 3 months of availability
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0)
      fetchAvailability(startDate, endDate)
    }
  }, { immediate: true })

  // Can add to cart - adapts to inventory mode
  const canAddToCart = computed(() => {
    // Must have location and date
    if (!formState.locationId || !formState.date) return false

    // Check schedule rules - date must be available
    if (isDateUnavailable(formState.date)) return false

    if (isInventoryMode.value) {
      // Inventory mode: need location + date + enough availability for requested quantity
      const { remaining } = getInventoryAvailability(formState.date)
      if (remaining < formState.quantity) return false
    } else {
      // Slot mode: need location + date + at least one slot selected
      if (formState.slotIds.length === 0) return false
      // Check that at least one selected slot isn't disabled
      if (formState.slotIds.every(id => isSlotDisabled(id))) return false
    }

    // If groups are enabled, require a group selection
    if (enableGroups.value && !formState.groupId) return false

    // Check monthly booking limit
    if (monthlyBookingRemaining.value !== null && monthlyBookingRemaining.value <= 0) return false

    return true
  })

  // Generate unique ID
  function generateId() {
    return Math.random().toString(36).substring(2, 9)
  }

  // Get slot label by ID
  function getSlotLabel(slotId: string): string {
    if (slotId === 'all-day') return ALL_DAY_SLOT.label!
    const slot = rawSlots.value.find(s => s.id === slotId)
    return slot?.label || slot?.value || slotId
  }

  // Get group label by ID
  function getGroupLabel(groupId: string | null): string | null {
    if (!groupId) return null
    const group = groupOptions.value.find(g => g.id === groupId)
    return group?.label || groupId
  }

  // Get slot position info by ID
  function getSlotPositionInfo(slotId: string): { color?: string, totalSlots: number, position: number } | null {
    if (slotId === 'all-day') return null
    const slots = rawSlots.value
    if (!slots.length) return null
    const position = slots.findIndex(s => s.id === slotId)
    if (position === -1) return null
    return {
      // Color is now at location level, not slot level
      color: selectedLocation.value?.color || undefined,
      totalSlots: slots.length,
      position,
    }
  }

  // Toggle a slot in/out of the selected slotIds array
  function toggleSlot(slotId: string) {
    const idx = formState.slotIds.indexOf(slotId)
    if (idx >= 0) {
      formState.slotIds = formState.slotIds.filter(id => id !== slotId)
    } else {
      formState.slotIds = [...formState.slotIds, slotId]
    }
  }

  // Add current selection to cart
  function addToCart() {
    if (!canAddToCart.value || !selectedLocation.value || !formState.date) {
      return
    }

    const slotIds = isInventoryMode.value ? ['inventory'] : formState.slotIds
    const slotLabels = isInventoryMode.value
      ? ['Inventory Booking']
      : formState.slotIds.map(id => getSlotLabel(id))

    const item: CartItem = {
      id: generateId(),
      locationId: formState.locationId!,
      locationTitle: selectedLocation.value.title,
      date: formState.date.toISOString(),
      slotIds,
      slotLabels,
      groupId: formState.groupId,
      groupLabel: getGroupLabel(formState.groupId),
      isInventoryMode: isInventoryMode.value,
      quantity: isInventoryMode.value ? formState.quantity : undefined,
    }

    // Add slot-specific info for slot mode (use first selected slot for position)
    if (!isInventoryMode.value && formState.slotIds.length > 0) {
      const positionInfo = getSlotPositionInfo(formState.slotIds[0])
      if (positionInfo) {
        item.slotColor = positionInfo.color
        item.totalSlots = positionInfo.totalSlots
        item.slotPosition = positionInfo.position
      }
    }

    cart.value.push(item)

    // Reset form for next booking
    formState.slotIds = []
    formState.groupId = null
    formState.quantity = 1

    // Trigger pulse animation on cart button
    cartPulse.value++
  }

  // Reset form state
  function resetForm() {
    formState.locationId = null
    formState.date = null
    formState.slotIds = []
    formState.groupId = null
    formState.quantity = 1
  }

  return {
    // State
    cart,
    isOpen,
    isCartOpen,
    isExpanded,
    activeTab,
    formState,
    isSubmitting,
    availabilityLoading,
    cartPulse,

    // Mode detection
    isInventoryMode,
    inventoryQuantity,

    // Monthly booking limit
    monthlyBookingLimit,
    monthlyBookingRemaining,

    // Settings (groups)
    enableGroups,
    groupOptions,

    // Locations
    locations,
    locationsStatus,
    refreshLocations,
    selectedLocation,
    allSlots,
    availableSlots,
    rawSlots,
    isSlotDisabled,
    getSlotRemaining,
    getSlotCapacity,

    // Calendar availability helpers
    hasBookingsOnDate,
    isDateFullyBooked,
    getBookedSlotLabelsForDate,
    getBookedSlotsForDate,
    getInventoryAvailability,

    // Schedule rules
    isDateUnavailable,
    getBlockedReason,
    getRuleBlockedSlotIds,

    // My Bookings
    myBookings,
    myBookingsStatus,
    refreshMyBookings,

    // Computed
    canAddToCart,
    cartCount,
    upcomingBookingsCount,
    teamId,

    // Actions
    addToCart,
    toggleSlot,
    removeFromCart,
    clearCart,
    submitAll,
    resetForm,
    cancelBooking,
    deleteBooking,
    fetchAvailability,
  }
}
