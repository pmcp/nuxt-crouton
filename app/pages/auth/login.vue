<script setup lang="ts">
/**
 * Login Page
 *
 * Displays login options based on configured auth methods:
 * - Email/password form
 * - OAuth buttons
 * - Passkey button
 * - Magic link option
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const {
  login,
  loginWithOAuth,
  loginWithPasskey,
  loginWithMagicLink,
  hasPassword,
  hasOAuth,
  hasPasskeys,
  hasMagicLink,
  oauthProviders,
  loading,
  error,
  isWebAuthnSupported,
} = useAuth()

// Form state
const state = reactive({
  email: '',
  password: '',
  rememberMe: false,
})

// Magic link mode toggle
const showMagicLink = ref(false)
const magicLinkSent = ref(false)

// Get redirect URL from query or default to dashboard
const redirectTo = computed(() => {
  const redirect = route.query.redirect as string | undefined
  return redirect || '/dashboard'
})

// Custom validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!formState.email) {
    errors.push({ name: 'email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Invalid email address' })
  }
  if (!showMagicLink.value && !formState.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  }
  return errors
}

// Handle form submission
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  try {
    if (showMagicLink.value) {
      await loginWithMagicLink(event.data.email)
      magicLinkSent.value = true
      toast.add({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
        color: 'success',
      })
    } else {
      await login({
        email: event.data.email,
        password: event.data.password,
        rememberMe: event.data.rememberMe,
      })
      await router.push(redirectTo.value)
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Login failed'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// Handle OAuth login
async function handleOAuth(provider: string) {
  try {
    await loginWithOAuth(provider)
    // OAuth redirects, no need to navigate
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'OAuth login failed'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// Handle passkey login
async function handlePasskey() {
  try {
    await loginWithPasskey()
    await router.push(redirectTo.value)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Passkey login failed'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// OAuth provider icons
const providerIcons: Record<string, string> = {
  github: 'i-simple-icons-github',
  google: 'i-simple-icons-google',
  discord: 'i-simple-icons-discord',
}

// Check if passkey is available
const passkeyAvailable = computed(() => {
  return hasPasskeys.value && isWebAuthnSupported()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-2xl font-bold text-highlighted">
        Sign in to your account
      </h1>
      <p class="mt-2 text-sm text-muted">
        Or
        <NuxtLink to="/auth/register" class="font-medium text-primary hover:text-primary/80">
          create a new account
        </NuxtLink>
      </p>
    </div>

    <!-- Magic link sent confirmation -->
    <div v-if="magicLinkSent" class="mt-8">
      <UAlert
        color="success"
        icon="i-lucide-mail-check"
        title="Check your inbox"
        description="We sent a magic link to your email. Click the link to sign in."
      />
      <UButton
        class="mt-4"
        variant="ghost"
        block
        @click="magicLinkSent = false; showMagicLink = false"
      >
        Back to login
      </UButton>
    </div>

    <template v-else>
      <!-- OAuth Buttons -->
      <div v-if="hasOAuth && oauthProviders.length > 0" class="mt-8 space-y-3">
        <UButton
          v-for="provider in oauthProviders"
          :key="provider"
          color="neutral"
          variant="outline"
          block
          :icon="providerIcons[provider] || 'i-lucide-user'"
          :loading="loading"
          @click="handleOAuth(provider)"
        >
          Continue with {{ provider.charAt(0).toUpperCase() + provider.slice(1) }}
        </UButton>

        <!-- Passkey Button -->
        <UButton
          v-if="passkeyAvailable"
          color="neutral"
          variant="outline"
          block
          icon="i-lucide-fingerprint"
          :loading="loading"
          @click="handlePasskey"
        >
          Sign in with Passkey
        </UButton>
      </div>

      <!-- Separator -->
      <div v-if="hasOAuth && oauthProviders.length > 0 && hasPassword" class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <USeparator />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-default px-2 text-muted">Or continue with</span>
          </div>
        </div>
      </div>

      <!-- Email/Password Form -->
      <UForm
        v-if="hasPassword || hasMagicLink"
        :validate="validate"
        :state="state"
        class="mt-8 space-y-6"
        @submit="onSubmit"
      >
        <UFormField label="Email address" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            icon="i-lucide-mail"
          />
        </UFormField>

        <UFormField v-if="!showMagicLink && hasPassword" label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            icon="i-lucide-lock"
          />
        </UFormField>

        <div v-if="!showMagicLink && hasPassword" class="flex items-center justify-between">
          <UCheckbox v-model="state.rememberMe" label="Remember me" />
          <NuxtLink
            to="/auth/forgot-password"
            class="text-sm font-medium text-primary hover:text-primary/80"
          >
            Forgot password?
          </NuxtLink>
        </div>

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-alert-circle"
          :title="error"
        />

        <UButton
          type="submit"
          block
          :loading="loading"
        >
          {{ showMagicLink ? 'Send magic link' : 'Sign in' }}
        </UButton>

        <!-- Magic Link Toggle -->
        <div v-if="hasMagicLink && hasPassword" class="text-center">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:text-primary/80"
            @click="showMagicLink = !showMagicLink"
          >
            {{ showMagicLink ? 'Sign in with password' : 'Sign in with magic link' }}
          </button>
        </div>
      </UForm>

      <!-- Passkey-only (no password, no OAuth) -->
      <div v-else-if="passkeyAvailable" class="mt-8">
        <UButton
          block
          icon="i-lucide-fingerprint"
          :loading="loading"
          @click="handlePasskey"
        >
          Sign in with Passkey
        </UButton>
      </div>
    </template>
  </div>
</template>
