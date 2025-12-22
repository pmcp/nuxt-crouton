<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { isAuthenticated: loggedIn, clear: logout, user } = useSession()
const { isOpen, isExpanded, cartCount, cartPulse } = useBookingCart()
const { isAdmin } = useUserRole()
const router = useRouter()
const { locale, locales, setLocale } = useI18n()

// Track pulse animation for cart badge
const isPulsing = ref(false)

watch(cartPulse, () => {
  isPulsing.value = true
  setTimeout(() => isPulsing.value = false, 600)
})

// Locale items for language switcher
const localeItems = computed<DropdownMenuItem[][]>(() => {
  const items = (locales.value as { code: string; name?: string }[]).map(loc => ({
    label: loc.name || loc.code.toUpperCase(),
    icon: locale.value === loc.code ? 'i-lucide-check' : undefined,
    onSelect: () => setLocale(loc.code),
  }))
  return [items]
})

// Account menu items
const accountItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[][] = [
    [
      {
        label: user.value?.name || user.value?.email || 'Account',
        type: 'label',
        icon: 'i-lucide-user',
      },
    ],
    [
      {
        label: 'My Bookings',
        icon: 'i-lucide-calendar',
        onSelect: () => {
          isOpen.value = true
        },
      },
      {
        label: 'Account Settings',
        icon: 'i-lucide-settings',
        to: '/dashboard/account',
      },
    ],
    [
      {
        label: 'Logout',
        icon: 'i-lucide-log-out',
        color: 'error',
        onSelect: async () => {
          await logout()
          router.push('/')
        },
      },
    ],
  ]
  return items
})

// Show island when logged in
const showIsland = computed(() => {
  return loggedIn.value
})

function toggleBookingSidebar() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-x-4 scale-95"
    enter-to-class="opacity-100 translate-x-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-x-0 scale-100"
    leave-to-class="opacity-0 translate-x-4 scale-95"
  >
    <div
      v-if="showIsland"
      class="fixed top-4 right-4 z-50 flex flex-col rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
      style="width: 384px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);"
    >
      <!-- Island Header (always visible) -->
      <div class="relative w-full bg-elevated flex justify-between">
        <!-- Left section: Settings -->
        <div class="ml-2 flex items-center gap-1">
          <UButton
            v-if="isAdmin"
            color="neutral"
            variant="soft"
            size="xs"
            icon="i-lucide-settings"
            to="/dashboard"
          />


          <!-- Account Menu -->
          <UDropdownMenu
            :items="accountItems"
            :content="{ align: 'center', side: 'bottom', sideOffset: 12 }"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-user"
            />
          </UDropdownMenu>

          <!-- Language Menu -->
          <UDropdownMenu
            :items="localeItems"
            :content="{ align: 'center', side: 'bottom', sideOffset: 12 }"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-globe"
              :label="locale.toUpperCase()"
            />
          </UDropdownMenu>

        </div>

        <!-- Book Button - fills top-right corner -->
        <UButton
          :variant="isOpen ? 'soft' : 'solid'"
          class=" rounded-none flex"
          @click="toggleBookingSidebar"
        >
          <div class="flex items-center gap-1 grow">
            <UIcon :name="isOpen ? 'i-lucide-x' : 'i-lucide-calendar-plus'" />
            <span>
              {{ isOpen ? 'Close' : 'Book' }}
            </span>
          </div>
          <UBadge
            v-if="cartCount > 0"
            :color="isPulsing ? 'success' : 'neutral'"
            :variant="isOpen ? 'soft' : 'solid'"
            class="transition-all duration-300"
            :class="isPulsing ? 'scale-125' : ''"
          >
            {{ cartCount > 9 ? '9+' : cartCount }}
          </UBadge>
        </UButton>
      </div>

      <div
        v-if="isOpen"
        style="height: calc(100vh - 5rem);"
      >
        <BookingSidebarSM class="pt-4" />
      </div>
    </div>
  </Transition>
</template>
