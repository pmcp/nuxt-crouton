<script setup lang="ts">
/**
 * Flows List Page
 *
 * Shows all triage flows with their pipeline visualizations.
 *
 * @route /admin/[team]/triage/flows
 */
const route = useRoute()
const { currentTeam } = useTeam()

const teamSlug = computed(() => route.params.team as string)
</script>

<template>
  <div class="h-full p-4">
    <CroutonTriageFlowList
      v-if="currentTeam?.id"
      :team-id="currentTeam.id"
      :team-slug="teamSlug"
    />
  </div>
</template>
