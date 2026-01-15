<template>
  <AppContainer title="Create Flow">
    <div class="mb-6">
      <NuxtLink
        :to="`/dashboard/${currentTeam?.slug}/discubot/flows`"
        class="hover:underline inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Flows
      </NuxtLink>
    </div>

    <FlowBuilder
      v-if="currentTeam?.id"
      :team-id="currentTeam.id"
      @saved="handleFlowSaved"
    />
    <div v-else class="text-center text-muted-foreground">
      Loading...
    </div>
  </AppContainer>
</template>

<script setup lang="ts">
console.log('[CREATE PAGE] Component loading...')

import FlowBuilder from '#layers/discubot/app/components/flows/FlowBuilder.vue'

console.log('[CREATE PAGE] FlowBuilder imported')

const { currentTeam } = useTeam()
const router = useRouter()

console.log('[CREATE PAGE] Current team:', currentTeam.value)

definePageMeta({
  middleware: 'auth'
})

function handleFlowSaved(flowId: string) {
  console.log('[CREATE PAGE] Flow saved:', flowId)
  // Navigate back to flows list after successful save
  router.push(`/dashboard/${currentTeam.value?.slug}/discubot/flows`)
}

console.log('[CREATE PAGE] Setup complete')
</script>
