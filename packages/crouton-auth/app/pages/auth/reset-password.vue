<script setup lang="ts">
/**
 * Reset Password Page
 *
 * Handles password reset with token from email.
 * URL: /auth/reset-password?token=xxx
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { resetPassword, loading, error } = useAuth()

// Get token from query params
const token = computed(() => route.query.token as string | undefined)

// Form state
const state = reactive({
  password: '',
  confirmPassword: '',
})

// Track if reset was successful
const resetSuccess = ref(false)

// Custom validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []

  if (!formState.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  } else if (formState.password.length < 8) {
    errors.push({ name: 'password', message: 'Password must be at least 8 characters' })
  }

  if (formState.password !== formState.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Passwords do not match' })
  }

  return errors
}

// Handle form submission
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  if (!token.value) {
    toast.add({
      title: 'Invalid link',
      description: 'The reset link is invalid or has expired.',
      color: 'error',
    })
    return
  }

  try {
    await resetPassword(token.value, event.data.password)
    resetSuccess.value = true
    toast.add({
      title: 'Password reset',
      description: 'Your password has been reset successfully.',
      color: 'success',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Password reset failed'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// Redirect to login
function goToLogin() {
  router.push('/auth/login')
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-2xl font-bold text-highlighted">
        Set new password
      </h1>
      <p class="mt-2 text-sm text-muted">
        Enter your new password below.
      </p>
    </div>

    <!-- Invalid/missing token -->
    <div v-if="!token" class="mt-8">
      <UAlert
        color="error"
        icon="i-lucide-alert-triangle"
        title="Invalid reset link"
        description="The password reset link is invalid or has expired. Please request a new one."
      />
      <NuxtLink to="/auth/forgot-password" class="block mt-6">
        <UButton block>
          Request new link
        </UButton>
      </NuxtLink>
    </div>

    <!-- Reset successful -->
    <div v-else-if="resetSuccess" class="mt-8">
      <UAlert
        color="success"
        icon="i-lucide-check-circle"
        title="Password updated"
        description="Your password has been reset successfully. You can now sign in with your new password."
      />
      <UButton
        class="mt-6"
        block
        @click="goToLogin"
      >
        Sign in
      </UButton>
    </div>

    <!-- Reset Form -->
    <UForm
      v-else
      :validate="validate"
      :state="state"
      class="mt-8 space-y-6"
      @submit="onSubmit"
    >
      <UFormField label="New password" name="password">
        <UInput
          v-model="state.password"
          type="password"
          placeholder="At least 8 characters"
          autocomplete="new-password"
          icon="i-lucide-lock"
        />
      </UFormField>

      <UFormField label="Confirm new password" name="confirmPassword">
        <UInput
          v-model="state.confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          autocomplete="new-password"
          icon="i-lucide-lock"
        />
      </UFormField>

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
        Reset password
      </UButton>

      <div class="text-center">
        <NuxtLink
          to="/auth/login"
          class="text-sm font-medium text-primary hover:text-primary/80"
        >
          Back to sign in
        </NuxtLink>
      </div>
    </UForm>
  </div>
</template>
