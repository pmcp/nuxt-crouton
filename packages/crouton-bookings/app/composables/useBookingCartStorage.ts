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
      const result = await $fetch<{ count: number, bookings: unknown[], success: boolean }>(`/api/crouton-bookings/teams/${teamId.value}/customer-bookings-batch`, {
        method: 'POST',
        body: {
          bookings: cart.value,
          locale,
        },
      })

      // Clear cart on success
      clearCart()

      // Refresh my bookings list
      await refreshMyBookings()

      notify.success(t('bookings.notifications.bookingsConfirmed'), { description: t('bookings.notifications.bookingsConfirmedDescription', { count: result.count }, result.count) })

      // Close cart drawer and switch to my bookings tab
      isCartOpen.value = false
      activeTab.value = 'my-bookings'

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
    removeFromCart,
    clearCart,
    submitAll,
    cancelBooking,
    deleteBooking,
    cartPulse,
  }
}
