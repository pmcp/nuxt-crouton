<template>
  <UContainer class="py-6">
    <h1 class="text-2xl font-bold mb-6">Tasks</h1>
    <div class="mb-4">
      <NuxtLink
        :to="`/admin/${currentTeam?.slug}/triage`"
        class="hover:underline inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Dashboard
      </NuxtLink>
    </div>

    <CroutonCollectionViewer
      collection-name="triageTasks"
      default-layout="table"
    />
  </UContainer>
</template>

<script setup lang="ts">
const { currentTeam } = useTeam()

definePageMeta({
  middleware: 'auth'
})
</script>
