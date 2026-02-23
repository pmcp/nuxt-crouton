<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

// Redirect to team-scoped atelier
const { teamSlug } = useTeamContext()

if (teamSlug.value) {
  navigateTo(`/admin/${teamSlug.value}/atelier`)
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <UIcon name="i-lucide-blocks" class="w-12 h-12 text-primary mx-auto mb-4" />
      <h1 class="text-xl font-bold mb-2">Atelier</h1>
      <p class="text-muted text-sm">Redirecting to your workspace...</p>
    </div>
  </div>
</template>
