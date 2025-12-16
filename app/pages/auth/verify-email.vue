<script setup lang="ts">
/**
 * Verify Email Page
 *
 * Handles email verification callback.
 * URL: /auth/verify-email?token=xxx
 *
 * Also shows a resend verification email option.
 */

definePageMeta({
  layout: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { user, loggedIn } = useAuth()

// Get token from query params
const token = computed(() => route.query.token as string | undefined)

// State
const verifying = ref(false)
const verified = ref(false)
const verifyError = ref<string | null>(null)
const resending = ref(false)
const resent = ref(false)

// Get the auth client
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}

// Verify email on mount if token present
onMounted(async () => {
  if (token.value) {
    await verifyEmail()
  }
})

// Verify email with token
async function verifyEmail() {
  if (!token.value) return

  verifying.value = true
  verifyError.value = null

  try {
    const authClient = useAuthClient()
    const result = await authClient.verifyEmail({
      token: token.value,
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Verification failed')
    }

    verified.value = true
    toast.add({
      title: 'Email verified',
      description: 'Your email has been verified successfully.',
      color: 'success',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Verification failed'
    verifyError.value = message
    toast.add({
      title: 'Verification failed',
      description: message,
      color: 'error',
    })
  } finally {
    verifying.value = false
  }
}

// Resend verification email
async function resendVerification() {
  if (!user.value?.email) {
    toast.add({
      title: 'Error',
      description: 'Please sign in first to resend verification.',
      color: 'error',
    })
    return
  }

  resending.value = true

  try {
    const authClient = useAuthClient()
    const result = await authClient.sendVerificationEmail({
      email: user.value.email,
      callbackURL: window.location.origin + '/auth/verify-email',
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to send verification email')
    }

    resent.value = true
    toast.add({
      title: 'Email sent',
      description: 'Verification email has been sent to your inbox.',
      color: 'success',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to send verification email'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    resending.value = false
  }
}

// Navigate to dashboard
function goToDashboard() {
  router.push('/dashboard')
}

// Navigate to login
function goToLogin() {
  router.push('/auth/login')
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-2xl font-bold text-highlighted">
        {{ token ? 'Verifying your email' : 'Verify your email' }}
      </h1>
    </div>

    <!-- Verifying state -->
    <div v-if="verifying" class="mt-8 text-center">
      <UIcon name="i-lucide-loader-circle" class="size-12 animate-spin text-primary" />
      <p class="mt-4 text-muted">
        Verifying your email address...
      </p>
    </div>

    <!-- Verified successfully -->
    <div v-else-if="verified" class="mt-8">
      <UAlert
        color="success"
        icon="i-lucide-check-circle"
        title="Email verified"
        description="Your email has been verified successfully. You can now access all features."
      />
      <UButton
        class="mt-6"
        block
        @click="loggedIn ? goToDashboard() : goToLogin()"
      >
        {{ loggedIn ? 'Go to dashboard' : 'Sign in' }}
      </UButton>
    </div>

    <!-- Verification error -->
    <div v-else-if="verifyError" class="mt-8">
      <UAlert
        color="error"
        icon="i-lucide-alert-triangle"
        title="Verification failed"
        :description="verifyError"
      />
      <div class="mt-6 space-y-3">
        <UButton
          v-if="loggedIn"
          block
          :loading="resending"
          @click="resendVerification"
        >
          Resend verification email
        </UButton>
        <NuxtLink to="/auth/login">
          <UButton
            color="neutral"
            variant="outline"
            block
          >
            Back to sign in
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <!-- No token - show instructions -->
    <div v-else class="mt-8">
      <div class="text-center text-muted">
        <UIcon name="i-lucide-mail" class="size-12 mx-auto mb-4" />
        <p>
          Check your email inbox for a verification link.
        </p>
        <p class="mt-2">
          Click the link to verify your email address.
        </p>
      </div>

      <!-- Logged in: option to resend -->
      <div v-if="loggedIn && user?.email" class="mt-8 space-y-4">
        <UAlert
          v-if="resent"
          color="success"
          icon="i-lucide-mail-check"
          title="Email sent"
          :description="`Verification email sent to ${user.email}`"
        />

        <UButton
          v-if="!resent"
          block
          :loading="resending"
          @click="resendVerification"
        >
          Resend verification email
        </UButton>

        <NuxtLink to="/dashboard">
          <UButton
            color="neutral"
            variant="outline"
            block
          >
            Go to dashboard
          </UButton>
        </NuxtLink>
      </div>

      <!-- Not logged in -->
      <div v-else class="mt-8">
        <NuxtLink to="/auth/login">
          <UButton block>
            Sign in
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
