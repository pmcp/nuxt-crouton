<script setup lang="ts">
/**
 * Forgot Password Page
 *
 * Allows users to request a password reset email.
 */

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const toast = useToast()

const { forgotPassword, loading, error } = useAuth()

// Track if email was sent
const emailSent = ref(false)

// Handle form submission
async function handleSubmit(email: string) {
  try {
    await forgotPassword(email)
    emailSent.value = true
    toast.add({
      title: 'Email sent',
      description: 'Check your inbox for a password reset link.',
      color: 'success',
    })
  } catch {
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

// Reset form state
function handleReset() {
  emailSent.value = false
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

    <!-- Forgot Password Form -->
    <div class="mt-8">
      <AuthForgotPasswordForm
        :loading="loading"
        :error="error"
        :sent="emailSent"
        @submit="handleSubmit"
        @reset="handleReset"
      />
    </div>
  </div>
</template>
