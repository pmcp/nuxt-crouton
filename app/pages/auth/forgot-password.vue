<script setup lang="ts">
/**
 * Forgot Password Page
 *
 * Allows users to request a password reset email.
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const toast = useToast()

const { forgotPassword, loading, error } = useAuth()

// Form state
const state = reactive({
  email: '',
})

// Track if email was sent
const emailSent = ref(false)

// Custom validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!formState.email) {
    errors.push({ name: 'email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Invalid email address' })
  }
  return errors
}

// Handle form submission
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  try {
    await forgotPassword(event.data.email)
    emailSent.value = true
    toast.add({
      title: 'Email sent',
      description: 'Check your inbox for a password reset link.',
      color: 'success',
    })
  } catch (e: unknown) {
    // Don't reveal if email exists or not for security
    // Still show success message
    emailSent.value = true
    toast.add({
      title: 'Email sent',
      description: 'If an account exists with this email, you will receive a reset link.',
      color: 'success',
    })
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-2xl font-bold text-highlighted">
        Reset your password
      </h1>
      <p class="mt-2 text-sm text-muted">
        Enter your email address and we'll send you a link to reset your password.
      </p>
    </div>

    <!-- Email sent confirmation -->
    <div v-if="emailSent" class="mt-8">
      <UAlert
        color="success"
        icon="i-lucide-mail-check"
        title="Check your inbox"
        description="We sent a password reset link to your email. Click the link to reset your password."
      />

      <div class="mt-6 space-y-3">
        <UButton
          variant="ghost"
          block
          @click="emailSent = false"
        >
          Try another email
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

    <!-- Form -->
    <UForm
      v-else
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
        Send reset link
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
