import type { Booking, LocationData, SettingsData } from '../types/booking'

/**
 * Composable for fetching and managing bookings list
 * Uses the customer-bookings API endpoint
 */
export function useBookingsList() {
  const { currentTeam } = useTeam()

  // Fetch bookings (client-only, depends on auth context)
  // Use same key as useBookingCart to share cache
  const {
    data: bookingsData,
    pending: bookingsLoading,
    error: bookingsError,
    refresh: refreshBookings,
  } = useFetch<Booking[]>(
    () => currentTeam.value?.id
      ? `/api/crouton-bookings/teams/${currentTeam.value.id}/customer-bookings`
      : null,
    {
      key: 'crouton-booking-sidebar-customer-bookings',
      default: () => [],
      watch: [() => currentTeam.value?.id],
      server: false, // Avoid SSR hydration mismatch - team context is client-side
    },
  )

  // Fetch settings (client-only, depends on auth context)
  const {
    data: settingsData,
    pending: settingsLoading,
    error: settingsError,
    refresh: refreshSettings,
  } = useFetch<SettingsData[]>(
    () => currentTeam.value?.id
      ? `/api/teams/${currentTeam.value.id}/bookings-settings`
      : null,
    {
      default: () => [],
      watch: [() => currentTeam.value?.id],
      server: false, // Avoid SSR hydration mismatch - team context is client-side
    },
  )

  // Fetch locations (for calendar indicators and filters)
  const {
    data: locationsData,
    pending: locationsLoading,
    error: locationsError,
    refresh: refreshLocations,
  } = useFetch<LocationData[]>(
    () => currentTeam.value?.id
      ? `/api/crouton-bookings/teams/${currentTeam.value.id}/customer-locations`
      : null,
    {
      default: () => [],
      watch: [() => currentTeam.value?.id],
      server: false, // Avoid SSR hydration mismatch - team context is client-side
    },
  )

  // Combined loading state (also loading if team not ready yet)
  const loading = computed(() => !currentTeam.value?.id || bookingsLoading.value || settingsLoading.value || locationsLoading.value)

  // Combined error state (only show errors if team is ready)
  const error = computed(() => currentTeam.value?.id ? (bookingsError.value || settingsError.value || locationsError.value) : null)

  // Get first settings record (there should only be one per team)
  const settings = computed<SettingsData | null>(() => {
    return settingsData.value?.[0] || null
  })

  // Locations list
  const locations = computed<LocationData[]>(() => {
    return locationsData.value || []
  })

  // Sort bookings by date (ascending)
  const bookings = computed<Booking[]>(() => {
    if (!bookingsData.value) return []
    return [...bookingsData.value].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateA - dateB
    })
  })

  // Refresh all data
  async function refresh() {
    await Promise.all([refreshBookings(), refreshSettings(), refreshLocations()])
  }

  return {
    bookings,
    settings,
    locations,
    loading,
    error,
    refresh,
  }
}
