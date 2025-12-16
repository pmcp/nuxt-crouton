<script setup lang="ts">
/**
 * Linked Accounts Component
 *
 * Shows OAuth accounts linked to the user's account.
 * Allows unlinking accounts and linking new ones.
 *
 * @example
 * ```vue
 * <AccountLinkedAccounts />
 * ```
 */
import type { LinkedAccount } from '../../../types'

interface Props {
  /** External loading state */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const { hasOAuth, oauthProviders, loginWithOAuth } = useAuth()
const toast = useToast()

// Get auth client
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}
const authClient = useAuthClient()

// Accounts list
const accounts = ref<LinkedAccount[]>([])
const listLoading = ref(false)
const linkLoading = ref<string | null>(null)
const unlinkLoading = ref<string | null>(null)

const isLoading = computed(() => props.loading || listLoading.value)

// Provider info for display
const providerInfo: Record<string, { name: string, icon: string, color: string }> = {
  github: { name: 'GitHub', icon: 'i-simple-icons-github', color: 'gray' },
  google: { name: 'Google', icon: 'i-simple-icons-google', color: 'red' },
  discord: { name: 'Discord', icon: 'i-simple-icons-discord', color: 'indigo' },
  apple: { name: 'Apple', icon: 'i-simple-icons-apple', color: 'gray' },
  microsoft: { name: 'Microsoft', icon: 'i-simple-icons-microsoft', color: 'blue' },
  twitter: { name: 'X (Twitter)', icon: 'i-simple-icons-x', color: 'gray' },
  facebook: { name: 'Facebook', icon: 'i-simple-icons-facebook', color: 'blue' },
}

// Get provider display info
function getProviderInfo(provider: string) {
  return providerInfo[provider] ?? {
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    icon: 'i-lucide-link',
    color: 'gray',
  }
}

// Load linked accounts
async function loadAccounts() {
  listLoading.value = true
  try {
    const result = await authClient.listAccounts()
    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to load accounts')
    }
    accounts.value = (result.data ?? []).map((a: {
      id: string
      userId: string
      provider: string
      accountId: string
      accessToken?: string
      refreshToken?: string
      accessTokenExpiresAt?: string
      createdAt: string
      updatedAt: string
    }) => ({
      id: a.id,
      userId: a.userId,
      provider: a.provider,
      providerAccountId: a.accountId,
      accessToken: a.accessToken,
      refreshToken: a.refreshToken,
      expiresAt: a.accessTokenExpiresAt ? new Date(a.accessTokenExpiresAt) : undefined,
      createdAt: new Date(a.createdAt),
      updatedAt: new Date(a.updatedAt),
    }))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load accounts'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    listLoading.value = false
  }
}

// Initialize
onMounted(() => {
  if (hasOAuth.value) {
    loadAccounts()
  }
})

// Link new account
async function handleLink(provider: string) {
  linkLoading.value = provider
  try {
    await loginWithOAuth(provider)
    // This will redirect, so no need to handle success
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to link account'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
    linkLoading.value = null
  }
}

// Unlink account
async function handleUnlink(provider: string) {
  unlinkLoading.value = provider
  try {
    const result = await authClient.unlinkAccount({
      providerId: provider,
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to unlink account')
    }

    toast.add({
      title: 'Account unlinked',
      description: `Your ${getProviderInfo(provider).name} account has been disconnected.`,
      color: 'success',
    })

    // Remove from local list
    accounts.value = accounts.value.filter((a) => a.provider !== provider)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to unlink account'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    unlinkLoading.value = null
  }
}

// Check if provider is linked
function isLinked(provider: string): boolean {
  return accounts.value.some((a) => a.provider === provider)
}

// Get linked account for provider
function getLinkedAccount(provider: string): LinkedAccount | undefined {
  return accounts.value.find((a) => a.provider === provider)
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold">Linked Accounts</h3>
      <p class="text-sm text-muted mt-1">
        Connect external accounts for easy sign-in.
      </p>
    </div>

    <!-- OAuth not enabled -->
    <UAlert
      v-if="!hasOAuth"
      color="info"
      icon="i-lucide-info"
      title="Social login not enabled"
      description="Social login providers are not configured for this application."
    />

    <!-- Loading skeleton -->
    <div v-else-if="listLoading" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="flex items-center gap-4 p-4 rounded-lg border border-muted"
      >
        <USkeleton class="size-10 rounded-lg" />
        <div class="flex-1 space-y-2">
          <USkeleton class="h-4 w-24" />
          <USkeleton class="h-3 w-32" />
        </div>
        <USkeleton class="h-8 w-24" />
      </div>
    </div>

    <!-- Provider list -->
    <div v-else class="space-y-3">
      <div
        v-for="provider in oauthProviders"
        :key="provider"
        class="flex items-center gap-4 p-4 rounded-lg border border-muted hover:bg-muted/50 transition-colors"
      >
        <div
          class="flex items-center justify-center size-10 rounded-lg"
          :class="`bg-${getProviderInfo(provider).color}-500/10`"
        >
          <UIcon
            :name="getProviderInfo(provider).icon"
            class="size-5"
            :class="`text-${getProviderInfo(provider).color}-500`"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-medium">{{ getProviderInfo(provider).name }}</p>
          <p v-if="isLinked(provider)" class="text-sm text-muted">
            Connected {{ formatDate(getLinkedAccount(provider)!.createdAt) }}
          </p>
          <p v-else class="text-sm text-muted">
            Not connected
          </p>
        </div>

        <UButton
          v-if="isLinked(provider)"
          variant="ghost"
          color="error"
          icon="i-lucide-unlink"
          size="sm"
          :loading="unlinkLoading === provider"
          :disabled="isLoading || unlinkLoading !== null || accounts.length <= 1"
          @click="handleUnlink(provider)"
        >
          Disconnect
        </UButton>
        <UButton
          v-else
          variant="soft"
          icon="i-lucide-link"
          size="sm"
          :loading="linkLoading === provider"
          :disabled="isLoading || linkLoading !== null"
          @click="handleLink(provider)"
        >
          Connect
        </UButton>
      </div>
    </div>

    <!-- Warning if only one account linked -->
    <UAlert
      v-if="hasOAuth && !listLoading && accounts.length === 1"
      color="warning"
      variant="soft"
      icon="i-lucide-alert-triangle"
    >
      <template #title>Keep at least one login method</template>
      <template #description>
        You need at least one way to sign in to your account. Connect another account
        or set a password before disconnecting this one.
      </template>
    </UAlert>

    <!-- Info -->
    <UAlert
      v-if="hasOAuth"
      color="info"
      variant="soft"
      icon="i-lucide-link-2"
    >
      <template #title>About Linked Accounts</template>
      <template #description>
        Linking accounts lets you sign in using different services. Your data
        stays the same regardless of which method you use to sign in.
      </template>
    </UAlert>
  </div>
</template>
