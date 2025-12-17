<script setup lang="ts">
/**
 * Register Page
 *
 * Displays registration form with:
 * - Name, email, password fields
 * - OAuth registration options
 * - Link to login
 */

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

// Handle registration form submission
async function handleRegister(data: { name: string, email: string, password: string }) {
  try {
    await register({
      name: data.name,
      email: data.email,
      password: data.password,
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
    <div v-if="hasOAuth && oauthProviders.length > 0" class="mt-8">
      <AuthOAuthButtons :loading="loading" @click="handleOAuth" />
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
    <div v-if="hasPassword" class="mt-8">
      <AuthRegisterForm
        :loading="loading"
        :error="error"
        @submit="handleRegister"
      />
    </div>
  </div>
</template>
