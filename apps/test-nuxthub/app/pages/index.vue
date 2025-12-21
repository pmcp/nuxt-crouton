<script setup lang="ts">
const { user, isAuthenticated } = useAuth()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UPageCard class="max-w-md w-full">
      <template #title>
        Welcome to Test NuxtHub
      </template>
      <template #description>
        Testing crouton auth integration
      </template>

      <div class="space-y-4">
        <div v-if="isAuthenticated" class="space-y-2">
          <p class="text-sm text-muted">Logged in as: {{ user?.email }}</p>
          <div class="flex gap-2">
            <UButton to="/dashboard" color="primary">
              Go to Dashboard
            </UButton>
            <UButton @click="useLogout()" variant="outline">
              Logout
            </UButton>
          </div>
        </div>
        <div v-else class="flex gap-2">
          <UButton to="/auth/login" color="primary">
            Login
          </UButton>
          <UButton to="/auth/register" variant="outline">
            Register
          </UButton>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
