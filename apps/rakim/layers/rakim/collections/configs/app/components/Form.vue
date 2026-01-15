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
        <UFormField label="SourceType" name="sourceType" class="not-last:pb-4">
          <UInput v-model="state.sourceType" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="Name" name="name" class="not-last:pb-4">
          <UInput v-model="state.name" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'email'" class="flex flex-col gap-4 p-1">
        <UFormField label="EmailAddress" name="emailAddress" class="not-last:pb-4">
          <UInput v-model="state.emailAddress" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="EmailSlug" name="emailSlug" class="not-last:pb-4">
          <UInput v-model="state.emailSlug" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'webhook'" class="flex flex-col gap-4 p-1">
        <UFormField label="WebhookUrl" name="webhookUrl" class="not-last:pb-4">
          <UInput v-model="state.webhookUrl" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="WebhookSecret" name="webhookSecret" class="not-last:pb-4">
          <UInput v-model="state.webhookSecret" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'credentials'" class="flex flex-col gap-4 p-1">
        <UFormField label="ApiToken" name="apiToken" class="not-last:pb-4">
          <UInput v-model="state.apiToken" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="NotionToken" name="notionToken" class="not-last:pb-4">
          <UInput v-model="state.notionToken" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="AnthropicApiKey" name="anthropicApiKey" class="not-last:pb-4">
          <UInput v-model="state.anthropicApiKey" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'notion'" class="flex flex-col gap-4 p-1">
        <UFormField label="NotionDatabaseId" name="notionDatabaseId" class="not-last:pb-4">
          <UInput v-model="state.notionDatabaseId" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="NotionFieldMapping" name="notionFieldMapping" class="not-last:pb-4">
          <UTextarea
            :model-value="typeof state.notionFieldMapping === 'string' ? state.notionFieldMapping : JSON.stringify(state.notionFieldMapping, null, 2)"
            @update:model-value="(val) => { try { state.notionFieldMapping = val ? JSON.parse(val) : {} } catch (e) { console.error('Invalid JSON:', e) } }"
            class="w-full font-mono text-sm"
            :rows="8"
            placeholder="Enter JSON object"
          />
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
        <UFormField label="AutoSync" name="autoSync" class="not-last:pb-4">
          <UCheckbox v-model="state.autoSync" />
        </UFormField>
        <UFormField label="PostConfirmation" name="postConfirmation" class="not-last:pb-4">
          <UCheckbox v-model="state.postConfirmation" />
        </UFormField>
        <UFormField label="EnableEmailForwarding" name="enableEmailForwarding" class="not-last:pb-4">
          <UCheckbox v-model="state.enableEmailForwarding" />
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

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="SourceMetadata" name="sourceMetadata" class="not-last:pb-4">
          <UTextarea
            :model-value="typeof state.sourceMetadata === 'string' ? state.sourceMetadata : JSON.stringify(state.sourceMetadata, null, 2)"
            @update:model-value="(val) => { try { state.sourceMetadata = val ? JSON.parse(val) : {} } catch (e) { console.error('Invalid JSON:', e) } }"
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
import type { DiscubotConfigFormProps, DiscubotConfigFormData } from '../../types'

const props = defineProps<DiscubotConfigFormProps>()
const { defaultValue, schema, collection } = useDiscubotConfigs()

// Form layout configuration
const navigationItems = [
  { label: 'Basic', value: 'basic' },
  { label: 'Email', value: 'email' },
  { label: 'Webhook', value: 'webhook' },
  { label: 'Credentials', value: 'credentials' },
  { label: 'Notion', value: 'notion' },
  { label: 'Ai', value: 'ai' }
]

const tabs = ref(true)
const activeSection = ref('basic')

// Map field names to their tab groups for error tracking
const fieldToGroup: Record<string, string> = {
  'sourceType': 'basic',
  'name': 'basic',
  'emailAddress': 'email',
  'emailSlug': 'email',
  'webhookUrl': 'webhook',
  'webhookSecret': 'webhook',
  'apiToken': 'credentials',
  'notionToken': 'credentials',
  'anthropicApiKey': 'credentials',
  'notionDatabaseId': 'notion',
  'notionFieldMapping': 'notion',
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

const state = ref<DiscubotConfigFormData & { id?: string | null }>(initialValues)

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