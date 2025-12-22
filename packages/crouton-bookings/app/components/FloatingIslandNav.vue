<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

interface Props {
  teamSlug?: string
}

const props = defineProps<Props>()

const { isAuthenticated: loggedIn, clear: logout, user } = useSession()
const { isOpen, isExpanded, cartCount } = useBookingCart()
const { isAdmin } = useUserRole()
const router = useRouter()
const { t, locale, locales, setLocale } = useI18n()

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
        label: user.value?.name || user.value?.email || t('navigation.account'),
        type: 'label',
        icon: 'i-lucide-user',
      },
    ],
    [
      {
        label: t('bookings.tabs.myBookings'),
        icon: 'i-lucide-calendar',
        onSelect: () => {
          isOpen.value = true
        },
      },
      {
        label: t('navigation.accountSettings'),
        icon: 'i-lucide-settings',
        to: '/dashboard/account',
      },
    ],
    [
      {
        label: t('auth.logout'),
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
    enter-from-class="opacity-0 -translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 -translate-y-4 scale-95"
  >
    <div
      v-if="showIsland"
      class="fixed left-1/2 -translate-x-1/2 z-50"
      style="top: 16px;"
    >
      <UFieldGroup size="lg" class="shadow-2xl">
        <!-- Admin Settings Link (conditional) -->
        <UButton
          v-if="isAdmin"
          color="neutral"
          variant="subtle"
          icon="i-lucide-settings"
          to="/dashboard"
        />

        <!-- Language Switcher -->
        <UDropdownMenu
          :items="localeItems"
          :content="{ align: 'center', side: 'bottom', sideOffset: 8 }"
          :ui="{ content: 'min-w-24' }"
        >
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-globe"
            :label="locale.toUpperCase()"
          />
        </UDropdownMenu>

        <!-- Account Menu -->
        <UDropdownMenu
          :items="accountItems"
          :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
          :ui="{ content: 'w-48' }"
        >
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-user"
          />
        </UDropdownMenu>

        <!-- Book Button -->
        <UButton
          color="primary"
          icon="i-lucide-calendar-plus"
          :label="$t('bookings.buttons.book')"
          @click="toggleBookingSidebar"
        >
          <template v-if="cartCount > 0" #trailing>
            <UBadge
              color="white"
              variant="solid"
              size="xs"
            >
              {{ cartCount > 9 ? '9+' : cartCount }}
            </UBadge>
          </template>
        </UButton>
      </UFieldGroup>
    </div>
  </Transition>
</template>
