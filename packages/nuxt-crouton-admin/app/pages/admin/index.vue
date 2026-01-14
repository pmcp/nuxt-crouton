<script setup lang="ts">
/**
 * Admin Index Redirect
 *
 * Redirects to the user's first team admin dashboard.
 * Waits for session to be ready, then fetches teams directly from Better Auth API.
 */
definePageMeta({
  middleware: 'auth'
})

const { teams, switchTeamBySlug } = useTeam()
const { isPending } = useSession()
const route = useRoute()
const nuxtApp = useNuxtApp()
const hasRedirected = ref(false)

async function fetchAndRedirect() {
  // Prevent multiple redirects and only redirect from exact /admin path
  if (hasRedirected.value || route.path !== '/admin') {
    return
  }
  hasRedirected.value = true

  // First check if teams are already loaded in nanostore
  let userTeams: Array<{ id: string; slug: string; name: string }> = teams.value

  // If not, fetch directly from Better Auth API
  if (userTeams.length === 0) {
    const authClient = nuxtApp.$authClient as any
    if (authClient?.organization?.list) {
      try {
        const result = await authClient.organization.list()
        if (result.data && result.data.length > 0) {
          userTeams = result.data
        }
      } catch (e) {
        console.error('[@crouton/admin] Failed to fetch teams:', e)
      }
    }
  }

  // Redirect based on teams
  if (userTeams.length > 0) {
    const firstTeam = userTeams[0]
    // Switch active team if needed
    try {
      await switchTeamBySlug(firstTeam.slug)
    } catch (e) {
      // Ignore switch errors, still redirect
    }
    await navigateTo(`/admin/${firstTeam.slug}`, { replace: true })
  } else {
    // No teams - redirect to create one
    await navigateTo('/onboarding/create-team', { replace: true })
  }
}

// Wait for session to be ready before checking teams
watch(isPending, async (pending) => {
  if (!pending) {
    await fetchAndRedirect()
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
  </div>
</template>
