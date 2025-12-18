<script setup lang="ts">
/**
 * OAuthButtons Component
 *
 * Displays OAuth provider buttons for social login.
 * Automatically shows only configured providers.
 *
 * @example
 * ```vue
 * <AuthOAuthButtons @click="handleOAuth" />
 * ```
 */
interface Props {
  /** Show loading state */
  loading?: boolean
  /** Override text (default: "Continue with {Provider}") */
  textPrefix?: string
  /** Layout direction */
  direction?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  textPrefix: 'Continue with',
  direction: 'vertical',
})

const emit = defineEmits<{
  /** Emitted when a provider button is clicked */
  click: [provider: string]
}>()

const { hasOAuth, oauthProviders } = useAuth()

// OAuth provider configuration
const providerConfig: Record<string, { icon: string, color?: string, name: string }> = {
  github: { icon: 'i-simple-icons-github', name: 'GitHub' },
  google: { icon: 'i-simple-icons-google', name: 'Google' },
  discord: { icon: 'i-simple-icons-discord', color: '#5865F2', name: 'Discord' },
  twitter: { icon: 'i-simple-icons-x', name: 'X' },
  facebook: { icon: 'i-simple-icons-facebook', color: '#1877F2', name: 'Facebook' },
  apple: { icon: 'i-simple-icons-apple', name: 'Apple' },
  microsoft: { icon: 'i-simple-icons-microsoft', name: 'Microsoft' },
  linkedin: { icon: 'i-simple-icons-linkedin', color: '#0A66C2', name: 'LinkedIn' },
}

// Get config for a provider
function getProviderConfig(provider: string) {
  return providerConfig[provider] || {
    icon: 'i-lucide-user',
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
  }
}

// Handle button click
function handleClick(provider: string) {
  emit('click', provider)
}
</script>

<template>
  <div
    v-if="hasOAuth && oauthProviders.length > 0"
    :class="[
      direction === 'vertical' ? 'space-y-3' : 'flex gap-3 flex-wrap',
    ]"
  >
    <UButton
      v-for="provider in oauthProviders"
      :key="provider"
      color="neutral"
      variant="outline"
      :block="direction === 'vertical'"
      :class="direction === 'horizontal' ? 'flex-1 min-w-[140px]' : ''"
      :icon="getProviderConfig(provider).icon"
      :loading="loading"
      @click="handleClick(provider)"
    >
      {{ textPrefix }} {{ getProviderConfig(provider).name }}
    </UButton>
  </div>
</template>
