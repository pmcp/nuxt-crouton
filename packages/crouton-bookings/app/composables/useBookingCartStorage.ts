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
      notify.warning('Cart is empty', { description: 'Add some bookings to your cart first' })
      return null
    }

    isSubmitting.value = true

    try {
      const result = await $fetch<{ count: number, bookings: unknown[], success: boolean }>(`/api/crouton-bookings/teams/${teamId.value}/customer-bookings-batch`, {
        method: 'POST',
        body: {
          bookings: cart.value,
        },
      })

      // Clear cart on success
      clearCart()

      // Refresh my bookings list
      await refreshMyBookings()

      notify.success('Bookings confirmed!', { description: `Successfully created ${result.count} booking${result.count === 1 ? '' : 's'}` })

      // Close cart drawer and switch to my bookings tab
      isCartOpen.value = false
      activeTab.value = 'my-bookings'

      return result
    }
    catch (error: any) {
      console.error('Failed to submit bookings:', error)
      notify.error('Booking failed', { description: error.data?.message || 'Failed to create bookings. Please try again.' })
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

      notify.success('Booking cancelled', { description: 'Your booking has been cancelled successfully' })

      return true
    }
    catch (error: any) {
      console.error('Failed to cancel booking:', error)
      notify.error('Cancellation failed', { description: error.data?.message || 'Failed to cancel booking. Please try again.' })
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

      notify.success('Booking deleted', { description: 'The booking has been permanently removed' })

      return true
    }
    catch (error: any) {
      console.error('Failed to delete booking:', error)
      notify.error('Delete failed', { description: error.data?.message || 'Failed to delete booking. Please try again.' })
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
