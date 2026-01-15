<script setup lang="ts">
import { z } from 'zod'
import type { FlowOutput, NotionOutputConfig } from '~/layers/discubot/types'

/**
 * OutputManager Component
 *
 * Manages outputs for a flow. Supports:
 * - Notion outputs with schema fetching and field mapping
 * - GitHub outputs (future)
 * - Linear outputs (future)
 *
 * Features:
 * - Add/edit/delete outputs
 * - Domain-based routing configuration
 * - Default output designation
 * - Notion schema fetching and auto-field mapping
 * - Display output status and configuration
 */

interface Props {
  /**
   * Flow ID these outputs belong to
   */
  flowId: string

  /**
   * Team ID for API calls
   */
  teamId: string

  /**
   * Available domains from the flow (for domain filter selection)
   */
  availableDomains: string[]

  /**
   * Initial list of outputs (for editing)
   */
  modelValue?: FlowOutput[]

  /**
   * Whether the component is in edit mode (vs create mode in wizard)
   */
  editMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  editMode: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: FlowOutput[]]
  'change': [value: FlowOutput[]]
}>()

// ============================================================================
// STATE
// ============================================================================

const outputs = ref<FlowOutput[]>([...props.modelValue])
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const selectedOutputType = ref<'notion' | 'github' | 'linear'>('notion')
const editingOutput = ref<FlowOutput | null>(null)
const deletingOutput = ref<FlowOutput | null>(null)

const toast = useToast()

// ============================================================================
// OUTPUT FORM STATE
// ============================================================================

const outputFormState = ref({
  name: '',
  outputType: 'notion',
  domainFilter: [] as string[],
  isDefault: false,
  active: true,
  // Notion-specific
  notionToken: '',
  databaseId: '',
  fieldMapping: {} as Record<string, any>,
})

// ============================================================================
// NOTION SCHEMA FETCHING
// ============================================================================

const {
  schema: notionSchema,
  loading: schemaLoading,
  error: schemaError,
  fetchSchema
} = useNotionSchema()

const {
  autoMapFields,
  generateValueMapping,
  getPropertyTypeColor
} = useFieldMapping()

/**
 * Update field mapping with full structure when a property is selected
 *
 * This builds the correct format expected by the backend:
 * { notionProperty: string, propertyType: string, valueMap: Record<string, string> }
 */
function updateFieldMapping(aiField: string, propertyName: string | null) {
  if (!propertyName) {
    // Clear the mapping if property is deselected
    delete outputFormState.value.fieldMapping[aiField]
    return
  }

  const propInfo = notionSchema.value?.properties?.[propertyName]
  if (!propInfo) return

  outputFormState.value.fieldMapping[aiField] = {
    notionProperty: propertyName,
    propertyType: propInfo.type,
    valueMap: (propInfo.type === 'select' || propInfo.type === 'status')
      ? generateValueMapping(aiField, propInfo.options)
      : {}
  }
}

/**
 * Get the currently mapped Notion property name for an AI field
 */
function getMappedProperty(aiField: string): string | null {
  const mapping = outputFormState.value.fieldMapping[aiField]
  if (!mapping) return null
  return typeof mapping === 'string' ? mapping : mapping.notionProperty || null
}

/**
 * Fetch Notion schema and auto-map fields
 */
async function fetchNotionSchemaAndMap() {
  if (!outputFormState.value.notionToken || !outputFormState.value.databaseId) {
    toast.add({
      title: 'Missing Information',
      description: 'Please enter Notion token and database ID first.',
      color: 'warning',
    })
    return
  }

  try {
    await fetchSchema(outputFormState.value.notionToken, outputFormState.value.databaseId)

    if (notionSchema.value) {
      // Auto-map fields
      const mappedFields = autoMapFields(notionSchema.value)
      outputFormState.value.fieldMapping = mappedFields

      toast.add({
        title: 'Schema Fetched',
        description: 'Fields have been auto-mapped. Review and adjust as needed.',
        color: 'success',
      })
    }
  } catch (error: any) {
    console.error('[OutputManager] Failed to fetch schema:', error)
    toast.add({
      title: 'Schema Fetch Failed',
      description: error.message || 'Failed to fetch Notion schema.',
      color: 'error',
    })
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const notionOutputSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  notionToken: z.string().min(1, 'Notion token is required'),
  databaseId: z.string().min(1, 'Database ID is required'),
})

const githubOutputSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  // Future: GitHub-specific validation
})

const linearOutputSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  // Future: Linear-specific validation
})

const outputSchema = computed(() => {
  switch (selectedOutputType.value) {
    case 'notion':
      return notionOutputSchema
    case 'github':
      return githubOutputSchema
    case 'linear':
      return linearOutputSchema
    default:
      return notionOutputSchema
  }
})

// ============================================================================
// OUTPUT TYPE OPTIONS
// ============================================================================

const outputTypeOptions = [
  {
    label: 'Notion',
    icon: 'i-heroicons-document-text',
    click: () => openAddModal('notion'),
  },
  {
    label: 'GitHub',
    icon: 'i-simple-icons-github',
    click: () => openAddModal('github'),
    disabled: true, // Future feature
  },
  {
    label: 'Linear',
    icon: 'i-simple-icons-linear',
    click: () => openAddModal('linear'),
    disabled: true, // Future feature
  },
]

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

/**
 * Open add modal for specific output type
 */
function openAddModal(type: 'notion' | 'github' | 'linear') {
  selectedOutputType.value = type
  resetForm()

  // If no outputs exist, make this the default
  if (outputs.value.length === 0) {
    outputFormState.value.isDefault = true
  }

  isAddModalOpen.value = true
}

/**
 * Open edit modal for existing output
 */
function openEditModal(output: FlowOutput) {
  editingOutput.value = output
  selectedOutputType.value = output.outputType as 'notion' | 'github' | 'linear'

  // Populate form with existing data
  outputFormState.value = {
    name: output.name,
    outputType: output.outputType,
    domainFilter: output.domainFilter || [],
    isDefault: output.isDefault,
    active: output.active,
    notionToken: (output.outputConfig as NotionOutputConfig)?.notionToken || '',
    databaseId: (output.outputConfig as NotionOutputConfig)?.databaseId || '',
    fieldMapping: (output.outputConfig as NotionOutputConfig)?.fieldMapping || {},
  }

  isEditModalOpen.value = true
}

/**
 * Open delete confirmation dialog
 */
function openDeleteDialog(output: FlowOutput) {
  deletingOutput.value = output
  isDeleteDialogOpen.value = true
}

/**
 * Reset form to defaults
 */
function resetForm() {
  outputFormState.value = {
    name: '',
    outputType: selectedOutputType.value,
    domainFilter: [],
    isDefault: false,
    active: true,
    notionToken: '',
    databaseId: '',
    fieldMapping: {},
  }
  editingOutput.value = null
  notionSchema.value = null
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Validate default output constraint
 */
function validateDefaultOutput(newOutputs: FlowOutput[]): { valid: boolean; message?: string } {
  const defaultOutputs = newOutputs.filter(o => o.isDefault)

  if (defaultOutputs.length === 0) {
    return {
      valid: false,
      message: 'At least one output must be marked as default.',
    }
  }

  if (defaultOutputs.length > 1) {
    return {
      valid: false,
      message: 'Only one output can be marked as default.',
    }
  }

  return { valid: true }
}

/**
 * Save new output
 */
async function saveNewOutput() {
  try {
    // Validate form
    const validatedData = outputSchema.value.parse(outputFormState.value)

    // Build output config based on type
    let outputConfig: Record<string, any> = {}

    if (selectedOutputType.value === 'notion') {
      outputConfig = {
        notionToken: outputFormState.value.notionToken,
        databaseId: outputFormState.value.databaseId,
        fieldMapping: outputFormState.value.fieldMapping,
      } as NotionOutputConfig
    }
    // Future: Add GitHub, Linear configs

    // Create new output object
    const newOutput: FlowOutput = {
      id: `temp-${Date.now()}`, // Temporary ID, will be replaced by DB
      flowId: props.flowId,
      outputType: selectedOutputType.value,
      name: validatedData.name,
      domainFilter: outputFormState.value.domainFilter.length > 0
        ? outputFormState.value.domainFilter
        : undefined,
      isDefault: outputFormState.value.isDefault,
      outputConfig,
      active: true,
    }

    // Check if we need to unset other defaults
    let updatedOutputs = [...outputs.value]
    if (newOutput.isDefault) {
      updatedOutputs = updatedOutputs.map(o => ({ ...o, isDefault: false }))
    }
    updatedOutputs.push(newOutput)

    // Validate default constraint
    const validation = validateDefaultOutput(updatedOutputs)
    if (!validation.valid) {
      toast.add({
        title: 'Validation Error',
        description: validation.message,
        color: 'error',
      })
      return
    }

    // If in edit mode, save to API
    if (props.editMode) {
      // If setting as default, update other outputs first
      if (newOutput.isDefault) {
        for (const output of outputs.value) {
          if (output.isDefault) {
            await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs/${output.id}`, {
              method: 'PATCH',
              body: { isDefault: false },
            })
          }
        }
      }

      const response = await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs`, {
        method: 'POST',
        body: newOutput,
      })

      // Update local array
      outputs.value = updatedOutputs.map(o =>
        o.id === newOutput.id ? (response as FlowOutput) : o
      )

      toast.add({
        title: 'Output Added',
        description: `${validatedData.name} has been added successfully.`,
        color: 'success',
      })
    } else {
      // In wizard mode, just add to local array
      outputs.value = updatedOutputs
    }

    // Emit changes
    emit('update:modelValue', outputs.value)
    emit('change', outputs.value)

    // Close modal and reset form
    isAddModalOpen.value = false
    resetForm()
  } catch (error: any) {
    console.error('[OutputManager] Failed to save output:', error)

    // Show validation errors or API errors
    if (error.issues) {
      // Zod validation errors
      const errorMessages = error.issues.map((issue: any) => issue.message).join(', ')
      toast.add({
        title: 'Validation Error',
        description: errorMessages,
        color: 'error',
      })
    } else {
      toast.add({
        title: 'Save Failed',
        description: error.message || 'Failed to save output. Please try again.',
        color: 'error',
      })
    }
  }
}

/**
 * Update existing output
 */
async function updateOutput() {
  if (!editingOutput.value) return

  try {
    // Validate form
    const validatedData = outputSchema.value.parse(outputFormState.value)

    // Build output config based on type
    let outputConfig: Record<string, any> = {}

    if (selectedOutputType.value === 'notion') {
      outputConfig = {
        notionToken: outputFormState.value.notionToken,
        databaseId: outputFormState.value.databaseId,
        fieldMapping: outputFormState.value.fieldMapping,
      } as NotionOutputConfig
    }
    // Future: Add GitHub, Linear configs

    // Update output object
    const updatedOutput: FlowOutput = {
      ...editingOutput.value,
      name: validatedData.name,
      domainFilter: outputFormState.value.domainFilter.length > 0
        ? outputFormState.value.domainFilter
        : undefined,
      isDefault: outputFormState.value.isDefault,
      outputConfig,
      active: outputFormState.value.active,
    }

    // Check if we need to unset other defaults
    let updatedOutputs = outputs.value.map(o =>
      o.id === editingOutput.value!.id ? updatedOutput : o
    )
    if (updatedOutput.isDefault) {
      updatedOutputs = updatedOutputs.map(o =>
        o.id === updatedOutput.id ? o : { ...o, isDefault: false }
      )
    }

    // Validate default constraint
    const validation = validateDefaultOutput(updatedOutputs)
    if (!validation.valid) {
      toast.add({
        title: 'Validation Error',
        description: validation.message,
        color: 'error',
      })
      return
    }

    // If in edit mode, update via API
    if (props.editMode) {
      // If setting as default, update other outputs first
      if (updatedOutput.isDefault && !editingOutput.value.isDefault) {
        for (const output of outputs.value) {
          if (output.isDefault && output.id !== updatedOutput.id) {
            await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs/${output.id}`, {
              method: 'PATCH',
              body: { isDefault: false },
            })
          }
        }
      }

      const response = await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs/${editingOutput.value.id}`, {
        method: 'PATCH',
        body: updatedOutput,
      })

      // Update local array
      outputs.value = updatedOutputs.map(o =>
        o.id === editingOutput.value!.id ? (response as FlowOutput) : o
      )

      toast.add({
        title: 'Output Updated',
        description: `${validatedData.name} has been updated successfully.`,
        color: 'success',
      })
    } else {
      // In wizard mode, just update local array
      outputs.value = updatedOutputs
    }

    // Emit changes
    emit('update:modelValue', outputs.value)
    emit('change', outputs.value)

    // Close modal and reset form
    isEditModalOpen.value = false
    resetForm()
  } catch (error: any) {
    console.error('[OutputManager] Failed to update output:', error)

    // Show validation errors or API errors
    if (error.issues) {
      const errorMessages = error.issues.map((issue: any) => issue.message).join(', ')
      toast.add({
        title: 'Validation Error',
        description: errorMessages,
        color: 'error',
      })
    } else {
      toast.add({
        title: 'Update Failed',
        description: error.message || 'Failed to update output. Please try again.',
        color: 'error',
      })
    }
  }
}

/**
 * Delete output
 */
async function deleteOutput() {
  if (!deletingOutput.value) return

  try {
    // Check if deleting the default output
    if (deletingOutput.value.isDefault && outputs.value.length > 1) {
      toast.add({
        title: 'Cannot Delete',
        description: 'Cannot delete the default output. Set another output as default first.',
        color: 'error',
      })
      return
    }

    // If in edit mode, delete via API
    if (props.editMode) {
      await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs/${deletingOutput.value.id}`, {
        method: 'DELETE',
      })

      toast.add({
        title: 'Output Deleted',
        description: `${deletingOutput.value.name} has been deleted.`,
        color: 'success',
      })
    }

    // Remove from local array
    outputs.value = outputs.value.filter(o => o.id !== deletingOutput.value!.id)

    // Emit changes
    emit('update:modelValue', outputs.value)
    emit('change', outputs.value)

    // Close dialog
    isDeleteDialogOpen.value = false
    deletingOutput.value = null
  } catch (error: any) {
    console.error('[OutputManager] Failed to delete output:', error)
    toast.add({
      title: 'Delete Failed',
      description: error.message || 'Failed to delete output. Please try again.',
      color: 'error',
    })
  }
}

/**
 * Toggle output active status
 */
async function toggleActive(output: FlowOutput) {
  try {
    const updatedOutput = { ...output, active: !output.active }

    // If in edit mode, update via API
    if (props.editMode) {
      await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs/${output.id}`, {
        method: 'PATCH',
        body: { active: updatedOutput.active },
      })
    }

    // Update local array
    const index = outputs.value.findIndex(o => o.id === output.id)
    if (index !== -1) {
      outputs.value[index] = updatedOutput
    }

    // Emit changes
    emit('update:modelValue', outputs.value)
    emit('change', outputs.value)
  } catch (error: any) {
    console.error('[OutputManager] Failed to toggle active status:', error)
    toast.add({
      title: 'Update Failed',
      description: 'Failed to update output status.',
      color: 'error',
    })
  }
}

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

/**
 * Get icon for output type
 */
function getOutputTypeIcon(type: string): string {
  switch (type) {
    case 'notion':
      return 'i-heroicons-document-text'
    case 'github':
      return 'i-simple-icons-github'
    case 'linear':
      return 'i-simple-icons-linear'
    default:
      return 'i-heroicons-square-3-stack-3d'
  }
}

/**
 * Get color for output type
 */
function getOutputTypeColor(type: string): string {
  switch (type) {
  case 'notion':
      return 'gray'
    case 'github':
      return 'gray'
    case 'linear':
      return 'blue'
    default:
      return 'gray'
  }
}

/**
 * Format domain filter for display
 */
function formatDomainFilter(domainFilter?: string[]): string {
  if (!domainFilter || domainFilter.length === 0) {
    return 'All domains'
  }
  return domainFilter.join(', ')
}

// ============================================================================
// WATCHERS
// ============================================================================

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  outputs.value = [...newValue]
}, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Outputs</h3>
        <p class="text-sm text-gray-500">
          Configure where tasks should be created
        </p>
      </div>

      <!-- Add Output Button -->
      <UDropdownMenu :items="[outputTypeOptions]">
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          label="Add Output"
        />
      </UDropdownMenu>
    </div>

    <!-- Outputs List -->
    <div v-if="outputs.length === 0" class="text-center py-8 text-gray-500">
      <div class="i-heroicons-square-3-stack-3d text-4xl mb-2 mx-auto" />
      <p>No outputs configured yet.</p>
      <p class="text-sm">Add at least one output to route tasks.</p>
    </div>

    <div v-else class="space-y-3">
      <UCard
        v-for="output in outputs"
        :key="output.id"
        class="relative"
      >
        <div class="flex items-start justify-between">
          <!-- Output Info -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <UBadge
                :icon="getOutputTypeIcon(output.outputType)"
                :color="getOutputTypeColor(output.outputType)"
                variant="subtle"
              >
                {{ output.outputType }}
              </UBadge>

              <UBadge
                v-if="output.isDefault"
                color="primary"
                variant="subtle"
              >
                Default
              </UBadge>

              <UBadge
                v-if="!output.active"
                color="gray"
                variant="subtle"
              >
                Inactive
              </UBadge>
            </div>

            <h4 class="font-semibold">{{ output.name }}</h4>

            <div class="mt-2 space-y-1 text-sm text-gray-600">
              <div class="flex items-center gap-1">
                <span class="i-heroicons-funnel" />
                <span>{{ formatDomainFilter(output.domainFilter) }}</span>
              </div>

              <div v-if="output.outputType === 'notion'" class="flex items-center gap-1">
                <span class="i-heroicons-circle-stack" />
                <span class="font-mono text-xs">
                  {{ (output.outputConfig as NotionOutputConfig).databaseId }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <USwitch
              :model-value="output.active"
              @update:model-value="toggleActive(output)"
            />

            <UButton
              icon="i-heroicons-pencil"
              color="gray"
              variant="ghost"
              size="sm"
              @click="openEditModal(output)"
            />

            <UButton
              icon="i-heroicons-trash"
              color="red"
              variant="ghost"
              size="sm"
              @click="openDeleteDialog(output)"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Validation Warning -->
    <UAlert
      v-if="outputs.length > 0 && !outputs.some(o => o.isDefault)"
      color="warning"
      icon="i-heroicons-exclamation-triangle"
      title="No Default Output"
      description="At least one output must be marked as default to handle tasks with no domain match."
    />

    <!-- Add Output Modal -->
    <UModal v-model="isAddModalOpen">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            Add {{ selectedOutputType }} Output
          </h3>

          <div class="space-y-4">
            <!-- Basic Info -->
            <UFormField label="Output Name" name="name" required>
              <UInput
                v-model="outputFormState.name"
                placeholder="e.g., Design Tasks DB"
              />
            </UFormField>

            <!-- Domain Filter -->
            <UFormField
              label="Domain Filter"
              name="domainFilter"
              help="Select which domains should route to this output. Leave empty to accept all domains."
            >
              <USelectMenu
                v-model="outputFormState.domainFilter"
                :options="availableDomains"
                multiple
                placeholder="Select domains..."
              />
            </UFormField>

            <!-- Default Output -->
            <UFormField name="isDefault">
              <UCheckbox
                v-model="outputFormState.isDefault"
                label="Set as default output"
                help="Default output receives tasks with no domain or no matching filter"
              />
            </UFormField>

            <!-- Notion Configuration -->
            <div v-if="selectedOutputType === 'notion'" class="space-y-4 pt-4 border-t">
              <h4 class="font-semibold text-sm">Notion Configuration</h4>

              <UFormField label="Notion API Token" name="notionToken" required>
                <UInput
                  v-model="outputFormState.notionToken"
                  type="password"
                  placeholder="secret_..."
                />
              </UFormField>

              <UFormField label="Database ID" name="databaseId" required>
                <UInput
                  v-model="outputFormState.databaseId"
                  placeholder="32 character ID (no dashes)"
                />
              </UFormField>

              <UButton
                icon="i-heroicons-arrow-path"
                :loading="schemaLoading"
                @click="fetchNotionSchemaAndMap"
              >
                Fetch Schema & Auto-Map Fields
              </UButton>

              <UAlert
                v-if="schemaError"
                color="error"
                icon="i-heroicons-exclamation-circle"
                :title="schemaError"
              />

              <!-- Field Mapping (if schema loaded) -->
              <div v-if="notionSchema" class="space-y-3 pt-4 border-t">
                <h5 class="font-semibold text-sm">Field Mapping</h5>

                <!-- Priority Mapping -->
                <UFormField label="Priority Field" name="priority">
                  <USelectMenu
                    :model-value="getMappedProperty('priority')"
                    :options="Object.keys(notionSchema.properties || {})"
                    placeholder="Select property..."
                    @update:model-value="updateFieldMapping('priority', $event)"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <span>{{ option }}</span>
                        <UBadge
                          :color="getPropertyTypeColor(notionSchema.properties[option]?.type)"
                          size="xs"
                          variant="subtle"
                        >
                          {{ notionSchema.properties[option]?.type }}
                        </UBadge>
                      </div>
                    </template>
                  </USelectMenu>
                </UFormField>

                <!-- Type Mapping -->
                <UFormField label="Type Field" name="type">
                  <USelectMenu
                    :model-value="getMappedProperty('type')"
                    :options="Object.keys(notionSchema.properties || {})"
                    placeholder="Select property..."
                    @update:model-value="updateFieldMapping('type', $event)"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <span>{{ option }}</span>
                        <UBadge
                          :color="getPropertyTypeColor(notionSchema.properties[option]?.type)"
                          size="xs"
                          variant="subtle"
                        >
                          {{ notionSchema.properties[option]?.type }}
                        </UBadge>
                      </div>
                    </template>
                  </USelectMenu>
                </UFormField>

                <!-- Assignee Mapping -->
                <UFormField label="Assignee Field" name="assignee">
                  <USelectMenu
                    :model-value="getMappedProperty('assignee')"
                    :options="Object.keys(notionSchema.properties || {})"
                    placeholder="Select property..."
                    @update:model-value="updateFieldMapping('assignee', $event)"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <span>{{ option }}</span>
                        <UBadge
                          :color="getPropertyTypeColor(notionSchema.properties[option]?.type)"
                          size="xs"
                          variant="subtle"
                        >
                          {{ notionSchema.properties[option]?.type }}
                        </UBadge>
                      </div>
                    </template>
                  </USelectMenu>
                </UFormField>

                <UAlert
                  icon="i-heroicons-information-circle"
                  color="blue"
                  title="User Mapping"
                  description="For people properties, configure user mappings to map Slack/Figma users to Notion users."
                />
              </div>
            </div>

            <!-- GitHub Configuration (Future) -->
            <div v-if="selectedOutputType === 'github'" class="space-y-4 pt-4 border-t">
              <UAlert
                color="info"
                icon="i-heroicons-information-circle"
                title="Coming Soon"
                description="GitHub output configuration will be available in a future update."
              />
            </div>

            <!-- Linear Configuration (Future) -->
            <div v-if="selectedOutputType === 'linear'" class="space-y-4 pt-4 border-t">
              <UAlert
                color="info"
                icon="i-heroicons-information-circle"
                title="Coming Soon"
                description="Linear output configuration will be available in a future update."
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              color="gray"
              variant="ghost"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              @click="saveNewOutput"
            >
              Add Output
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Edit Output Modal -->
    <UModal v-model="isEditModalOpen">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            Edit {{ selectedOutputType }} Output
          </h3>

          <div class="space-y-4">
            <!-- Basic Info -->
            <UFormField label="Output Name" name="name" required>
              <UInput
                v-model="outputFormState.name"
                placeholder="e.g., Design Tasks DB"
              />
            </UFormField>

            <!-- Domain Filter -->
            <UFormField
              label="Domain Filter"
              name="domainFilter"
              help="Select which domains should route to this output. Leave empty to accept all domains."
            >
              <USelectMenu
                v-model="outputFormState.domainFilter"
                :options="availableDomains"
                multiple
                placeholder="Select domains..."
              />
            </UFormField>

            <!-- Default Output -->
            <UFormField name="isDefault">
              <UCheckbox
                v-model="outputFormState.isDefault"
                label="Set as default output"
                help="Default output receives tasks with no domain or no matching filter"
              />
            </UFormField>

            <!-- Active Status -->
            <UFormField name="active">
              <UCheckbox
                v-model="outputFormState.active"
                label="Active"
                help="Inactive outputs will not receive tasks"
              />
            </UFormField>

            <!-- Notion Configuration -->
            <div v-if="selectedOutputType === 'notion'" class="space-y-4 pt-4 border-t">
              <h4 class="font-semibold text-sm">Notion Configuration</h4>

              <UFormField label="Notion API Token" name="notionToken" required>
                <UInput
                  v-model="outputFormState.notionToken"
                  type="password"
                  placeholder="secret_..."
                />
              </UFormField>

              <UFormField label="Database ID" name="databaseId" required>
                <UInput
                  v-model="outputFormState.databaseId"
                  placeholder="32 character ID (no dashes)"
                />
              </UFormField>

              <UButton
                icon="i-heroicons-arrow-path"
                :loading="schemaLoading"
                @click="fetchNotionSchemaAndMap"
              >
                Fetch Schema & Auto-Map Fields
              </UButton>

              <UAlert
                v-if="schemaError"
                color="error"
                icon="i-heroicons-exclamation-circle"
                :title="schemaError"
              />

              <!-- Field Mapping (if schema loaded) -->
              <div v-if="notionSchema" class="space-y-3 pt-4 border-t">
                <h5 class="font-semibold text-sm">Field Mapping</h5>

                <!-- Priority Mapping -->
                <UFormField label="Priority Field" name="priority">
                  <USelectMenu
                    :model-value="getMappedProperty('priority')"
                    :options="Object.keys(notionSchema.properties || {})"
                    placeholder="Select property..."
                    @update:model-value="updateFieldMapping('priority', $event)"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <span>{{ option }}</span>
                        <UBadge
                          :color="getPropertyTypeColor(notionSchema.properties[option]?.type)"
                          size="xs"
                          variant="subtle"
                        >
                          {{ notionSchema.properties[option]?.type }}
                        </UBadge>
                      </div>
                    </template>
                  </USelectMenu>
                </UFormField>

                <!-- Type Mapping -->
                <UFormField label="Type Field" name="type">
                  <USelectMenu
                    :model-value="getMappedProperty('type')"
                    :options="Object.keys(notionSchema.properties || {})"
                    placeholder="Select property..."
                    @update:model-value="updateFieldMapping('type', $event)"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <span>{{ option }}</span>
                        <UBadge
                          :color="getPropertyTypeColor(notionSchema.properties[option]?.type)"
                          size="xs"
                          variant="subtle"
                        >
                          {{ notionSchema.properties[option]?.type }}
                        </UBadge>
                      </div>
                    </template>
                  </USelectMenu>
                </UFormField>

                <!-- Assignee Mapping -->
                <UFormField label="Assignee Field" name="assignee">
                  <USelectMenu
                    :model-value="getMappedProperty('assignee')"
                    :options="Object.keys(notionSchema.properties || {})"
                    placeholder="Select property..."
                    @update:model-value="updateFieldMapping('assignee', $event)"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <span>{{ option }}</span>
                        <UBadge
                          :color="getPropertyTypeColor(notionSchema.properties[option]?.type)"
                          size="xs"
                          variant="subtle"
                        >
                          {{ notionSchema.properties[option]?.type }}
                        </UBadge>
                      </div>
                    </template>
                  </USelectMenu>
                </UFormField>

                <UAlert
                  icon="i-heroicons-information-circle"
                  color="blue"
                  title="User Mapping"
                  description="For people properties, configure user mappings to map Slack/Figma users to Notion users."
                />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              color="gray"
              variant="ghost"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              @click="updateOutput"
            >
              Save Changes
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Dialog -->
    <UModal v-model="isDeleteDialogOpen">
      <template #content="{ close }">
        <div class="p-6">
          <div class="flex items-start gap-3 mb-4">
            <div class="i-heroicons-exclamation-triangle text-2xl text-red-500" />
            <div>
              <h3 class="text-lg font-semibold">Delete Output</h3>
              <p class="text-sm text-gray-600 mt-1">
                Are you sure you want to delete "{{ deletingOutput?.name }}"?
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <UButton
              color="gray"
              variant="ghost"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton
              color="red"
              @click="deleteOutput"
            >
              Delete Output
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
