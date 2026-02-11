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

// All flows (newest first — query already orders by desc createdAt)
const allFlows = computed<Flow[]>(() => (flows.value || []) as Flow[])
const hasFlows = computed(() => allFlows.value.length > 0)

// Helpers to get inputs/outputs per flow
function getFlowInputs(flowId: string): FlowInput[] {
  return ((inputs.value || []) as FlowInput[]).filter(i => i.flowId === flowId)
}

function getFlowOutputs(flowId: string): FlowOutput[] {
  return ((outputs.value || []) as FlowOutput[]).filter(o => o.flowId === flowId)
}

// Feed data
const { feedItems, loading: feedLoading, refresh: refreshFeed } = await useTriageFeed({ limit: props.limit })

const loading = computed(() => flowsPending.value || inputsPending.value || outputsPending.value || feedLoading.value)

// Active flow for config slideovers/modals (set when user interacts with a specific flow)
const activeFlow = ref<Flow | null>(null)
const showAiConfig = ref(false)

// Track which specific input/output to edit (opens edit modal directly)
const editSourceInput = ref<FlowInput | null>(null)
const editOutputItem = ref<FlowOutput | null>(null)

// Track which type was selected from the "+" dropdown (opens add modal directly)
const addSourceType = ref<'slack' | 'figma' | 'email' | null>(null)
const addOutputType = ref<'notion' | 'github' | 'linear' | null>(null)

// Pipeline builder event handlers (scoped to a flow)
function handleEditSource(flow: Flow, input: FlowInput) {
  activeFlow.value = flow
  editSourceInput.value = input
}

function handleEditAi(flow: Flow) {
  activeFlow.value = flow
  showAiConfig.value = true
}

function handleEditOutput(flow: Flow, output: FlowOutput) {
  activeFlow.value = flow
  editOutputItem.value = output
}

function handleAddSource(flow: Flow, type: 'slack' | 'figma' | 'email') {
  activeFlow.value = flow
  addSourceType.value = type
}

function handleAddOutput(flow: Flow, type: 'notion' | 'github' | 'linear') {
  activeFlow.value = flow
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

// Delete flow with confirmation
const flowToDelete = ref<Flow | null>(null)
const showDeleteConfirm = ref(false)
const deleting = ref(false)

function confirmDeleteFlow(flow: Flow) {
  flowToDelete.value = flow
  showDeleteConfirm.value = true
}

async function handleDeleteFlow() {
  if (!flowToDelete.value || !currentTeam.value?.id) return
  deleting.value = true
  try {
    await $fetch(`/api/teams/${currentTeam.value.id}/triage-flows/${flowToDelete.value.id}`, {
      method: 'DELETE',
    })
    showDeleteConfirm.value = false
    flowToDelete.value = null
    await refreshAll()
  } catch (error: any) {
    toast.add({
      title: 'Failed to delete flow',
      description: error.data?.message || error.message || 'Something went wrong.',
      color: 'error',
    })
  } finally {
    deleting.value = false
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
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="loading"
        @click="refreshAll"
      />
    </div>

    <!-- Flow list -->
    <div v-if="hasFlows || creatingFlow" class="flex flex-col gap-2">
      <!-- Add flow button -->
      <button
        class="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
        :disabled="creatingFlow"
        @click="handleCreateFlow"
      >
        <UIcon v-if="creatingFlow" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        <UIcon v-else name="i-lucide-plus" class="w-4 h-4" />
        New Flow
      </button>

      <!-- Pipeline builder per flow -->
      <div
        v-for="flow in allFlows"
        :key="flow.id"
        class="group border rounded-xl p-3 bg-muted/20 transition-all relative"
        :class="flow.active ? 'border-primary/30' : 'border-default'"
      >
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          @click="confirmDeleteFlow(flow)"
        />
        <CroutonTriagePipelineBuilder
          :flow="flow"
          :inputs="getFlowInputs(flow.id)"
          :outputs="getFlowOutputs(flow.id)"
          @edit:source="(input: FlowInput) => handleEditSource(flow, input)"
          @edit:ai="() => handleEditAi(flow)"
          @edit:output="(output: FlowOutput) => handleEditOutput(flow, output)"
          @add:source="(type: 'slack' | 'figma' | 'email') => handleAddSource(flow, type)"
          @add:output="(type: 'notion' | 'github' | 'linear') => handleAddOutput(flow, type)"
        />
      </div>
    </div>

    <!-- Empty state when no flows exist -->
    <div
      v-if="!hasFlows && !flowsPending && !creatingFlow"
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
    <template v-if="hasFlows">
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

    <!-- AI Config Slideover (scoped to active flow) -->
    <CroutonTriageAiConfig
      v-if="activeFlow"
      v-model="showAiConfig"
      :flow="activeFlow"
      :team-id="currentTeam?.id || ''"
      @save="onAiSaved"
    />

    <!-- Direct modals for inputs (add + edit, scoped to active flow) -->
    <div v-if="activeFlow && (addSourceType || editSourceInput)" class="hidden">
      <CroutonTriageFlowsInputManager
        :flow-id="activeFlow.id"
        :team-id="currentTeam?.id || ''"
        :model-value="getFlowInputs(activeFlow.id)"
        :auto-add-type="addSourceType"
        :auto-edit-input="editSourceInput"
        edit-mode
        @change="onInputsChange"
        @auto-add-closed="addSourceType = null"
        @auto-edit-closed="editSourceInput = null"
      />
    </div>

    <!-- Direct modals for outputs (add + edit, scoped to active flow) -->
    <div v-if="activeFlow && (addOutputType || editOutputItem)" class="hidden">
      <CroutonTriageFlowsOutputManager
        :flow-id="activeFlow.id"
        :team-id="currentTeam?.id || ''"
        :available-domains="activeFlow.availableDomains || []"
        :model-value="getFlowOutputs(activeFlow.id)"
        :auto-add-type="addOutputType"
        :auto-edit-output="editOutputItem"
        edit-mode
        @change="onOutputsChange"
        @auto-add-closed="addOutputType = null"
        @auto-edit-closed="editOutputItem = null"
      />
    </div>

    <!-- Delete flow confirmation -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">Delete Flow</h3>
          <p class="text-sm text-muted-foreground mb-6">
            This will delete the flow and all its connected sources and outputs. This action cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="deleting"
              @click="showDeleteConfirm = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="deleting"
              @click="handleDeleteFlow"
            >
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
