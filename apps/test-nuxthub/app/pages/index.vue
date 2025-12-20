<script setup lang="ts">
const { user, loggedIn } = useSession()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center space-y-4">
      <h1 class="text-3xl font-bold">
        Crouton Test App
      </h1>
      <div v-if="loggedIn">
        <p class="text-muted">Welcome, {{ user?.name }}</p>
        <NuxtLink to="/home" class="text-primary hover:underline">
          Go to Dashboard
        </NuxtLink>
      </div>
      <div v-else class="space-x-4">
        <NuxtLink to="/auth/login">
          <UButton>Login</UButton>
        </NuxtLink>
        <NuxtLink to="/auth/register">
          <UButton variant="outline">Register</UButton>
        </NuxtLink>
      </div>
      <div class="mt-6 pt-6 border-t border-gray-200">
        <NuxtLink to="/ko-demo" class="text-sm text-muted hover:underline">
          View KO Theme Demo →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>