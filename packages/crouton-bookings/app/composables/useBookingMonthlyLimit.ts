import type { CartItem } from '../types/booking'
import { toMonthKey } from '@fyit/crouton-core/shared/utils/date'

/**
 * Composable for monthly booking limit enforcement on the client side.
 *
 * Tracks how many bookings the user already has for a given location/month
 * (from the API) plus how many are currently in the cart, and computes the
 * remaining allowance.
 */
export function useBookingMonthlyLimit(
  teamId: Ref<string | undefined>,
  locationId: Ref<string | null>,
  selectedDate: Ref<Date | null>,
  maxBookingsPerMonth: Ref<number | null>,
  cart: Ref<CartItem[]>,
  editingBookingId: Ref<string | null>,
) {
  const monthlyBookingCount = ref<number>(0)
  const monthlyBookingCountLoading = ref(false)

  // Count cart items for current location + selected date's month (sums quantities for inventory mode)
  const cartCountForLocationMonth = computed(() => {
    if (!locationId.value || !selectedDate.value) return 0
    const targetMonth = toMonthKey(selectedDate.value)
    return cart.value
      .filter((item) => {
        const itemDate = new Date(item.date)
        return item.locationId === locationId.value
          && toMonthKey(itemDate) === targetMonth
      })
      .reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  })

  // Remaining bookings for the month (null if no limit)
  const monthlyBookingRemaining = computed(() => {
    if (!maxBookingsPerMonth.value) return null
    return Math.max(0, maxBookingsPerMonth.value - monthlyBookingCount.value - cartCountForLocationMonth.value)
  })

  // Fetch monthly booking count from API
  async function fetchMonthlyBookingCount() {
    if (!locationId.value || !teamId.value || !maxBookingsPerMonth.value) {
      monthlyBookingCount.value = 0
      return
    }

    const month = selectedDate.value ? toMonthKey(selectedDate.value) : undefined

    monthlyBookingCountLoading.value = true
    try {
      const data = await $fetch<{ count: number }>(`/api/crouton-bookings/teams/${teamId.value}/monthly-booking-count`, {
        query: {
          locationId: locationId.value,
          ...(month && { month }),
        },
      })
      monthlyBookingCount.value = data.count
    }
    catch (error) {
      console.error('Failed to fetch monthly booking count:', error)
      monthlyBookingCount.value = 0
    }
    finally {
      monthlyBookingCountLoading.value = false
    }
  }

  // Fetch when location, month, or limit changes
  watch(
    [locationId, () => selectedDate.value ? toMonthKey(selectedDate.value) : null, maxBookingsPerMonth],
    () => {
      fetchMonthlyBookingCount()
    },
    { immediate: true },
  )

  return {
    monthlyBookingCount,
    monthlyBookingCountLoading,
    cartCountForLocationMonth,
    monthlyBookingRemaining,
    fetchMonthlyBookingCount,
  }
}

