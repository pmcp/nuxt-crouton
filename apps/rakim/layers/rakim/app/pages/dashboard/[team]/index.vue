<template>
  <AppContainer title="Home">
    <FlowList
      v-if="currentTeam?.id"
      :team-id="currentTeam.id"
      :team-slug="currentTeam.slug"
    />
    <div v-else class="text-center text-muted-foreground">
      Loading...
    </div>
  </AppContainer>
</template>

<script setup lang="ts">
import FlowList from '#layers/discubot/app/components/flows/FlowList.vue'

const { currentTeam } = useTeam()

definePageMeta({
  middleware: 'auth'
})
</script>