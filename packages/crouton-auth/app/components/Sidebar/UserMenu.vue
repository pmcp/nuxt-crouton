<script setup lang="ts">
/**
 * UserMenu Component
 *
 * User avatar with dropdown menu for account actions.
 * Displayed in the sidebar footer.
 *
 * @example
 * ```vue
 * <SidebarUserMenu :collapsed="collapsed" />
 * ```
 */

interface Props {
  /** Whether the sidebar is collapsed */
  collapsed?: boolean
}

defineProps<Props>()

const { user, logout, loading } = useAuth()
const { buildDashboardUrl } = useTeamContext()

const router = useRouter()
const toast = useToast()

// Build dropdown items
const dropdownItems = computed(() => {
  const baseUrl = buildDashboardUrl('', '')

  return [
    [
      {
        label: 'Account Settings',
        icon: 'i-lucide-user',
        to: `${baseUrl}/settings`,
      },
      {
        label: 'Security',
        icon: 'i-lucide-shield',
        to: `${baseUrl}/settings/security`,
      },
    ],
    [
      {
        label: 'Sign out',
        icon: 'i-lucide-log-out',
        click: handleLogout,
      },
    ],
  ]
})

async function handleLogout() {
  try {
    await logout()
    toast.add({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
      color: 'success',
    })
    await router.push('/auth/login')
  }
  catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to sign out',
      color: 'error',
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
  <UDropdownMenu :items="dropdownItems">
    <UButton
      :loading="loading"
      variant="ghost"
      color="neutral"
      :class="collapsed ? 'w-full justify-center' : 'w-full justify-start'"
    >
      <template #leading>
        <UAvatar
          :src="user?.image ?? undefined"
          :alt="user?.name ?? 'User'"
          :text="userInitials"
          size="xs"
        />
      </template>

      <template v-if="!collapsed" #default>
        <div class="flex flex-col items-start min-w-0">
          <span class="text-sm font-medium truncate">
            {{ user?.name || 'User' }}
          </span>
          <span class="text-xs text-muted truncate">
            {{ user?.email }}
          </span>
        </div>
      </template>

      <template v-if="!collapsed" #trailing>
        <UIcon name="i-lucide-chevrons-up-down" class="size-4 text-muted" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
