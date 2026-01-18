<script setup lang="ts">
/**
 * Login Page
 *
 * Beautiful, modern login page using UAuthForm.
 * Supports email/password, OAuth, passkeys, and magic links.
 */
import type { FormSubmitEvent, AuthFormField, ButtonProps } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useT()
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
  isWebAuthnSupported
} = useAuth()

const redirects = useAuthRedirects()

// Error state
const formError = ref<string | null>(null)

// Magic link mode
const showMagicLink = ref(false)
const magicLinkSent = ref(false)
const magicLinkEmail = ref('')

// Get redirect URL from query or use configured afterLogin redirect
const redirectTo = computed(() => {
  const redirect = route.query.redirect as string | undefined
  return redirect || redirects.afterLogin
})

// Check if passkey is available
const passkeyAvailable = computed(() => {
  return hasPasskeys.value && isWebAuthnSupported()
})

// Build form fields dynamically
const loginFields = computed<AuthFormField[]>(() => {
  if (showMagicLink.value) {
    return [{
      name: 'email',
      type: 'email',
      label: t('auth.email'),
      placeholder: 'you@example.com',
      required: true
    }]
  }

  return [{
    name: 'email',
    type: 'email',
    label: t('auth.email'),
    placeholder: 'you@example.com',
    required: true
  }, {
    name: 'password',
    type: 'password',
    label: t('auth.password'),
    placeholder: 'Enter your password',
    required: true
  }, {
    name: 'rememberMe',
    type: 'checkbox',
    label: t('auth.rememberMe')
  }]
})

// OAuth provider configuration
const providerConfig: Record<string, { icon: string, name: string }> = {
  github: { icon: 'i-lucide-github', name: 'GitHub' },
  google: { icon: 'i-simple-icons-google', name: 'Google' },
  discord: { icon: 'i-simple-icons-discord', name: 'Discord' },
  twitter: { icon: 'i-lucide-twitter', name: 'X' },
  facebook: { icon: 'i-lucide-facebook', name: 'Facebook' },
  apple: { icon: 'i-simple-icons-apple', name: 'Apple' },
  microsoft: { icon: 'i-simple-icons-microsoft', name: 'Microsoft' },
  linkedin: { icon: 'i-lucide-linkedin', name: 'LinkedIn' }
}

// Build OAuth providers for UAuthForm
const providers = computed<ButtonProps[]>(() => {
  const result: ButtonProps[] = []

  if (hasOAuth.value && oauthProviders.value.length > 0) {
    for (const provider of oauthProviders.value) {
      const config = providerConfig[provider] || { icon: 'i-lucide-user', name: provider }
      result.push({
        label: `Continue with ${config.name}`,
        icon: config.icon,
        onClick: () => handleOAuth(provider)
      })
    }
  }

  // Add passkey button if available
  if (passkeyAvailable.value) {
    result.push({
      label: 'Sign in with Passkey',
      icon: 'i-lucide-fingerprint',
      onClick: handlePasskey
    })
  }

  return result
})

// Submit button config
const submitButton = computed(() => ({
  label: showMagicLink.value ? t('auth.sendMagicLink') : t('auth.signIn'),
  loading: loading.value,
  block: true
}))

// Handle form submission
async function onSubmit(event: FormSubmitEvent<{ email: string, password?: string, rememberMe?: boolean }>) {
  formError.value = null

  if (showMagicLink.value) {
    await handleMagicLink(event.data.email)
    return
  }

  try {
    await login({
      email: event.data.email,
      password: event.data.password!,
      rememberMe: event.data.rememberMe || false
    })
    await router.push(redirectTo.value)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Login failed'
    formError.value = message
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  }
}

// Handle OAuth login
async function handleOAuth(provider: string) {
  formError.value = null
  try {
    await loginWithOAuth(provider)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'OAuth login failed'
    formError.value = message
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  }
}

// Handle passkey login
async function handlePasskey() {
  formError.value = null
  try {
    await loginWithPasskey()
    await router.push(redirectTo.value)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Passkey login failed'
    formError.value = message
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  }
}

// Handle magic link submission
async function handleMagicLink(email: string) {
  try {
    await loginWithMagicLink(email)
    magicLinkSent.value = true
    magicLinkEmail.value = email
    toast.add({
      title: 'Check your email',
      description: 'We sent you a magic link to sign in.',
      color: 'success'
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Magic link failed'
    formError.value = message
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  }
}

// Reset magic link state
function resetMagicLink() {
  magicLinkSent.value = false
  showMagicLink.value = false
  magicLinkEmail.value = ''
  formError.value = null
}

// Toggle magic link mode
function toggleMagicLink() {
  showMagicLink.value = !showMagicLink.value
  formError.value = null
}
</script>

<template>
  <UPageCard>
    <!-- Magic link sent confirmation -->
    <div
      v-if="magicLinkSent"
      class="space-y-6"
    >
      <div class="text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <UIcon
            name="i-lucide-mail-check"
            class="h-6 w-6 text-success"
          />
        </div>
        <h2 class="mt-4 text-xl font-semibold text-highlighted">
          {{ t('auth.checkYourInbox') }}
        </h2>
        <p class="mt-2 text-muted">
          We sent a magic link to <span class="font-medium text-highlighted">{{ magicLinkEmail }}</span>
        </p>
      </div>

      <UButton
        variant="outline"
        color="neutral"
        block
        @click="resetMagicLink"
      >
        {{ t('auth.backToSignIn') }}
      </UButton>
    </div>

    <!-- Login Form -->
    <template v-else>
      <UAuthForm
        :fields="loginFields"
        :providers="hasPassword ? providers : []"
        :submit="submitButton"
        :loading="loading"
        :title="showMagicLink ? t('auth.signInWithMagicLink') : t('auth.welcomeBack')"
        :icon="showMagicLink ? 'i-lucide-wand-2' : 'i-lucide-lock'"
        :separator="hasPassword && providers.length > 0 ? 'or' : undefined"
        @submit="onSubmit"
      >
        <template #description>
          <template v-if="showMagicLink">
            {{ t('auth.magicLinkDescription') }}
          </template>
          <template v-else>
            {{ t('auth.dontHaveAccount') }}
            <ULink
              to="/auth/register"
              class="text-primary font-medium"
            >
              {{ t('auth.signUp') }}
            </ULink>
          </template>
        </template>

        <template
          v-if="!showMagicLink && hasPassword"
          #password-hint
        >
          <ULink
            to="/auth/forgot-password"
            class="text-primary font-medium"
            tabindex="-1"
          >
            {{ t('auth.forgotPassword') }}
          </ULink>
        </template>

        <template
          v-if="formError"
          #validation
        >
          <UAlert
            color="error"
            icon="i-lucide-alert-circle"
            :title="formError"
          />
        </template>

        <template #footer>
          <template v-if="hasMagicLink && hasPassword">
            <button
              type="button"
              class="text-sm text-primary font-medium hover:text-primary/80"
              @click="toggleMagicLink"
            >
              {{ showMagicLink ? t('auth.signInWithPassword') : t('auth.signInWithMagicLink') }}
            </button>
          </template>
        </template>
      </UAuthForm>

      <!-- Providers only (no password auth) -->
      <div
        v-if="!hasPassword && providers.length > 0"
        class="space-y-6"
      >
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UIcon
              name="i-lucide-lock"
              class="h-6 w-6 text-primary"
            />
          </div>
          <h2 class="mt-4 text-xl font-semibold text-highlighted">
            {{ t('auth.welcomeBack') }}
          </h2>
          <p class="mt-2 text-muted">
            {{ t('auth.dontHaveAccount') }}
            <ULink
              to="/auth/register"
              class="text-primary font-medium"
            >
              {{ t('auth.signUp') }}
            </ULink>
          </p>
        </div>

        <div class="space-y-3">
          <UButton
            v-for="(provider, index) in providers"
            :key="index"
            v-bind="provider"
            color="neutral"
            variant="subtle"
            block
          />
        </div>

        <UAlert
          v-if="formError"
          color="error"
          icon="i-lucide-alert-circle"
          :title="formError"
        />
      </div>
    </template>
  </UPageCard>
</template>
