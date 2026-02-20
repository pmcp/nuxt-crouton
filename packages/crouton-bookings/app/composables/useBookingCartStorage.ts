import { useLocalStorage } from '@vueuse/core'
import type { CartItem } from '../types/booking'

/**
 * Composable for cart persistence and CRUD actions.
 *
 * Responsible for:
 *   - Persisting cart items in localStorage
 *   - Adding / removing / clearing items
 *   - Submitting all items to the batch API
 *   - Cancelling and deleting individual bookings via the API
 *
 * Does NOT contain availability or pricing logic — those live in their own
 * composables and are composed into useBookingCart.
 */
export function useBookingCartStorage(
  teamId: Ref<string | undefined>,
  refreshMyBookings: () => Promise<void>,
  isCartOpen: Ref<boolean>,
  activeTab: Ref<string>,
  cartPulse: Ref<number>,
) {
  const toast = useToast()

  // Cart persisted in localStorage
  const cart = useLocalStorage<CartItem[]>('crouton-booking-cart', [])

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
      toast.add({
        title: 'Cart is empty',
        description: 'Add some bookings to your cart first',
        color: 'warning',
      })
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

      toast.add({
        title: 'Bookings confirmed!',
        description: `Successfully created ${result.count} booking${result.count === 1 ? '' : 's'}`,
        color: 'success',
      })

      // Close cart drawer and switch to my bookings tab
      isCartOpen.value = false
      activeTab.value = 'my-bookings'

      return result
    }
    catch (error: any) {
      console.error('Failed to submit bookings:', error)
      toast.add({
        title: 'Booking failed',
        description: error.data?.message || 'Failed to create bookings. Please try again.',
        color: 'error',
      })
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

      toast.add({
        title: 'Booking cancelled',
        description: 'Your booking has been cancelled successfully',
        color: 'success',
      })

      return true
    }
    catch (error: any) {
      console.error('Failed to cancel booking:', error)
      toast.add({
        title: 'Cancellation failed',
        description: error.data?.message || 'Failed to cancel booking. Please try again.',
        color: 'error',
      })
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

      toast.add({
        title: 'Booking deleted',
        description: 'The booking has been permanently removed',
        color: 'success',
      })

      return true
    }
    catch (error: any) {
      console.error('Failed to delete booking:', error)
      toast.add({
        title: 'Delete failed',
        description: error.data?.message || 'Failed to delete booking. Please try again.',
        color: 'error',
      })
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
