<script setup lang="ts">
// Try to use auth if available (crouton-auth is an optional peer dep)
const auth = tryUseAuth()
const loggedIn = computed(() => auth?.loggedIn?.value ?? false)

function tryUseAuth() {
  try {
    // useAuth is auto-imported from nuxt-crouton-auth if installed
    return useAuth()
  } catch {
    return null
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="text-center space-y-6 p-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
          Welcome to Crouton
        </h1>
        <p class="text-lg text-gray-500 dark:text-gray-400">
          Your app is ready.
        </p>
      </div>

      <div class="flex gap-3 justify-center">
        <UButton
          v-if="loggedIn"
          to="/dashboard"
          size="lg"
        >
          Go to Dashboard
        </UButton>
        <template v-else>
          <UButton
            to="/auth/login"
            size="lg"
          >
            Login
          </UButton>
          <UButton
            to="/auth/register"
            size="lg"
            variant="outline"
          >
            Register
          </UButton>
        </template>
      </div>
    </div>
  </div>
</template>