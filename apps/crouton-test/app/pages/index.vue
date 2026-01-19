<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-16">
      <div class="max-w-2xl mx-auto text-center">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Crouton Test App
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Testing the unified @fyit/crouton module
        </p>

        <div class="grid gap-4 sm:grid-cols-2">
          <UCard>
            <template #header>
              <h3 class="font-semibold">Auth</h3>
            </template>
            <p class="text-sm text-gray-500">Authentication with Better Auth</p>
            <template #footer>
              <UButton to="/auth/login" variant="soft" block>
                Go to Login
              </UButton>
            </template>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-semibold">Admin</h3>
            </template>
            <p class="text-sm text-gray-500">Admin dashboard</p>
            <template #footer>
              <UButton to="/dashboard" variant="soft" block>
                Go to Dashboard
              </UButton>
            </template>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-semibold">Bookings</h3>
            </template>
            <p class="text-sm text-gray-500">Booking system mini-app</p>
            <template #footer>
              <UButton to="/dashboard/bookings" variant="soft" block>
                Go to Bookings
              </UButton>
            </template>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-semibold">API Health</h3>
            </template>
            <p class="text-sm text-gray-500">Check API status</p>
            <template #footer>
              <UButton to="/api/health" external variant="soft" block>
                Check Health
              </UButton>
            </template>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
