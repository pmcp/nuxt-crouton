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

// Magic link mode toggle
const showMagicLink = ref(false)
const magicLinkSent = ref(false)

// Get redirect URL from query or default to dashboard
const redirectTo = computed(() => {
  const redirect = route.query.redirect as string | undefined
  return redirect || '/dashboard'
})

// Handle login form submission
async function handleLogin(credentials: { email: string, password: string, rememberMe: boolean }) {
  try {
    await login({
      email: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe,
    })
    await router.push(redirectTo.value)
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

// Handle magic link submission
async function handleMagicLink(email: string) {
  try {
    await loginWithMagicLink(email)
    magicLinkSent.value = true
    toast.add({
      title: 'Check your email',
      description: 'We sent you a magic link to sign in.',
      color: 'success',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Magic link failed'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// Reset magic link state
function resetMagicLink() {
  magicLinkSent.value = false
  showMagicLink.value = false
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
        @click="resetMagicLink"
      >
        Back to login
      </UButton>
    </div>

    <template v-else>
      <!-- OAuth Buttons -->
      <div v-if="hasOAuth && oauthProviders.length > 0" class="mt-8">
        <AuthOAuthButtons :loading="loading" @click="handleOAuth" />

        <!-- Passkey Button (shown with OAuth) -->
        <div v-if="passkeyAvailable" class="mt-3">
          <AuthPasskeyButton :loading="loading" @click="handlePasskey" />
        </div>
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

      <!-- Magic Link Form -->
      <div v-if="showMagicLink && hasMagicLink" class="mt-8">
        <AuthMagicLinkForm
          :loading="loading"
          :error="error"
          @submit="handleMagicLink"
          @reset="showMagicLink = false"
        />
        <div v-if="hasPassword" class="mt-4 text-center">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:text-primary/80"
            @click="showMagicLink = false"
          >
            Sign in with password
          </button>
        </div>
      </div>

      <!-- Email/Password Form -->
      <div v-else-if="hasPassword || hasMagicLink" class="mt-8">
        <AuthLoginForm
          :loading="loading"
          :error="error"
          @submit="handleLogin"
        />

        <!-- Magic Link Toggle -->
        <div v-if="hasMagicLink && hasPassword" class="mt-4 text-center">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:text-primary/80"
            @click="showMagicLink = true"
          >
            Sign in with magic link
          </button>
        </div>
      </div>

      <!-- Passkey-only (no password, no OAuth) -->
      <div v-else-if="passkeyAvailable" class="mt-8">
        <AuthPasskeyButton
          :loading="loading"
          variant="solid"
          color="primary"
          @click="handlePasskey"
        />
      </div>
    </template>
  </div>
</template>
