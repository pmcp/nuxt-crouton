<script setup lang="ts">
/**
 * Register Page
 *
 * Displays registration form with:
 * - Name, email, password fields
 * - OAuth registration options
 * - Link to login
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const router = useRouter()
const toast = useToast()

const {
  register,
  loginWithOAuth,
  hasPassword,
  hasOAuth,
  oauthProviders,
  loading,
  error,
} = useAuth()

// Form state
const state = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// Custom validation
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
  try {
    await register({
      name: event.data.name,
      email: event.data.email,
      password: event.data.password,
    })
    toast.add({
      title: 'Account created',
      description: 'Welcome! Your account has been created.',
      color: 'success',
    })
    await router.push('/dashboard')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Registration failed'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// Handle OAuth registration
async function handleOAuth(provider: string) {
  try {
    await loginWithOAuth(provider)
    // OAuth redirects, no need to navigate
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'OAuth registration failed'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// OAuth provider icons
const providerIcons: Record<string, string> = {
  github: 'i-simple-icons-github',
  google: 'i-simple-icons-google',
  discord: 'i-simple-icons-discord',
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-2xl font-bold text-highlighted">
        Create your account
      </h1>
      <p class="mt-2 text-sm text-muted">
        Already have an account?
        <NuxtLink to="/auth/login" class="font-medium text-primary hover:text-primary/80">
          Sign in
        </NuxtLink>
      </p>
    </div>

    <!-- OAuth Buttons -->
    <div v-if="hasOAuth && oauthProviders.length > 0" class="mt-8 space-y-3">
      <UButton
        v-for="provider in oauthProviders"
        :key="provider"
        color="neutral"
        variant="outline"
        block
        :icon="providerIcons[provider] || 'i-lucide-user'"
        :loading="loading"
        @click="handleOAuth(provider)"
      >
        Continue with {{ provider.charAt(0).toUpperCase() + provider.slice(1) }}
      </UButton>
    </div>

    <!-- Separator -->
    <div v-if="hasOAuth && oauthProviders.length > 0 && hasPassword" class="mt-6">
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <USeparator />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-default px-2 text-muted">Or continue with</span>
        </div>
      </div>
    </div>

    <!-- Registration Form -->
    <UForm
      v-if="hasPassword"
      :validate="validate"
      :state="state"
      class="mt-8 space-y-6"
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
          placeholder="At least 8 characters"
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

      <p class="text-center text-xs text-muted">
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
  </div>
</template>
