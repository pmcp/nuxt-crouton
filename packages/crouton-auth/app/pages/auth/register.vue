<script setup lang="ts">
/**
 * Register Page
 *
 * Beautiful, modern registration page using UAuthForm.
 * Supports email/password and OAuth registration.
 */
import type { FormSubmitEvent, AuthFormField, ButtonProps } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useT()
const toast = useToast()

const {
  register,
  loginWithOAuth,
  hasPassword,
  hasOAuth,
  oauthProviders
} = useAuth()

const route = useRoute()
const redirects = useAuthRedirects()

// Get redirect URL from query or use configured afterRegister redirect
const redirectTo = computed(() => {
  const redirect = route.query.redirect as string | undefined
  return redirect || redirects.afterRegister
})

// Error state
const formError = ref<string | null>(null)

// Local submitting state
const submitting = ref(false)

// Minimum password length
const minPasswordLength = 8

// Build form fields
const registerFields = computed<AuthFormField[]>(() => [{
  name: 'name',
  type: 'text',
  label: t('forms.fullName'),
  placeholder: 'John Doe',
  required: true
}, {
  name: 'email',
  type: 'email',
  label: t('auth.email'),
  placeholder: 'you@example.com',
  required: true
}, {
  name: 'password',
  type: 'password',
  label: t('auth.password'),
  placeholder: `At least ${minPasswordLength} characters`,
  required: true
}, {
  name: 'confirmPassword',
  type: 'password',
  label: t('auth.confirmPassword'),
  placeholder: 'Confirm your password',
  required: true
}])

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
  if (!hasOAuth.value || oauthProviders.value.length === 0) {
    return []
  }

  return oauthProviders.value.map((provider) => {
    const config = providerConfig[provider] || { icon: 'i-lucide-user', name: provider }
    return {
      label: `Continue with ${config.name}`,
      icon: config.icon,
      onClick: () => handleOAuth(provider)
    }
  })
})

// Submit button config
const submitButton = computed(() => ({
  label: t('auth.createAccount'),
  loading: submitting.value,
  block: true
}))

// Form validation
function validate(state: Record<string, unknown>) {
  const errors: { name: string, message: string }[] = []

  if (!state.name) {
    errors.push({ name: 'name', message: t('errors.requiredField') })
  }

  if (!state.email) {
    errors.push({ name: 'email', message: t('errors.requiredField') })
  } else if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(state.email as string)) {
    errors.push({ name: 'email', message: t('errors.invalidEmail') })
  }

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
async function onSubmit(event: FormSubmitEvent<{ name: string, email: string, password: string, confirmPassword: string }>) {
  formError.value = null
  submitting.value = true

  try {
    await register({
      name: event.data.name,
      email: event.data.email,
      password: event.data.password
    })
    toast.add({
      title: 'Account created',
      description: 'Welcome! Your account has been created.',
      color: 'success'
    })
    // Keep submitting=true during navigation (page will unmount)
    await navigateTo(redirectTo.value, { external: true })
  } catch (e: unknown) {
    submitting.value = false
    const message = e instanceof Error ? e.message : 'Registration failed'
    formError.value = message
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  }
}

// Handle OAuth registration
async function handleOAuth(provider: string) {
  formError.value = null
  try {
    await loginWithOAuth(provider)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'OAuth registration failed'
    formError.value = message
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  }
}
</script>

<template>
  <UPageCard>
    <UAuthForm
      v-if="hasPassword"
      :fields="registerFields"
      :providers="providers"
      :submit="submitButton"
      :validate="validate"
      :disabled="submitting"
      :title="t('auth.createYourAccount')"
      icon="i-lucide-user-plus"
      :separator="providers.length > 0 ? 'or' : undefined"
      @submit="onSubmit"
    >
      <template #description>
        {{ t('auth.alreadyHaveAccount') }}
        <ULink
          to="/auth/login"
          class="text-primary font-medium"
        >
          {{ t('auth.signIn') }}
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
        {{ t('auth.termsAgreement') }}
        <ULink
          to="/terms"
          class="text-primary font-medium"
        >
          {{ t('auth.termsOfService') }}
        </ULink>
        {{ t('auth.and') }}
        <ULink
          to="/privacy"
          class="text-primary font-medium"
        >
          {{ t('auth.privacyPolicy') }}
        </ULink>
      </template>
    </UAuthForm>

    <!-- OAuth only (no password auth) -->
    <div
      v-else-if="providers.length > 0"
      class="space-y-6"
    >
      <div class="text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <UIcon
            name="i-lucide-user-plus"
            class="h-6 w-6 text-primary"
          />
        </div>
        <h2 class="mt-4 text-xl font-semibold text-highlighted">
          {{ t('auth.createYourAccount') }}
        </h2>
        <p class="mt-2 text-muted">
          {{ t('auth.alreadyHaveAccount') }}
          <ULink
            to="/auth/login"
            class="text-primary font-medium"
          >
            {{ t('auth.signIn') }}
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

      <p class="text-sm text-center text-muted">
        {{ t('auth.termsAgreement') }}
        <ULink
          to="/terms"
          class="text-primary font-medium"
        >
          {{ t('auth.termsOfService') }}
        </ULink>
        {{ t('auth.and') }}
        <ULink
          to="/privacy"
          class="text-primary font-medium"
        >
          {{ t('auth.privacyPolicy') }}
        </ULink>
      </p>
    </div>
  </UPageCard>
</template>
