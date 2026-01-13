<script setup lang="ts">
/**
 * Admin Index Redirect
 *
 * Redirects to the user's first team admin dashboard.
 * Similar to /dashboard redirect behavior.
 * Uses a watcher to wait for teams data to load from Better Auth.
 */
definePageMeta({
  middleware: 'auth'
})

const { teams } = useTeam()
const hasRedirected = ref(false)

// Watch for teams to be populated (Better Auth loads async)
watch(teams, async (newTeams) => {
  if (hasRedirected.value) return

  if (newTeams.length > 0) {
    hasRedirected.value = true
    await navigateTo(`/admin/${newTeams[0].slug}`, { replace: true })
  }
}, { immediate: true })

// Fallback: if no teams after a delay, redirect to create team
onMounted(() => {
  setTimeout(async () => {
    if (hasRedirected.value) return
    if (teams.value.length === 0) {
      hasRedirected.value = true
      await navigateTo('/onboarding/create-team', { replace: true })
    }
  }, 2000) // Wait 2s for teams to load before assuming none exist
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
  </div>
</template>
