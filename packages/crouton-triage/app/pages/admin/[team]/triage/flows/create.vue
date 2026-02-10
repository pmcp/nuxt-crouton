<script setup lang="ts">
/**
 * Create Flow Page
 *
 * Multi-step flow builder for creating a new triage flow.
 *
 * @route /admin/[team]/triage/flows/create
 */
import FlowBuilder from '#layers/triage/app/components/flows/FlowBuilder.vue'

const { currentTeam } = useTeam()
const router = useRouter()

function handleFlowSaved(flowId: string) {
  router.push(`/admin/${currentTeam.value?.slug}/triage/flows`)
}
</script>

<template>
  <div class="h-full p-4">
    <FlowBuilder
      v-if="currentTeam?.id"
      :team-id="currentTeam.id"
      @saved="handleFlowSaved"
    />
    <div v-else class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  </div>
</template>
