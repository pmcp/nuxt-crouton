<script setup lang="ts">
/**
 * Admin Index Redirect
 *
 * Redirects to the user's first team admin dashboard.
 * Similar to /dashboard redirect behavior.
 */
definePageMeta({
  middleware: 'auth'
})

const { teams } = useTeam()

onMounted(async () => {
  await nextTick()

  const firstTeam = teams.value[0]
  if (firstTeam) {
    await navigateTo(`/admin/${firstTeam.slug}`, { replace: true })
  } else {
    // No teams - redirect to create one
    await navigateTo('/onboarding/create-team', { replace: true })
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
  </div>
</template>
