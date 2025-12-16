<script setup lang="ts">
/**
 * Account Settings Component
 *
 * Main container component for user account settings.
 * Organizes settings into sections with tabs navigation.
 *
 * @example
 * ```vue
 * <AccountSettings />
 * ```
 */
interface Props {
  /** Default active tab */
  defaultTab?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultTab: 'profile',
})

const { hasPassword, hasOAuth, hasPasskeys, has2FA } = useAuth()

// Tab state
const activeTab = ref(props.defaultTab)

// Define available tabs
const tabs = computed(() => {
  const items = [
    {
      value: 'profile',
      label: 'Profile',
      icon: 'i-lucide-user',
    },
  ]

  // Only show password tab if password auth is enabled
  if (hasPassword.value) {
    items.push({
      value: 'password',
      label: 'Password',
      icon: 'i-lucide-lock',
    })
  }

  // Security tab for passkeys and 2FA
  if (hasPasskeys.value || has2FA.value) {
    items.push({
      value: 'security',
      label: 'Security',
      icon: 'i-lucide-shield',
    })
  }

  // Only show linked accounts if OAuth is enabled
  if (hasOAuth.value) {
    items.push({
      value: 'linked',
      label: 'Linked Accounts',
      icon: 'i-lucide-link',
    })
  }

  // Danger zone is always available
  items.push({
    value: 'danger',
    label: 'Danger Zone',
    icon: 'i-lucide-alert-triangle',
  })

  return items
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold">Account Settings</h2>
      <p class="text-muted mt-1">
        Manage your account settings and preferences.
      </p>
    </div>

    <!-- Tabs Navigation -->
    <UTabs
      v-model="activeTab"
      :items="tabs"
      class="w-full"
    >
      <template #content="{ item }">
        <div class="pt-6">
          <!-- Profile Tab -->
          <AccountProfileForm v-if="item.value === 'profile'" />

          <!-- Password Tab -->
          <AccountPasswordForm v-else-if="item.value === 'password'" />

          <!-- Security Tab -->
          <div v-else-if="item.value === 'security'" class="space-y-8">
            <AccountTwoFactorSetup v-if="has2FA" />
            <USeparator v-if="has2FA && hasPasskeys" />
            <AccountPasskeyManager v-if="hasPasskeys" />
          </div>

          <!-- Linked Accounts Tab -->
          <AccountLinkedAccounts v-else-if="item.value === 'linked'" />

          <!-- Danger Zone Tab -->
          <AccountDeleteAccount v-else-if="item.value === 'danger'" />
        </div>
      </template>
    </UTabs>
  </div>
</template>
