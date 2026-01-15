<template>
  <AppContainer :title="pageTitle">
    <div class="mb-6">
      <NuxtLink
        :to="`/dashboard/${currentTeam?.slug}/discubot/flows`"
        class="hover:underline inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Flows
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 text-destructive mx-auto mb-3" />
      <p class="text-muted-foreground">Failed to load flow</p>
      <p class="text-sm text-muted-foreground mt-1">{{ error }}</p>
    </div>

    <!-- Flow Builder -->
    <FlowBuilder
      v-else-if="flow && currentTeam?.id"
      :team-id="currentTeam.id"
      :flow="flow"
      :inputs="inputs"
      :outputs="outputs"
      @saved="handleFlowSaved"
    />
  </AppContainer>
</template>

<script setup lang="ts">
import type { Flow, FlowInput, FlowOutput } from '~/layers/discubot/types'
import FlowBuilder from '#layers/discubot/app/components/flows/FlowBuilder.vue'

const route = useRoute()
const router = useRouter()
const { currentTeam } = useTeam()
const toast = useToast()

const flowId = computed(() => route.params.id as string)
const loading = ref(true)
const error = ref<string | null>(null)
const flow = ref<Partial<Flow> | null>(null)
const inputs = ref<FlowInput[]>([])
const outputs = ref<FlowOutput[]>([])

definePageMeta({
  middleware: 'auth'
})

// Compute page title
const pageTitle = computed(() => {
  if (loading.value) return 'Loading...'
  if (error.value) return 'Error'
  return `Edit ${flow.value?.name || 'Flow'}`
})

// Load flow, inputs, and outputs
async function loadFlowData() {
  try {
    loading.value = true
    error.value = null

    // Fetch flow, inputs, and outputs in parallel
    const [flowResponse, inputsResponse, outputsResponse] = await Promise.all([
      $fetch<Flow>(`/api/teams/${currentTeam.value?.id}/discubot-flows/${flowId.value}`),
      $fetch<FlowInput[]>(`/api/teams/${currentTeam.value?.id}/discubot-flowinputs`),
      $fetch<FlowOutput[]>(`/api/teams/${currentTeam.value?.id}/discubot-flowoutputs`)
    ])

    flow.value = flowResponse
    // Filter inputs and outputs for this specific flow
    inputs.value = inputsResponse.filter(input => input.flowId === flowId.value)
    outputs.value = outputsResponse.filter(output => output.flowId === flowId.value)
  } catch (e: any) {
    console.error('Failed to load flow:', e)
    error.value = e.message || 'Failed to load flow'
    toast.add({
      title: 'Error',
      description: 'Failed to load flow',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Wait for currentTeam to be loaded before fetching flow data
watch(() => currentTeam.value?.id, (teamId) => {
  if (teamId) {
    loadFlowData()
  }
}, { immediate: true })

function handleFlowSaved() {
  // Navigate back to flows list after successful save
  router.push(`/dashboard/${currentTeam.value?.slug}/discubot/flows`)
}
</script>
