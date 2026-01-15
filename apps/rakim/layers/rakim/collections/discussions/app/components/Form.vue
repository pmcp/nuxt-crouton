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
      <div v-show="!tabs || activeSection === 'details'" class="flex flex-col gap-4 p-1">
        <UFormField label="SourceUrl" name="sourceUrl" class="not-last:pb-4">
          <UInput v-model="state.sourceUrl" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="Title" name="title" class="not-last:pb-4">
          <UInput v-model="state.title" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="Content" name="content" class="not-last:pb-4">
          <UTextarea v-model="state.content" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="AuthorHandle" name="authorHandle" class="not-last:pb-4">
          <UInput v-model="state.authorHandle" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'thread'" class="flex flex-col gap-4 p-1">
        <UFormField label="ThreadData" name="threadData" class="not-last:pb-4">
          <UTextarea
            :model-value="typeof state.threadData === 'string' ? state.threadData : JSON.stringify(state.threadData, null, 2)"
            @update:model-value="(val) => { try { state.threadData = val ? JSON.parse(val) : {} } catch (e) { console.error('Invalid JSON:', e) } }"
            class="w-full font-mono text-sm"
            :rows="8"
            placeholder="Enter JSON object"
          />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'ai'" class="flex flex-col gap-4 p-1">
        <UFormField label="AiSummary" name="aiSummary" class="not-last:pb-4">
          <UTextarea v-model="state.aiSummary" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="AiKeyPoints" name="aiKeyPoints" class="not-last:pb-4">
          <UTextarea
            :model-value="Array.isArray(state.aiKeyPoints) ? state.aiKeyPoints.join('\n') : ''"
            @update:model-value="(val) => state.aiKeyPoints = val ? val.split('\n').filter(Boolean) : []"
            class="w-full"
            :rows="6"
            placeholder="Enter one value per line"
          />
          <p class="text-sm text-gray-500 mt-1">Enter one value per line</p>
        </UFormField>
        <UFormField label="AiTasks" name="aiTasks" class="not-last:pb-4">
          <UTextarea
            :model-value="typeof state.aiTasks === 'string' ? state.aiTasks : JSON.stringify(state.aiTasks, null, 2)"
            @update:model-value="(val) => { try { state.aiTasks = val ? JSON.parse(val) : {} } catch (e) { console.error('Invalid JSON:', e) } }"
            class="w-full font-mono text-sm"
            :rows="8"
            placeholder="Enter JSON object"
          />
        </UFormField>
      </div>
      </template>

      <template #sidebar>
      <div class="flex flex-col gap-4 p-1">
        <UFormField label="SourceType" name="sourceType" class="not-last:pb-4">
          <UInput v-model="state.sourceType" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="SourceThreadId" name="sourceThreadId" class="not-last:pb-4">
          <UInput v-model="state.sourceThreadId" class="w-full" size="xl" />
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
        <UFormField label="Participants" name="participants" class="not-last:pb-4">
          <UTextarea
            :model-value="Array.isArray(state.participants) ? state.participants.join('\n') : ''"
            @update:model-value="(val) => state.participants = val ? val.split('\n').filter(Boolean) : []"
            class="w-full"
            :rows="6"
            placeholder="Enter one value per line"
          />
          <p class="text-sm text-gray-500 mt-1">Enter one value per line</p>
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="Status" name="status" class="not-last:pb-4">
          <UInput v-model="state.status" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="ProcessedAt" name="processedAt" class="not-last:pb-4">
          <CroutonCalendar v-model:date="state.processedAt" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="TotalMessages" name="totalMessages" class="not-last:pb-4">
          <UInputNumber v-model="state.totalMessages" class="w-full" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="IsMultiTask" name="isMultiTask" class="not-last:pb-4">
          <UCheckbox v-model="state.isMultiTask" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="SyncJobId" name="syncJobId" class="not-last:pb-4">
          <CroutonFormReferenceSelect
            v-model="state.syncJobId"
            collection="discubotJobs"
            label="SyncJobId"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="NotionTaskIds" name="notionTaskIds" class="not-last:pb-4">
          <UTextarea
            :model-value="Array.isArray(state.notionTaskIds) ? state.notionTaskIds.join('\n') : ''"
            @update:model-value="(val) => state.notionTaskIds = val ? val.split('\n').filter(Boolean) : []"
            class="w-full"
            :rows="6"
            placeholder="Enter one value per line"
          />
          <p class="text-sm text-gray-500 mt-1">Enter one value per line</p>
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="RawPayload" name="rawPayload" class="not-last:pb-4">
          <UTextarea
            :model-value="typeof state.rawPayload === 'string' ? state.rawPayload : JSON.stringify(state.rawPayload, null, 2)"
            @update:model-value="(val) => { try { state.rawPayload = val ? JSON.parse(val) : {} } catch (e) { console.error('Invalid JSON:', e) } }"
            class="w-full font-mono text-sm"
            :rows="8"
            placeholder="Enter JSON object"
          />
        </UFormField>
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
import type { DiscubotDiscussionFormProps, DiscubotDiscussionFormData } from '../../types'

const props = defineProps<DiscubotDiscussionFormProps>()
const { defaultValue, schema, collection } = useDiscubotDiscussions()

// Form layout configuration
const navigationItems = [
  { label: 'Details', value: 'details' },
  { label: 'Thread', value: 'thread' },
  { label: 'Ai', value: 'ai' }
]

const tabs = ref(true)
const activeSection = ref('details')

// Map field names to their tab groups for error tracking
const fieldToGroup: Record<string, string> = {
  'sourceUrl': 'details',
  'title': 'details',
  'content': 'details',
  'authorHandle': 'details',
  'threadData': 'thread',
  'aiSummary': 'ai',
  'aiKeyPoints': 'ai',
  'aiTasks': 'ai'
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
  if (initialValues.processedAt) {
    initialValues.processedAt = new Date(initialValues.processedAt)
  }
}

const state = ref<DiscubotDiscussionFormData & { id?: string | null }>(initialValues)

const handleSubmit = async () => {
  try {
    // Serialize Date objects to ISO strings for API submission
    const serializedData = { ...state.value }
    if (serializedData.processedAt instanceof Date) {
      serializedData.processedAt = serializedData.processedAt.toISOString()
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