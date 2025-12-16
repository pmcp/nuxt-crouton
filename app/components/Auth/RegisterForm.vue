<script setup lang="ts">
/**
 * RegisterForm Component
 *
 * Reusable registration form with name, email, password fields.
 * Includes password confirmation and validation.
 *
 * @example
 * ```vue
 * <AuthRegisterForm @success="onRegister" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

interface Props {
  /** Show loading state */
  loading?: boolean
  /** External error message to display */
  error?: string | null
  /** Show terms/privacy links */
  showTerms?: boolean
  /** Minimum password length */
  minPasswordLength?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  showTerms: true,
  minPasswordLength: 8,
})

const emit = defineEmits<{
  /** Emitted when form is submitted with valid data */
  submit: [data: { name: string, email: string, password: string }]
}>()

// Form state
const state = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []

  if (!formState.name) {
    errors.push({ name: 'name', message: 'Name is required' })
  }

  if (!formState.email) {
    errors.push({ name: 'email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Invalid email address' })
  }

  if (!formState.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  } else if (formState.password.length < props.minPasswordLength) {
    errors.push({ name: 'password', message: `Password must be at least ${props.minPasswordLength} characters` })
  }

  if (formState.password !== formState.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Passwords do not match' })
  }

  return errors
}

// Handle form submission
function onSubmit(event: FormSubmitEvent<typeof state>) {
  emit('submit', {
    name: event.data.name,
    email: event.data.email,
    password: event.data.password,
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
    <UFormField label="Full name" name="name">
      <UInput
        v-model="state.name"
        type="text"
        placeholder="John Doe"
        autocomplete="name"
        icon="i-lucide-user"
      />
    </UFormField>

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
        :placeholder="`At least ${minPasswordLength} characters`"
        autocomplete="new-password"
        icon="i-lucide-lock"
      />
    </UFormField>

    <UFormField label="Confirm password" name="confirmPassword">
      <UInput
        v-model="state.confirmPassword"
        type="password"
        placeholder="Confirm your password"
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
      Create account
    </UButton>

    <p v-if="showTerms" class="text-center text-xs text-muted">
      By creating an account, you agree to our
      <NuxtLink to="/terms" class="text-primary hover:text-primary/80">
        Terms of Service
      </NuxtLink>
      and
      <NuxtLink to="/privacy" class="text-primary hover:text-primary/80">
        Privacy Policy
      </NuxtLink>
    </p>
  </UForm>
</template>
