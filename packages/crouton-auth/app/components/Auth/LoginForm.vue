<script setup lang="ts">
/**
 * LoginForm Component
 *
 * Reusable email/password login form with validation.
 * Handles credential submission and error display.
 *
 * @example
 * ```vue
 * <AuthLoginForm @success="onLogin" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

interface Props {
  /** Show loading state */
  loading?: boolean
  /** External error message to display */
  error?: string | null
  /** Show remember me checkbox */
  showRememberMe?: boolean
  /** Show forgot password link */
  showForgotPassword?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  showRememberMe: true,
  showForgotPassword: true,
})

const emit = defineEmits<{
  /** Emitted when form is submitted with valid credentials */
  submit: [credentials: { email: string, password: string, rememberMe: boolean }]
}>()

// Form state
const state = reactive({
  email: '',
  password: '',
  rememberMe: false,
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!formState.email) {
    errors.push({ name: 'email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Invalid email address' })
  }
  if (!formState.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  }
  return errors
}

// Handle form submission
function onSubmit(event: FormSubmitEvent<typeof state>) {
  emit('submit', {
    email: event.data.email,
    password: event.data.password,
    rememberMe: event.data.rememberMe,
  })
}
</script>

<template>
  <UForm
    :validate="validate"
    :state="state"
    class="space-y-6"
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

    <UFormField label="Password" name="password">
      <UInput
        v-model="state.password"
        type="password"
        placeholder="Enter your password"
        autocomplete="current-password"
        icon="i-lucide-lock"
      />
    </UFormField>

    <div v-if="showRememberMe || showForgotPassword" class="flex items-center justify-between">
      <UCheckbox
        v-if="showRememberMe"
        v-model="state.rememberMe"
        label="Remember me"
      />
      <div v-else />
      <NuxtLink
        v-if="showForgotPassword"
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
      Sign in
    </UButton>
  </UForm>
</template>
