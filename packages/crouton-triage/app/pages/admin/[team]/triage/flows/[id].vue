<script setup lang="ts">
/**
 * Edit Flow Page
 *
 * Loads existing flow data and presents the flow builder for editing.
 *
 * @route /admin/[team]/triage/flows/[id]
 */
import type { Flow, FlowInput, FlowOutput } from '~/layers/triage/types'
import FlowBuilder from '#layers/triage/app/components/flows/FlowBuilder.vue'

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

const pageTitle = computed(() => {
  if (loading.value) return 'Loading...'
  if (error.value) return 'Error'
  return `Edit ${flow.value?.name || 'Flow'}`
})

async function loadFlowData() {
  try {
    loading.value = true
    error.value = null

    const [flowResponse, inputsResponse, outputsResponse] = await Promise.all([
      $fetch<Flow>(`/api/teams/${currentTeam.value?.id}/triage-flows/${flowId.value}`),
      $fetch<FlowInput[]>(`/api/teams/${currentTeam.value?.id}/triage-flowinputs`),
      $fetch<FlowOutput[]>(`/api/teams/${currentTeam.value?.id}/triage-flowoutputs`)
    ])

    flow.value = flowResponse
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

watch(() => currentTeam.value?.id, (teamId) => {
  if (teamId) {
    loadFlowData()
  }
}, { immediate: true })

function handleFlowSaved() {
  router.push(`/admin/${currentTeam.value?.slug}/triage/flows`)
}
</script>

<template>
  <div class="h-full p-4">
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
  </div>
</template>
