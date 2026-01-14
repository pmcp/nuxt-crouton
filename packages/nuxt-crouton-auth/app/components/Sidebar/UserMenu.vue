<script setup lang="ts">
/**
 * UserMenu Component
 *
 * User avatar with dropdown menu for account actions.
 * Opens settings in a modal to keep user in context.
 * Displayed in the sidebar footer.
 *
 * @example
 * ```vue
 * <SidebarUserMenu :collapsed="collapsed" />
 * ```
 */
import type { DropdownMenuItem } from '@nuxt/ui'

interface Props {
  /** Whether the sidebar is collapsed */
  collapsed?: boolean
}

defineProps<Props>()

const { t } = useT()
const { user, logout, loading } = useAuth()

const router = useRouter()
const toast = useToast()

// i18n
const { locale, setLocale, locales } = useI18n()

// Dark mode
const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

// Language flags
const flags: Record<string, string> = {
  en: '🇬🇧',
  nl: '🇳🇱',
  fr: '🇫🇷'
}

// Modal state
const showSettingsModal = ref(false)
const settingsTab = ref<'profile' | 'security'>('profile')

function openSettings(tab: 'profile' | 'security' = 'profile') {
  settingsTab.value = tab
  showSettingsModal.value = true
}

// Build language submenu items
const languageItems = computed<DropdownMenuItem[]>(() => {
  return (locales.value as Array<{ code: string, name?: string }>).map(loc => ({
    label: `${flags[loc.code] || '🌐'} ${loc.name || loc.code.toUpperCase()}`,
    onSelect: async (e: Event) => {
      e.preventDefault()
      await setLocale(loc.code)
    },
    active: locale.value === loc.code
  }))
})

// Build dropdown items - open modal instead of navigating
const dropdownItems = computed<DropdownMenuItem[][]>(() => {
  return [
    [
      {
        label: user.value?.name || 'User',
        avatar: {
          src: user.value?.image ?? undefined,
          alt: user.value?.name ?? 'User',
          text: userInitials.value
        },
        type: 'label'
      }
    ],
    [
      {
        label: t('navigation.accountSettings') || 'Account Settings',
        icon: 'i-lucide-user',
        onSelect: () => openSettings('profile')
      },
      {
        label: t('account.security') || 'Security',
        icon: 'i-lucide-shield',
        onSelect: () => openSettings('security')
      }
    ],
    [
      {
        label: t('forms.language') || 'Language',
        icon: 'i-lucide-globe',
        children: languageItems.value
      },
      {
        label: 'Dark Mode',
        icon: isDark.value ? 'i-lucide-moon' : 'i-lucide-sun',
        type: 'checkbox',
        checked: isDark.value,
        onUpdateChecked: (checked: boolean) => {
          isDark.value = checked
        },
        onSelect: (e: Event) => {
          e.preventDefault()
        }
      }
    ],
    [
      {
        label: t('auth.signOut') || 'Sign Out',
        icon: 'i-lucide-log-out',
        color: 'error',
        onSelect: handleLogout
      }
    ]
  ]
})

async function handleLogout() {
  try {
    await logout()
    toast.add({
      title: t('auth.signOut') || 'Signed out',
      description: t('success.saved') || 'You have been signed out successfully.',
      color: 'success'
    })
    await router.push('/auth/login')
  } catch (error: unknown) {
    toast.add({
      title: t('errors.generic') || 'Error',
      description: error instanceof Error ? error.message : 'Failed to sign out',
      color: 'error'
    })
  }
}

// User initials for avatar fallback
const userInitials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <UDropdownMenu
    :items="dropdownItems"
    :content="{ align: 'start', side: 'top' }"
    :ui="{ content: 'w-56' }"
  >
    <UButton
      :loading="loading"
      variant="ghost"
      color="neutral"
      :class="[
        'w-full',
        collapsed ? 'justify-center px-2' : 'justify-start'
      ]"
    >
      <template #leading>
        <UAvatar
          :src="user?.image ?? undefined"
          :alt="user?.name ?? 'User'"
          :text="userInitials"
          size="sm"
        />
      </template>

      <template
        v-if="!collapsed"
        #default
      >
        <div class="flex flex-col items-start min-w-0 flex-1">
          <span class="text-sm font-medium truncate max-w-full">
            {{ user?.name || 'User' }}
          </span>
          <span class="text-xs text-muted truncate max-w-full">
            {{ user?.email }}
          </span>
        </div>
      </template>

      <template
        v-if="!collapsed"
        #trailing
      >
        <UIcon
          name="i-lucide-chevrons-up-down"
          class="size-4 text-muted shrink-0"
        />
      </template>
    </UButton>
  </UDropdownMenu>

  <!-- Account Settings Modal -->
  <UModal
    v-model:open="showSettingsModal"
    :ui="{ width: 'sm:max-w-2xl' }"
  >
    <template #content="{ close }">
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <AccountSettings :default-tab="settingsTab" />
        <div class="flex justify-end mt-6 pt-4 border-t border-default">
          <UButton
            color="neutral"
            variant="ghost"
            @click="close"
          >
            {{ t('common.close') || 'Close' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
