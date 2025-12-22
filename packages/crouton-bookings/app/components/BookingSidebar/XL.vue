<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

const {
  formState,
  locations,
  locationsStatus,
  selectedLocation,
  isCartOpen,
  isExpanded,
  cartCount,
  activeTab,
} = useBookingCart()

const { t } = useI18n()

// Tab items for Book/My Bookings
const tabItems = computed<TabsItem[]>(() => [
  {
    label: t('bookings.tabs.book'),
    icon: 'i-lucide-calendar-plus',
    value: 'book',
    slot: 'book',
  },
  {
    label: t('bookings.tabs.myBookings'),
    icon: 'i-lucide-calendar-check',
    value: 'my-bookings',
    slot: 'my-bookings',
  },
])

// Auto-select first location if none selected
watch(
  () => locations.value,
  (locs) => {
    if (locs && locs.length > 0 && !formState.locationId) {
      formState.locationId = locs[0].id
    }
  },
  { immediate: true },
)

function toggleCart() {
  isCartOpen.value = !isCartOpen.value
}
</script>

<template>
  <div class="fixed inset-0 grid grid-rows-[50vh_1fr] bg-white dark:bg-neutral-950">
    <!-- Collapse button (top-left) -->
    <div class="absolute top-4 left-4 z-30">
      <UButton
        variant="solid"
        color="neutral"
        size="sm"
        icon="i-lucide-minimize-2"
        @click="isExpanded = false"
      >
        {{ $t('bookings.buttons.collapse') }}
      </UButton>
    </div>

    <!-- Floating Booking Sidebar (right) - Desktop only - positioned at root level -->
    <div class="absolute top-4 right-4 bottom-4 w-[380px] z-30 hidden md:block">
        <div class="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl h-full flex flex-col overflow-hidden relative">
          <!-- Tabs: Book / My Bookings -->
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            class="flex-1 flex flex-col min-h-0"
            :ui="{
              root: 'flex-1 flex flex-col min-h-0',
              list: 'rounded-none border-b border-neutral-200 dark:border-neutral-800',
              content: 'flex-1 overflow-y-auto',
            }"
          >
            <template #book>
              <ClientOnly>
                <BookingSidebarForm :hide-location-select="true" />
                <template #fallback>
                  <div class="p-4 space-y-4 animate-pulse">
                    <div class="h-8 bg-neutral-200 dark:bg-neutral-700 rounded" />
                    <div class="h-64 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  </div>
                </template>
              </ClientOnly>
            </template>

            <template #my-bookings>
              <BookingSidebarMyBookings />
            </template>
          </UTabs>

          <!-- Cart trigger button -->
          <div class="border-t border-neutral-200 dark:border-neutral-800 p-2">
            <UButton
              block
              variant="soft"
              color="neutral"
              class="justify-between"
              @click="toggleCart"
            >
              <span class="flex items-center gap-2">
                <UIcon name="i-lucide-shopping-cart" class="w-4 h-4" />
                <span>{{ $t('bookings.cart.title') }}</span>
              </span>
              <span class="flex items-center gap-2">
                <ClientOnly>
                  <UBadge v-if="cartCount > 0" color="primary" size="xs">
                    {{ cartCount }}
                  </UBadge>
                </ClientOnly>
                <UIcon
                  :name="isCartOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                  class="w-4 h-4 transition-transform"
                />
              </span>
            </UButton>
          </div>

          <!-- Cart panel (slides up from bottom) -->
          <Transition
            enter-active-class="transition-transform duration-300 ease-out"
            enter-from-class="translate-y-full"
            enter-to-class="translate-y-0"
            leave-active-class="transition-transform duration-200 ease-in"
            leave-from-class="translate-y-0"
            leave-to-class="translate-y-full"
          >
            <div
              v-if="isCartOpen"
              class="absolute inset-x-0 bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shadow-lg max-h-[70%] flex flex-col rounded-b-2xl"
            >
              <div class="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 class="font-medium text-sm flex items-center gap-2">
                  <UIcon name="i-lucide-shopping-cart" class="w-4 h-4" />
                  {{ $t('bookings.cart.title') }}
                  <ClientOnly>
                    <UBadge v-if="cartCount > 0" color="primary" size="xs">
                      {{ cartCount }}
                    </UBadge>
                  </ClientOnly>
                </h3>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-chevron-down"
                  @click="isCartOpen = false"
                />
              </div>
              <div class="flex-1 overflow-y-auto">
                <BookingSidebarCart />
              </div>
            </div>
          </Transition>
        </div>
      </div>

    <!-- Map Hero Section -->
    <div class="relative min-h-[350px] bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
      <!-- Full-width map -->
      <ClientOnly>
        <BookingSidebarLocationMap :location="selectedLocation" />
        <template #fallback>
          <div class="absolute inset-0 flex items-center justify-center">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        </template>
      </ClientOnly>

      <!-- Floating Location Nav (centered top) -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-32px)] md:max-w-[calc(100%-420px)]">
        <div v-if="locationsStatus === 'pending'" class="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-full shadow-lg px-4 py-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span class="text-sm text-muted">{{ $t('common.loading') }}</span>
          </div>
        </div>
        <div
          v-else-if="locations && locations.length > 0"
          class="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-full shadow-lg px-2 py-1.5"
        >
          <BookingSidebarLocationNav
            v-model="formState.locationId"
            :locations="locations"
          />
        </div>
      </div>
    </div>

    <!-- Scrollable content area -->
    <div class="overflow-y-auto">
      <!-- Content Section (below map) -->
      <div class="bg-white dark:bg-neutral-950">
        <BookingSidebarLocationContent :location="selectedLocation" />
      </div>

      <!-- Mobile: Booking form below content -->
      <div class="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          :ui="{
            list: 'border-b border-neutral-200 dark:border-neutral-800',
          }"
        >
          <template #book>
            <ClientOnly>
              <BookingSidebarForm :hide-location-select="true" />
              <template #fallback>
                <div class="p-4 space-y-4 animate-pulse">
                  <div class="h-8 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div class="h-64 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
              </template>
            </ClientOnly>
          </template>

          <template #my-bookings>
            <BookingSidebarMyBookings />
          </template>
        </UTabs>

        <!-- Mobile Cart -->
        <div class="border-t border-neutral-200 dark:border-neutral-800 p-2">
          <UButton
            block
            variant="soft"
            color="neutral"
            class="justify-between"
            @click="toggleCart"
          >
            <span class="flex items-center gap-2">
              <UIcon name="i-lucide-shopping-cart" class="w-4 h-4" />
              <span>{{ $t('bookings.cart.title') }}</span>
            </span>
            <span class="flex items-center gap-2">
              <ClientOnly>
                <UBadge v-if="cartCount > 0" color="primary" size="xs">
                  {{ cartCount }}
                </UBadge>
              </ClientOnly>
              <UIcon
                :name="isCartOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="w-4 h-4 transition-transform"
              />
            </span>
          </UButton>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-96 opacity-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="max-h-96 opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div v-if="isCartOpen" class="overflow-hidden">
              <BookingSidebarCart />
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>
