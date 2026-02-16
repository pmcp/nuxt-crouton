<script setup lang="ts">
/**
 * Reset Password Page
 *
 * Beautiful, modern reset password page using UAuthForm.
 * Handles password reset with token from email.
 * URL: /auth/reset-password?token=xxx
 */
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useT()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const { resetPassword } = useAuth()

// Error state
const formError = ref<string | null>(null)

// Local submitting state
const submitting = ref(false)

// Get token from query params
const token = computed(() => route.query.token as string | undefined)

// Track if reset was successful
const resetSuccess = ref(false)

// Minimum password length
const minPasswordLength = 8

// Form fields
const fields = computed<AuthFormField[]>(() => [{
  name: 'password',
  type: 'password',
  label: t('auth.newPassword'),
  placeholder: `At least ${minPasswordLength} characters`,
  required: true
}, {
  name: 'confirmPassword',
  type: 'password',
  label: t('auth.confirmNewPassword'),
  placeholder: 'Confirm your new password',
  required: true
}])

// Submit button config
const submitButton = computed(() => ({
  label: t('auth.resetPassword'),
  loading: submitting.value,
  block: true
}))

// Custom validation
function validate(state: Record<string, unknown>) {
  const errors: { name: string, message: string }[] = []

  if (!state.password) {
    errors.push({ name: 'password', message: t('errors.requiredField') })
  } else if ((state.password as string).length < minPasswordLength) {
    errors.push({ name: 'password', message: t('errors.minLength', { min: minPasswordLength }) })
  }

  if (state.password !== state.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: t('errors.passwordMismatch') })
  }

  return errors
}

// Handle form submission
async function onSubmit(event: FormSubmitEvent<{ password: string, confirmPassword: string }>) {
  formError.value = null
  submitting.value = true

  if (!token.value) {
    submitting.value = false
    toast.add({
      title: 'Invalid link',
      description: 'The reset link is invalid or has expired.',
      color: 'error'
    })
    return
  }

  try {
    await resetPassword(token.value, event.data.password)
    resetSuccess.value = true
    toast.add({
      title: 'Password reset',
      description: 'Your password has been reset successfully.',
      color: 'success'
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Password reset failed'
    formError.value = message
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

// Redirect to login
function goToLogin() {
  router.push('/auth/login')
}
</script>

<template>
  <UPageCard>
    <!-- Invalid/missing token -->
    <div
      v-if="!token"
      class="space-y-6"
    >
      <div class="text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <UIcon
            name="i-lucide-alert-triangle"
            class="h-6 w-6 text-error"
          />
        </div>
        <h2 class="mt-4 text-xl font-semibold text-highlighted">
          {{ t('auth.invalidResetLink') }}
        </h2>
        <p class="mt-2 text-muted">
          {{ t('auth.invalidResetLinkDescription') }}
        </p>
      </div>

      <NuxtLink to="/auth/forgot-password">
        <UButton block>
          {{ t('auth.requestNewLink') }}
        </UButton>
      </NuxtLink>
    </div>

    <!-- Reset successful -->
    <div
      v-else-if="resetSuccess"
      class="space-y-6"
    >
      <div class="text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <UIcon
            name="i-lucide-check-circle"
            class="h-6 w-6 text-success"
          />
        </div>
        <h2 class="mt-4 text-xl font-semibold text-highlighted">
          {{ t('auth.passwordUpdated') }}
        </h2>
        <p class="mt-2 text-muted">
          {{ t('auth.passwordUpdatedDescription') }}
        </p>
      </div>

      <UButton
        block
        @click="goToLogin"
      >
        {{ t('auth.signIn') }}
      </UButton>
    </div>

    <!-- Reset Form -->
    <UAuthForm
      v-else
      :fields="fields"
      :submit="submitButton"
      :validate="validate"
      :disabled="submitting"
      :title="t('auth.setNewPassword')"
      icon="i-lucide-lock"
      @submit="onSubmit"
    >
      <template #description>
        {{ t('auth.setNewPasswordDescription') }}
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
        <NuxtLink
          to="/auth/login"
          class="text-primary font-medium"
        >
          {{ t('auth.backToSignIn') }}
        </NuxtLink>
      </template>
    </UAuthForm>
  </UPageCard>
</template>
