<script setup lang="ts">
const { isOpen, cartCount } = useBookingCart()

function openSidebar() {
  isOpen.value = true
}
</script>

<template>
  <!-- Fixed position floating button - hidden when sidebar is open -->
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="!isOpen"
      class="fixed bottom-6 right-6 z-50"
    >
      <UButton
        size="lg"
        color="primary"
        class="shadow-lg hover:shadow-xl transition-shadow"
        @click="openSidebar"
      >
        <template #leading>
          <UIcon name="i-lucide-calendar-plus" class="w-5 h-5" />
        </template>
        Book Now
        <template v-if="cartCount > 0" #trailing>
          <span class="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-white text-primary rounded-sm">
            {{ cartCount > 9 ? '9+' : cartCount }}
          </span>
        </template>
      </UButton>
    </div>
  </Transition>
</template>
