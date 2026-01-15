<template>
  <CroutonFormActionButton
    v-if="action === 'delete'"
    :action="action"
    :collection="collection"
    :items="items"
    :loading="loading"
    @click="handleSubmit"
  />

  <UForm
    v-else
    :schema="schema"
    :state="state"
    @submit="handleSubmit"
    @error="handleValidationError"
  >
    <CroutonFormLayout :tabs="tabs" :navigation-items="navigationItems" :tab-errors="tabErrorCounts" v-model="activeSection">
      <template #main="{ activeSection }">
      <div v-show="!tabs || activeSection === 'status'" class="flex flex-col gap-4 p-1">
        <UFormField label="Status" name="status" class="not-last:pb-4">
          <UInput v-model="state.status" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="Stage" name="stage" class="not-last:pb-4">
          <UInput v-model="state.stage" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'error'" class="flex flex-col gap-4 p-1">
        <UFormField label="Error" name="error" class="not-last:pb-4">
          <UTextarea v-model="state.error" class="w-full" size="xl" />
        </UFormField>
      </div>
      </template>

      <template #sidebar>
      <div class="flex flex-col gap-4 p-1">
        <UFormField label="DiscussionId" name="discussionId" class="not-last:pb-4">
          <CroutonFormReferenceSelect
            v-model="state.discussionId"
            collection="discubotDiscussions"
            label="DiscussionId"
          />
        </UFormField>
        <UFormField label="SourceConfigId" name="sourceConfigId" class="not-last:pb-4">
          <CroutonFormReferenceSelect
            v-model="state.sourceConfigId"
            collection="discubotConfigs"
            label="SourceConfigId"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="Attempts" name="attempts" class="not-last:pb-4">
          <UInputNumber v-model="state.attempts" class="w-full" />
        </UFormField>
        <UFormField label="MaxAttempts" name="maxAttempts" class="not-last:pb-4">
          <UInputNumber v-model="state.maxAttempts" class="w-full" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="ErrorStack" name="errorStack" class="not-last:pb-4">
          <UTextarea v-model="state.errorStack" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="StartedAt" name="startedAt" class="not-last:pb-4">
          <CroutonCalendar v-model:date="state.startedAt" />
        </UFormField>
        <UFormField label="CompletedAt" name="completedAt" class="not-last:pb-4">
          <CroutonCalendar v-model:date="state.completedAt" />
        </UFormField>
        <UFormField label="ProcessingTime" name="processingTime" class="not-last:pb-4">
          <UInputNumber v-model="state.processingTime" class="w-full" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="TaskIds" name="taskIds" class="not-last:pb-4">
          <UTextarea
            :model-value="Array.isArray(state.taskIds) ? state.taskIds.join('\n') : ''"
            @update:model-value="(val) => state.taskIds = val ? val.split('\n').filter(Boolean) : []"
            class="w-full"
            :rows="6"
            placeholder="Enter one value per line"
          />
          <p class="text-sm text-gray-500 mt-1">Enter one value per line</p>
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="Metadata" name="metadata" class="not-last:pb-4">
          <UTextarea
            :model-value="typeof state.metadata === 'string' ? state.metadata : JSON.stringify(state.metadata, null, 2)"
            @update:model-value="(val) => { try { state.metadata = val ? JSON.parse(val) : {} } catch (e) { console.error('Invalid JSON:', e) } }"
            class="w-full font-mono text-sm"
            :rows="8"
            placeholder="Enter JSON object"
          />
        </UFormField>
      </div>
      </template>

      <template #footer>
        <CroutonValidationErrorSummary
          v-if="validationErrors.length > 0"
          :tab-errors="tabErrorCounts"
          :navigation-items="navigationItems"
          @switch-tab="switchToTab"
        />

        <CroutonFormActionButton
          :action="action"
          :collection="collection"
          :items="items"
          :loading="loading"
          :has-validation-errors="validationErrors.length > 0"
        />
      </template>
    </CroutonFormLayout>
  </UForm>
</template>

<script setup lang="ts">
import type { DiscubotJobFormProps, DiscubotJobFormData } from '../../types'

const props = defineProps<DiscubotJobFormProps>()
const { defaultValue, schema, collection } = useDiscubotJobs()

// Form layout configuration
const navigationItems = [
  { label: 'Status', value: 'status' },
  { label: 'Error', value: 'error' }
]

const tabs = ref(true)
const activeSection = ref('status')

// Map field names to their tab groups for error tracking
const fieldToGroup: Record<string, string> = {
  'status': 'status',
  'stage': 'status',
  'error': 'error'
}

// Track validation errors for tab indicators
const validationErrors = ref<Array<{ name: string; message: string }>>([])

// Handle form validation errors
const handleValidationError = (event: any) => {
  if (event?.errors) {
    validationErrors.value = event.errors
  }
}

// Compute errors per tab
const tabErrorCounts = computed(() => {
  const counts: Record<string, number> = {}

  validationErrors.value.forEach(error => {
    const tabName = fieldToGroup[error.name] || 'general'
    counts[tabName] = (counts[tabName] || 0) + 1
  })

  return counts
})

// Switch to a specific tab (for clicking error links)
const switchToTab = (tabValue: string) => {
  activeSection.value = tabValue
}

// Use new mutation composable for data operations
const { create, update, deleteItems } = useCollectionMutation(collection)

// useCrouton still manages modal state
const { close } = useCrouton()

// Initialize form state with proper values (no watch needed!)
const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }

// Convert date strings to Date objects for date fields during editing
if (props.action === 'update' && props.activeItem?.id) {
  if (initialValues.startedAt) {
    initialValues.startedAt = new Date(initialValues.startedAt)
  }
  if (initialValues.completedAt) {
    initialValues.completedAt = new Date(initialValues.completedAt)
  }
}

const state = ref<DiscubotJobFormData & { id?: string | null }>(initialValues)

const handleSubmit = async () => {
  try {
    // Serialize Date objects to ISO strings for API submission
    const serializedData = { ...state.value }
    if (serializedData.startedAt instanceof Date) {
      serializedData.startedAt = serializedData.startedAt.toISOString()
    }
    if (serializedData.completedAt instanceof Date) {
      serializedData.completedAt = serializedData.completedAt.toISOString()
    }

    if (props.action === 'create') {
      await create(serializedData)
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, serializedData)
    } else if (props.action === 'delete') {
      await deleteItems(props.items)
    }

    // Clear validation errors on successful submission
    validationErrors.value = []

    close()

  } catch (error) {
    console.error('Form submission failed:', error)
    // You can add toast notification here if available
    // toast.add({ title: 'Error', description: 'Failed to submit form', color: 'red' })
  }
}
</script>