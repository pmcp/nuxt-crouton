<script setup lang="ts">
/**
 * Magic Link Page
 *
 * Handles magic link callback when user clicks the link in their email.
 * URL: /auth/magic-link?token=xxx
 *
 * This page automatically verifies the magic link token and signs the user in.
 */

definePageMeta({
  layout: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { hasMagicLink } = useAuth()

// Get token from query params
const token = computed(() => route.query.token as string | undefined)

// State
const verifying = ref(false)
const verified = ref(false)
const verifyError = ref<string | null>(null)

// Get the auth client
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}

// Verify magic link on mount
onMounted(async () => {
  if (token.value) {
    await verifyMagicLink()
  }
})

// Verify magic link token
async function verifyMagicLink() {
  if (!token.value) return

  verifying.value = true
  verifyError.value = null

  try {
    const authClient = useAuthClient()
    const result = await authClient.magicLink.verify({
      token: token.value,
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Magic link verification failed')
    }

    verified.value = true
    toast.add({
      title: 'Signed in',
      description: 'You have been signed in successfully.',
      color: 'success',
    })

    // Redirect to dashboard after short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Magic link verification failed'
    verifyError.value = message
    toast.add({
      title: 'Sign in failed',
      description: message,
      color: 'error',
    })
  } finally {
    verifying.value = false
  }
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
        Magic Link Sign In
      </h1>
    </div>

    <!-- Magic link not enabled -->
    <div v-if="!hasMagicLink" class="mt-8">
      <UAlert
        color="warning"
        icon="i-lucide-alert-triangle"
        title="Magic link not enabled"
        description="Magic link authentication is not enabled for this application."
      />
      <NuxtLink to="/auth/login" class="block mt-6">
        <UButton block>
          Sign in with another method
        </UButton>
      </NuxtLink>
    </div>

    <!-- No token -->
    <div v-else-if="!token" class="mt-8">
      <UAlert
        color="error"
        icon="i-lucide-alert-triangle"
        title="Invalid link"
        description="The magic link is invalid or has expired. Please request a new one."
      />
      <NuxtLink to="/auth/login" class="block mt-6">
        <UButton block>
          Request new magic link
        </UButton>
      </NuxtLink>
    </div>

    <!-- Verifying state -->
    <div v-else-if="verifying" class="mt-8 text-center">
      <UIcon name="i-lucide-loader-circle" class="size-12 animate-spin text-primary" />
      <p class="mt-4 text-muted">
        Signing you in...
      </p>
    </div>

    <!-- Verified successfully -->
    <div v-else-if="verified" class="mt-8">
      <UAlert
        color="success"
        icon="i-lucide-check-circle"
        title="Signed in"
        description="You have been signed in successfully. Redirecting to dashboard..."
      />
      <div class="mt-4 text-center">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      </div>
    </div>

    <!-- Verification error -->
    <div v-else-if="verifyError" class="mt-8">
      <UAlert
        color="error"
        icon="i-lucide-alert-triangle"
        title="Sign in failed"
        :description="verifyError"
      />
      <div class="mt-6 space-y-3">
        <NuxtLink to="/auth/login">
          <UButton block>
            Try again
          </UButton>
        </NuxtLink>
        <p class="text-center text-sm text-muted">
          The magic link may have expired. Request a new one from the login page.
        </p>
      </div>
    </div>
  </div>
</template>
