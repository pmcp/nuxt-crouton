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
      <div v-show="!tabs || activeSection === 'basic'" class="flex flex-col gap-4 p-1">
        <UFormField label="Name" name="name" class="not-last:pb-4">
          <UInput v-model="state.name" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="Description" name="description" class="not-last:pb-4">
          <UTextarea v-model="state.description" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'routing'" class="flex flex-col gap-4 p-1">
        <UFormField label="AvailableDomains" name="availableDomains" class="not-last:pb-4">
          <UTextarea
            :model-value="Array.isArray(state.availableDomains) ? state.availableDomains.join('\n') : ''"
            @update:model-value="(val) => state.availableDomains = val ? val.split('\n').filter(Boolean) : []"
            class="w-full"
            :rows="6"
            placeholder="Enter one value per line"
          />
          <p class="text-sm text-gray-500 mt-1">Enter one value per line</p>
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'credentials'" class="flex flex-col gap-4 p-1">
        <UFormField label="AnthropicApiKey" name="anthropicApiKey" class="not-last:pb-4">
          <UInput v-model="state.anthropicApiKey" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'ai'" class="flex flex-col gap-4 p-1">
        <UFormField label="AiSummaryPrompt" name="aiSummaryPrompt" class="not-last:pb-4">
          <UTextarea v-model="state.aiSummaryPrompt" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="AiTaskPrompt" name="aiTaskPrompt" class="not-last:pb-4">
          <UTextarea v-model="state.aiTaskPrompt" class="w-full" size="xl" />
        </UFormField>
      </div>
      </template>

      <template #sidebar>
      <div class="flex flex-col gap-4 p-1">
        <UFormField label="AiEnabled" name="aiEnabled" class="not-last:pb-4">
          <UCheckbox v-model="state.aiEnabled" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="Active" name="active" class="not-last:pb-4">
          <UCheckbox v-model="state.active" />
        </UFormField>
        <UFormField label="OnboardingComplete" name="onboardingComplete" class="not-last:pb-4">
          <UCheckbox v-model="state.onboardingComplete" />
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
import type { DiscubotFlowFormProps, DiscubotFlowFormData } from '../../types'

const props = defineProps<DiscubotFlowFormProps>()
const { defaultValue, schema, collection } = useDiscubotFlows()

// Form layout configuration
const navigationItems = [
  { label: 'Basic', value: 'basic' },
  { label: 'Routing', value: 'routing' },
  { label: 'Credentials', value: 'credentials' },
  { label: 'Ai', value: 'ai' }
]

const tabs = ref(true)
const activeSection = ref('basic')

// Map field names to their tab groups for error tracking
const fieldToGroup: Record<string, string> = {
  'name': 'basic',
  'description': 'basic',
  'availableDomains': 'routing',
  'anthropicApiKey': 'credentials',
  'aiSummaryPrompt': 'ai',
  'aiTaskPrompt': 'ai'
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

const state = ref<DiscubotFlowFormData & { id?: string | null }>(initialValues)

const handleSubmit = async () => {
  try {
    if (props.action === 'create') {
      await create(state.value)
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, state.value)
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