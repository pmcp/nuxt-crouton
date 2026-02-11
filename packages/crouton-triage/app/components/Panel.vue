<script setup lang="ts">
import type { Flow, FlowInput, FlowOutput } from '#layers/triage/types'

interface Props {
  /** Title shown in the panel header */
  title?: string
  /** Empty state message */
  emptyMessage?: string
  /** Max feed items to show */
  limit?: number
  /** Page record when used as page type */
  page?: any
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Triage',
  emptyMessage: 'No activity yet. Connect a source to get started.',
  limit: 30,
  page: undefined,
})

const { currentTeam } = useTeam()
const toast = useToast()
const creatingFlow = ref(false)

// Create a new empty flow instantly
async function handleCreateFlow() {
  if (!currentTeam.value?.id || creatingFlow.value) return
  creatingFlow.value = true
  try {
    await $fetch(`/api/teams/${currentTeam.value.id}/triage-flows`, {
      method: 'POST',
      body: {
        name: 'Untitled Flow',
        active: false,
        onboardingComplete: false,
        aiEnabled: true,
      },
    })
    await refreshFlows()
  } catch (error: any) {
    toast.add({
      title: 'Failed to create flow',
      description: error.data?.message || error.message || 'Something went wrong.',
      color: 'error',
    })
  } finally {
    creatingFlow.value = false
  }
}

// Data fetching (all at once to preserve Nuxt async context)
const [
  { items: flows, pending: flowsPending, refresh: refreshFlows },
  { items: inputs, pending: inputsPending, refresh: refreshInputs },
  { items: outputs, pending: outputsPending, refresh: refreshOutputs },
] = await Promise.all([
  useCollectionQuery('triageFlows'),
  useCollectionQuery('triageInputs'),
  useCollectionQuery('triageOutputs'),
])

// Use first active flow (most common: one flow per team)
const flow = computed<Flow | null>(() => {
  const allFlows = flows.value || []
  return (allFlows.find((f: any) => f.active) as Flow | undefined) ?? (allFlows[0] as Flow | undefined) ?? null
})

// Inputs/outputs for the active flow
const flowInputs = computed<FlowInput[]>(() => {
  if (!flow.value) return []
  return ((inputs.value || []) as FlowInput[]).filter(i => i.flowId === flow.value!.id)
})

const flowOutputs = computed<FlowOutput[]>(() => {
  if (!flow.value) return []
  return ((outputs.value || []) as FlowOutput[]).filter(o => o.flowId === flow.value!.id)
})

// Feed data
const { feedItems, loading: feedLoading, refresh: refreshFeed } = await useTriageFeed({ limit: props.limit })

const loading = computed(() => flowsPending.value || inputsPending.value || outputsPending.value || feedLoading.value)

// Slideover states
const showAiConfig = ref(false)

// Track which specific input/output to edit (opens edit modal directly)
const editSourceInput = ref<FlowInput | null>(null)
const editOutputItem = ref<FlowOutput | null>(null)

// Track which type was selected from the "+" dropdown (opens add modal directly)
const addSourceType = ref<'slack' | 'figma' | 'email' | null>(null)
const addOutputType = ref<'notion' | 'github' | 'linear' | null>(null)

// Pipeline builder event handlers
function handleEditSource(input: FlowInput) {
  editSourceInput.value = input
}

function handleEditAi() {
  showAiConfig.value = true
}

function handleEditOutput(output: FlowOutput) {
  editOutputItem.value = output
}

function handleAddSource(type: 'slack' | 'figma' | 'email') {
  addSourceType.value = type
}

function handleAddOutput(type: 'notion' | 'github' | 'linear') {
  addOutputType.value = type
}

// Refresh all data
async function refreshAll() {
  await Promise.all([refreshFlows(), refreshInputs(), refreshOutputs(), refreshFeed()])
}

// Listen for mutations to auto-refresh
const nuxtApp = useNuxtApp()
nuxtApp.hook('crouton:mutation', async (event: { operation: string; collection: string }) => {
  const triageCollections = ['triageFlows', 'triageInputs', 'triageOutputs', 'triageDiscussions', 'triageJobs', 'triageTasks']
  if (triageCollections.includes(event.collection)) {
    await refreshAll()
  }
})

// Retry handler for feed items
async function handleRetry(discussionId: string) {
  try {
    await $fetch(`/api/crouton-triage/teams/${currentTeam.value?.id}/discussions/${discussionId}/retry`, {
      method: 'POST',
      body: {},
    })
    toast.add({
      title: 'Retry started',
      description: 'The discussion is being reprocessed.',
      color: 'success',
    })
    await refreshFeed()
  } catch (error: any) {
    toast.add({
      title: 'Retry failed',
      description: error.data?.message || error.message || 'Failed to retry.',
      color: 'error',
    })
  }
}

// Handle config changes
function onInputsChange() {
  refreshInputs()
}

function onOutputsChange() {
  refreshOutputs()
}

function onAiSaved() {
  refreshFlows()
}

defineExpose({ refresh: refreshAll })
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="creatingFlow"
          @click="handleCreateFlow"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="loading"
          @click="refreshAll"
        />
      </div>
    </div>

    <!-- Pipeline Builder (only when a flow exists) -->
    <CroutonTriagePipelineBuilder
      v-if="flow"
      :flow="flow"
      :inputs="flowInputs"
      :outputs="flowOutputs"
      @edit:source="handleEditSource"
      @edit:ai="handleEditAi"
      @edit:output="handleEditOutput"
      @add:source="handleAddSource"
      @add:output="handleAddOutput"
    />

    <!-- Empty state when no flow exists -->
    <div
      v-if="!flow && !flowsPending"
      class="text-center py-8"
    >
      <div class="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-lucide-funnel" class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-base font-semibold mb-2">No flow configured</h3>
      <p class="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Create a triage flow to start receiving and processing discussions from Slack, Figma, or email.
      </p>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        :loading="creatingFlow"
        @click="handleCreateFlow"
      >
        Create Flow
      </UButton>
    </div>

    <!-- Activity Feed -->
    <template v-if="flow">
      <USeparator label="Recent Activity" />

      <!-- Loading skeleton -->
      <div v-if="feedLoading && feedItems.length === 0" class="space-y-3">
        <div v-for="i in 3" :key="i" class="animate-pulse p-3 space-y-2">
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 bg-muted rounded" />
            <div class="h-4 bg-muted rounded w-1/3" />
            <div class="h-3 bg-muted rounded w-16 ml-auto" />
          </div>
          <div class="h-3 bg-muted rounded w-2/3 ml-8" />
          <div class="h-3 bg-muted rounded w-1/4 ml-8" />
        </div>
      </div>

      <!-- Feed items -->
      <div v-else-if="feedItems.length > 0" class="flex-1 min-h-0 overflow-y-auto -mx-1">
        <CroutonTriageFeedItem
          v-for="item in feedItems"
          :key="item.id"
          :item="item"
          @retry="handleRetry"
        />
      </div>

      <!-- Empty feed -->
      <div v-else class="text-center py-8">
        <div class="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
          <UIcon name="i-lucide-inbox" class="w-6 h-6 text-muted-foreground" />
        </div>
        <p class="text-sm text-muted-foreground">{{ emptyMessage }}</p>
      </div>
    </template>

    <!-- AI Config Slideover -->
    <CroutonTriageAiConfig
      v-if="flow"
      v-model="showAiConfig"
      :flow="flow"
      :team-id="currentTeam?.id || ''"
      @save="onAiSaved"
    />

    <!-- Direct modals for inputs (add + edit) -->
    <div v-if="flow && (addSourceType || editSourceInput)" class="hidden">
      <CroutonTriageFlowsInputManager
        :flow-id="flow.id"
        :team-id="currentTeam?.id || ''"
        :model-value="flowInputs"
        :auto-add-type="addSourceType"
        :auto-edit-input="editSourceInput"
        edit-mode
        @change="onInputsChange"
        @auto-add-closed="addSourceType = null"
        @auto-edit-closed="editSourceInput = null"
      />
    </div>

    <!-- Direct modals for outputs (add + edit) -->
    <div v-if="flow && (addOutputType || editOutputItem)" class="hidden">
      <CroutonTriageFlowsOutputManager
        :flow-id="flow.id"
        :team-id="currentTeam?.id || ''"
        :available-domains="flow.availableDomains || []"
        :model-value="flowOutputs"
        :auto-add-type="addOutputType"
        :auto-edit-output="editOutputItem"
        edit-mode
        @change="onOutputsChange"
        @auto-add-closed="addOutputType = null"
        @auto-edit-closed="editOutputItem = null"
      />
    </div>
  </div>
</template>
