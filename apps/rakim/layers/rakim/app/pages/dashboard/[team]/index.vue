<template>
  <UContainer class="py-6">
    <h1 class="text-2xl font-bold mb-6">Home</h1>
    <FlowList
      v-if="currentTeam?.id"
      :team-id="currentTeam.id"
      :team-slug="currentTeam.slug"
    />
    <div v-else class="text-center text-muted-foreground">
      Loading...
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import FlowList from '#layers/rakim/app/components/flows/FlowList.vue'

const { currentTeam } = useTeam()

definePageMeta({
  middleware: 'auth'
})
</script>