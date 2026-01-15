<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { Flow, FlowInput, FlowOutput } from '#layers/discubot/types'
import FlowPipelineVisual from '#layers/discubot/app/components/flows/FlowPipelineVisual.vue'

// Resolve UI components for use in render functions
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

interface Props {
  teamId: string
  teamSlug: string
}

const props = defineProps<Props>()

// Toast for user feedback
const toast = useToast()

// Router for navigation
const router = useRouter()

// State
const isLoading = ref(true)
const flows = ref<Flow[]>([])
const inputs = ref<FlowInput[]>([])
const outputs = ref<FlowOutput[]>([])
const showDeleteModal = ref(false)
const flowToDelete = ref<Flow | null>(null)
const isDeleting = ref(false)

// Fetch flows, inputs, and outputs
const fetchData = async () => {
  isLoading.value = true
  try {
    // Fetch all data in parallel
    const [flowsResponse, inputsResponse, outputsResponse] = await Promise.all([
      $fetch<Flow[]>(`/api/teams/${props.teamId}/discubot-flows`),
      $fetch<FlowInput[]>(`/api/teams/${props.teamId}/discubot-flowinputs`),
      $fetch<FlowOutput[]>(`/api/teams/${props.teamId}/discubot-flowoutputs`)
    ])

    flows.value = flowsResponse
    inputs.value = inputsResponse
    outputs.value = outputsResponse
  } catch (error) {
    console.error('Error fetching flows:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load flows',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Fetch data on mount
onMounted(() => {
  fetchData()
})

// Helper to count inputs for a flow
const getInputCount = (flowId: string): number => {
  return inputs.value.filter((input: FlowInput) => input.flowId === flowId && input.active).length
}

// Helper to count outputs for a flow
const getOutputCount = (flowId: string): number => {
  return outputs.value.filter((output: FlowOutput) => output.flowId === flowId && output.active).length
}

// Helper to get inputs for a flow
const getInputsForFlow = (flowId: string): FlowInput[] => {
  return inputs.value.filter((input: FlowInput) => input.flowId === flowId)
}

// Helper to get outputs for a flow
const getOutputsForFlow = (flowId: string): FlowOutput[] => {
  return outputs.value.filter((output: FlowOutput) => output.flowId === flowId)
}

// Table columns (Nuxt UI v4 format with cell renderers)
const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }: any) => h('div', { class: 'font-medium' }, row.original.name)
  },
  {
    id: 'pipeline',
    header: 'Pipeline',
    cell: ({ row }: any) => h(FlowPipelineVisual, {
      flow: row.original.flow,
      inputs: row.original.flowInputs,
      outputs: row.original.flowOutputs
    })
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }: any) => h('div', { class: 'flex items-center gap-2' }, [
      h(UBadge, {
         color: row.original.active ? 'primary' : 'neutral',
        variant: 'subtle'
      }, () => row.original.active ? 'Active' : 'Inactive'),
      !row.original.onboardingComplete ? h(UBadge, {
        color: 'warning',
        variant: 'subtle'
      }, () => 'Setup Incomplete') : null
    ])
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }: any) => h(UDropdownMenu, {
      items: getActions(row.original)
    }, () => h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      icon: 'i-heroicons-ellipsis-horizontal'
    }))
  }
]

// Transform flows into table rows with counts and related data
const rows = computed(() => {
  return flows.value.map(flow => ({
    id: flow.id,
    name: flow.name,
    description: flow.description || '—',
    inputCount: getInputCount(flow.id),
    outputCount: getOutputCount(flow.id),
    active: flow.active,
    onboardingComplete: flow.onboardingComplete,
    flow, // Keep reference to full flow object
    flowInputs: getInputsForFlow(flow.id),
    flowOutputs: getOutputsForFlow(flow.id)
  }))
})

// Handle create new flow
const handleCreateFlow = () => {
  console.log('[FlowList] Create button clicked, navigating to:', `/dashboard/${props.teamSlug}/discubot/flows/create`)
  console.log('[FlowList] Team slug:', props.teamSlug)
  console.log('[FlowList] Team ID:', props.teamId)
  router.push(`/dashboard/${props.teamSlug}/discubot/flows/create`)
}

// Handle edit flow
const handleEditFlow = (flowId: string) => {
  router.push(`/dashboard/${props.teamSlug}/discubot/flows/${flowId}`)
}

// Handle delete flow (show confirmation)
const handleDeleteFlow = (flow: Flow) => {
  flowToDelete.value = flow
  showDeleteModal.value = true
}

// Confirm delete
const confirmDelete = async () => {
  if (!flowToDelete.value) return

  isDeleting.value = true
  try {
    await $fetch(`/api/teams/${props.teamId}/discubot-flows/${flowToDelete.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Success',
      description: 'Flow deleted successfully',
      color: 'success'
    })

    // Remove from local state
    flows.value = flows.value.filter(f => f.id !== flowToDelete.value!.id)

    // Close modal
    showDeleteModal.value = false
    flowToDelete.value = null
  } catch (error) {
    console.error('Error deleting flow:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to delete flow',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}

// Cancel delete
const cancelDelete = () => {
  showDeleteModal.value = false
  flowToDelete.value = null
}

// Actions dropdown items (Nuxt UI v4 format)
const getActions = (row: any) => [
  [
    {
      label: 'Edit',
      icon: 'i-heroicons-pencil-square',
      onSelect: () => handleEditFlow(row.id)
    },
    {
      label: 'Delete',
      icon: 'i-heroicons-trash',
      onSelect: () => handleDeleteFlow(row.flow),
      disabled: isDeleting.value
    }
  ]
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header with create button -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold">Flows</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Manage your multi-input, multi-output discussion flows
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="handleCreateFlow"
      >
        Create Flow
      </UButton>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p class="text-sm text-muted-foreground mt-2">Loading flows...</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="flows.length === 0" class="text-center py-12 border border-dashed rounded-lg">
      <div class="max-w-sm mx-auto">
        <div class="text-5xl mb-4">🌊</div>
        <h3 class="text-lg font-semibold mb-2">No flows yet</h3>
        <p class="text-sm text-muted-foreground mb-4">
          Create your first flow to start routing discussions from multiple sources to multiple destinations.
        </p>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="handleCreateFlow"
        >
          Create Your First Flow
        </UButton>
      </div>
    </div>

    <!-- Flows table -->
    <UTable
      v-else
      :columns="columns"
      :data="rows"
      :loading="isLoading"
    />

    <!-- Delete confirmation modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Delete Flow</h3>
          <p class="text-sm text-muted-foreground mb-6">
            Are you sure you want to delete
            <span class="font-semibold text-foreground">{{ flowToDelete?.name }}</span>?
            This will also delete all associated inputs and outputs. This action cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="cancelDelete"
              :disabled="isDeleting"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              @click="confirmDelete"
              :loading="isDeleting"
            >
              Delete Flow
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
