<template>
  <AppContainer title="Discussions">
    <div class="mb-4">
      <NuxtLink
        :to="`/dashboard/${currentTeam?.slug}`"
        class="hover:underline inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Dashboard
      </NuxtLink>
    </div>

    <CroutonCollectionViewer
      collection-name="discubotDiscussions"
      default-layout="table"
    />
  </AppContainer>
</template>

<script setup lang="ts">
const { currentTeam } = useTeam()

definePageMeta({
  middleware: 'auth'
})
</script>
