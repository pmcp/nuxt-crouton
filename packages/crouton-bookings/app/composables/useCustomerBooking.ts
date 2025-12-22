import type { LocationData, SlotItem } from '../types/booking'

export type { LocationData, SlotItem }

interface BookingState {
  locationId: string | null
  date: Date | null
  slot: string | null // Single slot ID
  // Inventory mode
  quantity: number
}

export function useCustomerBooking() {
  const route = useRoute()
  const toast = useToast()

  // Wizard state
  const currentStep = ref(0)
  const isSubmitting = ref(false)
  const isSuccess = ref(false)

  // Booking data
  const bookingState = reactive<BookingState>({
    locationId: null,
    date: null,
    slot: null,
    quantity: 1,
  })

  // Selected location object (for accessing slots)
  const selectedLocation = ref<LocationData | null>(null)

  // Fetch allowed locations
  const teamId = computed(() => route.params.team as string)

  const { data: allowedLocations, status: locationsStatus, refresh: refreshLocations } = useFetch<LocationData[]>(
    () => `/api/crouton-bookings/teams/${teamId.value}/customer-locations`,
    {
      key: 'crouton-customer-locations',
    },
  )

  // Check if selected location is in inventory mode
  const isInventoryMode = computed(() => selectedLocation.value?.inventoryMode ?? false)

  // Step validation - slot step is optional in inventory mode
  const stepValidation = computed(() => ({
    0: !!bookingState.locationId,
    1: !!bookingState.date,
    2: isInventoryMode.value ? bookingState.quantity > 0 : !!bookingState.slot,
    3: true, // Confirmation step always valid if we got here
  }))

  const canProceed = computed(() => stepValidation.value[currentStep.value as keyof typeof stepValidation.value])

  const isComplete = computed(() => {
    const hasLocation = !!bookingState.locationId
    const hasDate = !!bookingState.date
    // Inventory mode: slot not required
    const hasSlotOrInventory = isInventoryMode.value ? bookingState.quantity > 0 : !!bookingState.slot
    return hasLocation && hasDate && hasSlotOrInventory
  })

  // Navigation
  function nextStep() {
    if (canProceed.value && currentStep.value < 3) {
      currentStep.value++
    }
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  function goToStep(step: number) {
    // Only allow going to steps we've completed or current step
    if (step <= currentStep.value || (step === currentStep.value + 1 && canProceed.value)) {
      currentStep.value = step
    }
  }

  // Reset dependent fields when location changes
  watch(() => bookingState.locationId, (newId, oldId) => {
    if (newId !== oldId) {
      bookingState.date = null
      bookingState.slot = null
      bookingState.quantity = 1
      // Update selected location object
      selectedLocation.value = allowedLocations.value?.find(l => l.id === newId) || null
    }
  })

  // Select location helper
  function selectLocation(location: LocationData) {
    bookingState.locationId = location.id
    selectedLocation.value = location
  }

  // Select date helper
  function selectDate(date: Date) {
    bookingState.date = date
    // Reset slot when date changes
    bookingState.slot = null
  }

  // Select slot helper
  function selectSlot(slotId: string) {
    bookingState.slot = slotId
  }

  // Set quantity (inventory mode)
  function setQuantity(qty: number) {
    bookingState.quantity = Math.max(1, qty)
  }

  // Submit booking
  async function submitBooking() {
    if (!isComplete.value) {
      toast.add({
        title: 'Incomplete booking',
        description: 'Please complete all steps before submitting',
        color: 'error',
      })
      return null
    }

    isSubmitting.value = true

    try {
      const body: Record<string, unknown> = {
        location: bookingState.locationId,
        date: bookingState.date?.toISOString(),
        status: 'pending',
      }

      // Include slot for slot mode, quantity for inventory mode
      if (isInventoryMode.value) {
        body.quantity = bookingState.quantity
      }
      else {
        body.slot = [bookingState.slot] // API expects array
      }

      const result = await $fetch(`/api/crouton-bookings/teams/${teamId.value}/bookings-bookings`, {
        method: 'POST',
        body,
      })

      isSuccess.value = true

      toast.add({
        title: 'Booking created',
        description: 'Your booking has been submitted successfully',
        color: 'success',
      })

      return result
    }
    catch (error: unknown) {
      console.error('Failed to create booking:', error)
      const errorData = error as { data?: { message?: string } }
      toast.add({
        title: 'Booking failed',
        description: errorData.data?.message || 'Failed to create booking. Please try again.',
        color: 'error',
      })
      return null
    }
    finally {
      isSubmitting.value = false
    }
  }

  // Reset wizard
  function reset() {
    currentStep.value = 0
    bookingState.locationId = null
    bookingState.date = null
    bookingState.slot = null
    bookingState.quantity = 1
    selectedLocation.value = null
    isSuccess.value = false
  }

  return {
    // State
    currentStep,
    bookingState,
    selectedLocation,
    isSubmitting,
    isSuccess,

    // Locations data
    allowedLocations,
    locationsStatus,
    refreshLocations,

    // Computed
    stepValidation,
    canProceed,
    isComplete,
    isInventoryMode,
    teamId,

    // Actions
    nextStep,
    prevStep,
    goToStep,
    selectLocation,
    selectDate,
    selectSlot,
    setQuantity,
    submitBooking,
    reset,
  }
}
