<script setup lang="ts">
/**
 * Edit Flow Page
 *
 * Pipeline builder with inline editing for flow name, description, and active toggle.
 * Uses the same PipelineBuilder + config slideoverpattern as Panel.vue.
 *
 * @route /admin/[team]/triage/flows/[id]
 */
import type { Flow, FlowInput, FlowOutput } from '~/layers/triage/types'

const route = useRoute()
const { currentTeam } = useTeam()
const toast = useToast()

const flowId = computed(() => route.params.id as string)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const flow = ref<Flow | null>(null)
const inputs = ref<FlowInput[]>([])
const outputs = ref<FlowOutput[]>([])

// Editable fields
const editName = ref('')
const editDescription = ref('')
const editActive = ref(false)

const hasChanges = computed(() => {
  if (!flow.value) return false
  return (
    editName.value !== (flow.value.name || '')
    || editDescription.value !== (flow.value.description || '')
    || editActive.value !== flow.value.active
  )
})

// Slideover states (same pattern as Panel.vue)
const showSourceConfig = ref(false)
const showOutputConfig = ref(false)
const showAiConfig = ref(false)

// Data loading
async function loadFlowData() {
  if (!currentTeam.value?.id) return

  try {
    loading.value = true
    error.value = null

    const [flowResponse, inputsResponse, outputsResponse] = await Promise.all([
      $fetch<Flow>(`/api/teams/${currentTeam.value.id}/triage-flows/${flowId.value}`),
      $fetch<FlowInput[]>(`/api/teams/${currentTeam.value.id}/triage-inputs`),
      $fetch<FlowOutput[]>(`/api/teams/${currentTeam.value.id}/triage-outputs`),
    ])

    flow.value = flowResponse
    inputs.value = inputsResponse.filter(input => input.flowId === flowId.value)
    outputs.value = outputsResponse.filter(output => output.flowId === flowId.value)

    // Sync editable fields
    editName.value = flowResponse.name || ''
    editDescription.value = flowResponse.description || ''
    editActive.value = flowResponse.active
  } catch (e: any) {
    console.error('Failed to load flow:', e)
    error.value = e.message || 'Failed to load flow'
    toast.add({
      title: 'Error',
      description: 'Failed to load flow',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

watch(() => currentTeam.value?.id, (teamId) => {
  if (teamId) loadFlowData()
}, { immediate: true })

// Save flow settings
async function handleSave() {
  if (!flow.value || !currentTeam.value?.id) return

  saving.value = true
  try {
    await $fetch(`/api/teams/${currentTeam.value.id}/triage-flows/${flow.value.id}`, {
      method: 'PATCH',
      body: {
        name: editName.value.trim(),
        description: editDescription.value.trim() || undefined,
        active: editActive.value,
      },
    })

    // Update local state
    flow.value = {
      ...flow.value,
      name: editName.value.trim(),
      description: editDescription.value.trim(),
      active: editActive.value,
    }

    toast.add({
      title: 'Flow updated',
      description: 'Flow settings saved successfully.',
      color: 'success',
    })
  } catch (e: any) {
    toast.add({
      title: 'Save failed',
      description: e.data?.message || e.message || 'Failed to save flow.',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

// Pipeline builder event handlers
function handleEditSource(_input: FlowInput) {
  showSourceConfig.value = true
}

function handleEditAi() {
  showAiConfig.value = true
}

function handleEditOutput(_output: FlowOutput) {
  showOutputConfig.value = true
}

function handleAddSource() {
  showSourceConfig.value = true
}

function handleAddOutput() {
  showOutputConfig.value = true
}

// Refresh handlers for config changes
function onInputsChange() {
  loadFlowData()
}

function onOutputsChange() {
  loadFlowData()
}

function onAiSaved() {
  loadFlowData()
}

const backUrl = computed(() => `/admin/${currentTeam.value?.slug}/triage/flows`)
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
      <UButton class="mt-4" variant="outline" color="neutral" :to="backUrl">
        Back to Flows
      </UButton>
    </div>

    <!-- Edit Page -->
    <div v-else-if="flow && currentTeam?.id" class="max-w-3xl mx-auto space-y-6">
      <!-- Header: Back + Name + Active toggle -->
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          :to="backUrl"
        />
        <UInput
          v-model="editName"
          variant="none"
          class="flex-1 text-xl font-semibold"
          placeholder="Flow name..."
          :ui="{ base: 'text-xl font-semibold' }"
        />
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-xs text-muted-foreground">{{ editActive ? 'Active' : 'Inactive' }}</span>
          <USwitch v-model="editActive" />
        </div>
      </div>

      <!-- Pipeline Builder -->
      <div class="border rounded-xl p-4 bg-muted/30">
        <CroutonTriagePipelineBuilder
          :flow="flow"
          :inputs="inputs"
          :outputs="outputs"
          @edit:source="handleEditSource"
          @edit:ai="handleEditAi"
          @edit:output="handleEditOutput"
          @add:source="handleAddSource"
          @add:output="handleAddOutput"
        />
      </div>

      <!-- Description -->
      <UFormField label="Description">
        <UTextarea
          v-model="editDescription"
          :rows="3"
          placeholder="Describe what this flow handles..."
        />
      </UFormField>

      <!-- Save -->
      <div class="flex items-center justify-between pt-2">
        <p v-if="hasChanges" class="text-xs text-muted-foreground">
          You have unsaved changes.
        </p>
        <span v-else />
        <UButton
          color="primary"
          :loading="saving"
          :disabled="!hasChanges || !editName.trim()"
          @click="handleSave"
        >
          Save Changes
        </UButton>
      </div>
    </div>

    <!-- Config Slideovers -->
    <CroutonTriageSourceConfig
      v-if="flow"
      v-model="showSourceConfig"
      :flow-id="flow.id"
      :team-id="currentTeam?.id || ''"
      :inputs="inputs"
      @change="onInputsChange"
    />

    <CroutonTriageOutputConfig
      v-if="flow"
      v-model="showOutputConfig"
      :flow-id="flow.id"
      :team-id="currentTeam?.id || ''"
      :available-domains="flow.availableDomains || []"
      :outputs="outputs"
      @change="onOutputsChange"
    />

    <CroutonTriageAiConfig
      v-if="flow"
      v-model="showAiConfig"
      :flow="flow"
      :team-id="currentTeam?.id || ''"
      @save="onAiSaved"
    />
  </div>
</template>
