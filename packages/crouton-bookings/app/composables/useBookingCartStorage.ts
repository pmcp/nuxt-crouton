import type { CartItem } from '../types/booking'

/**
 * Composable for cart persistence and CRUD actions.
 *
 * Responsible for:
 *   - Adding / removing / clearing items
 *   - Submitting all items to the batch API
 *   - Cancelling and deleting individual bookings via the API
 *
 * Does NOT contain availability or pricing logic — those live in their own
 * composables and are composed into useBookingCart.
 *
 * The cart ref is passed in from useBookingCart to ensure a single shared ref.
 */
export function useBookingCartStorage(
  teamId: Ref<string | undefined>,
  refreshMyBookings: () => Promise<void>,
  isCartOpen: Ref<boolean>,
  activeTab: Ref<string>,
  cartPulse: Ref<number>,
  cart: Ref<CartItem[]>,
) {
  const notify = useNotify()
  const { t } = useT()

  // Submitting state
  const isSubmitting = ref(false)

  // Signal for successful booking creation — watched by Panel.vue to close the create card.
  // We use shared state instead of relying on emit('created') because the async refresh
  // can unmount the BookingCreateCard before the event propagates to the parent.
  const lastBookingCreatedAt = useState<number | null>('croutonBookingLastCreatedAt', () => null)

  // IDs of the most recently created bookings — used for temporary highlight effect
  const lastCreatedBookingIds = useState<string[]>('croutonBookingLastCreatedIds', () => [])
  let highlightTimer: ReturnType<typeof setTimeout> | null = null

  // Cart count for badge
  const cartCount = computed(() => cart.value.length)

  // Remove item from cart
  function removeFromCart(id: string) {
    const index = cart.value.findIndex(item => item.id === id)
    if (index !== -1) {
      cart.value.splice(index, 1)
    }
  }

  // Clear entire cart
  function clearCart() {
    cart.value = []
  }

  // Submit all bookings in cart
  async function submitAll() {
    if (cart.value.length === 0) {
      notify.warning(t('bookings.notifications.cartEmpty'), { description: t('bookings.notifications.cartEmptyDescription') })
      return null
    }

    isSubmitting.value = true

    try {
      const locale = useNuxtApp().$i18n?.locale?.value || 'en'
      const result = await $fetch<{ count: number, bookings: { id: string }[], success: boolean }>(`/api/crouton-bookings/teams/${teamId.value}/customer-bookings-batch`, {
        method: 'POST',
        body: {
          bookings: cart.value,
          locale,
        },
      })

      // Clear cart on success
      clearCart()

      notify.success(t('bookings.notifications.bookingsConfirmed'), { description: t('bookings.notifications.bookingsConfirmedDescription', { count: result.count }, result.count) })

      // Close cart drawer and switch to my bookings tab
      isCartOpen.value = false
      activeTab.value = 'my-bookings'

      // Refresh bookings list asynchronously — do NOT await.
      // Awaiting here causes the shared useFetch cache to update before the caller
      // can emit 'created', which restructures the booking list and destroys the
      // BookingCreateCard component, losing the emit. Panel.vue already watches
      // resolvedBookings for changes to handle scroll-to-new-booking.
      // Signal creation BEFORE starting the async refresh, so Panel.vue can
      // clear creatingAtDate before the refresh unmounts BookingCreateCard.
      lastBookingCreatedAt.value = Date.now()

      // Store created booking IDs for temporary highlight, auto-clear after 3s
      if (highlightTimer) clearTimeout(highlightTimer)
      lastCreatedBookingIds.value = result.bookings.map(b => b.id)
      highlightTimer = setTimeout(() => { lastCreatedBookingIds.value = [] }, 3000)

      refreshMyBookings().catch(() => {})

      return result
    }
    catch (error: any) {
      console.error('Failed to submit bookings:', error)
      notify.error(t('bookings.notifications.bookingFailed'), { description: error.data?.message || t('bookings.notifications.bookingFailedDescription') })
      return null
    }
    finally {
      isSubmitting.value = false
    }
  }

  // Cancel a booking (set status to 'cancelled')
  async function cancelBooking(bookingId: string) {
    try {
      await $fetch(`/api/teams/${teamId.value}/bookings-bookings/${bookingId}`, {
        method: 'PATCH',
        body: {
          status: 'cancelled',
        },
      })

      await refreshMyBookings()

      notify.success(t('bookings.notifications.bookingCancelled'), { description: t('bookings.notifications.bookingCancelledDescription') })

      return true
    }
    catch (error: any) {
      console.error('Failed to cancel booking:', error)
      notify.error(t('bookings.notifications.cancellationFailed'), { description: error.data?.message || t('bookings.notifications.cancellationFailedDescription') })
      return false
    }
  }

  // Permanently delete a booking
  async function deleteBooking(bookingId: string) {
    try {
      await $fetch(`/api/teams/${teamId.value}/bookings-bookings/${bookingId}`, {
        method: 'DELETE',
      })

      await refreshMyBookings()

      notify.success(t('bookings.notifications.bookingDeleted'), { description: t('bookings.notifications.bookingDeletedDescription') })

      return true
    }
    catch (error: any) {
      console.error('Failed to delete booking:', error)
      notify.error(t('bookings.notifications.deleteFailed'), { description: error.data?.message || t('bookings.notifications.deleteFailedDescription') })
      return false
    }
  }

  return {
    cart,
    cartCount,
    isSubmitting,
    lastBookingCreatedAt,
    lastCreatedBookingIds,
    removeFromCart,
    clearCart,
    submitAll,
    cancelBooking,
    deleteBooking,
    cartPulse,
  }
}
