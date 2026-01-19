<script setup lang="ts">
/**
 * Dashboard Index Redirect
 *
 * Redirects to the user's first team dashboard.
 * The team-context.global middleware handles the actual redirect logic.
 * This page exists to prevent 404 while the redirect happens.
 */
definePageMeta({
  middleware: 'auth'
})

// The team-context.global middleware handles the redirect
// This is a fallback in case the middleware hasn't redirected yet
const { teams } = useTeam()

onMounted(async () => {
  // Wait a tick for middleware to process
  await nextTick()

  const firstTeam = teams.value[0]
  if (firstTeam) {
    await navigateTo(`/dashboard/${firstTeam.slug}`, { replace: true })
  } else {
    await navigateTo('/onboarding/create-team', { replace: true })
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
  </div>
</template>
