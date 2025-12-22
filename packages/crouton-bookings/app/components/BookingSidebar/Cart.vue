<script setup lang="ts">
const {
  cart,
  cartCount,
  isSubmitting,
  isCartOpen,
  removeFromCart,
  clearCart,
  submitAll,
  activeTab,
} = useBookingCart()

// Handle submit
async function handleSubmit() {
  await submitAll()
}

// Go to booking tab (and close drawer)
function goToBooking() {
  isCartOpen.value = false
  activeTab.value = 'book'
}
</script>

<template>
  <div class="p-4">
    <!-- Empty State -->
    <div v-if="cartCount === 0" class="flex flex-col items-center justify-center text-center py-8">
      <UIcon name="i-lucide-shopping-cart" class="w-12 h-12 text-muted mb-3" />
      <h3 class="text-sm font-medium text-default mb-1">
        {{ $t('bookings.cart.empty') }}
      </h3>
      <p class="text-xs text-muted mb-4">
        {{ $t('bookings.cart.emptyDescription') }}
      </p>
      <UButton
        variant="soft"
        size="sm"
        icon="i-lucide-plus"
        @click="goToBooking"
      >
        {{ $t('bookings.cart.addBooking') }}
      </UButton>
    </div>

    <!-- Cart Items -->
    <template v-else>
      <!-- Header row -->
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-default">
          {{ $t('bookings.cart.itemCount', { count: cartCount }, cartCount) }}
        </h3>
        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-trash-2"
          @click="clearCart"
        >
          {{ $t('bookings.cart.clearAll') }}
        </UButton>
      </div>

      <!-- Items List -->
      <div class="space-y-2 mb-4">
        <CroutonBookingBookingSidebarBookingItem
          v-for="item in cart"
          :key="item.id"
          :id="item.id"
          :location-title="item.locationTitle"
          :slot-label="item.slotLabel"
          :slot-color="item.slotColor"
          :total-slots="item.totalSlots || 0"
          :slot-position="item.slotPosition ?? -1"
          :date="item.date"
          :group-label="item.groupLabel"
          :is-inventory-mode="item.isInventoryMode"
          action-type="remove"
          @remove="removeFromCart(item.id)"
        />
      </div>

      <!-- Submit Button -->
      <div class="pt-4 border-t border-default">
        <UButton
          block
          :loading="isSubmitting"
          :disabled="isSubmitting"
          icon="i-lucide-check"
          @click="handleSubmit"
        >
          {{ isSubmitting ? $t('bookings.cart.booking') : $t('bookings.cart.bookSlots', { count: cartCount }, cartCount) }}
        </UButton>
        <p class="text-xs text-muted text-center mt-2">
          {{ $t('bookings.cart.submitNote') }}
        </p>
      </div>
    </template>
  </div>
</template>
