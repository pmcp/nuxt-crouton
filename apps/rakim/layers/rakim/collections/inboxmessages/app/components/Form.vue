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
        <UFormField label="From" name="from" class="not-last:pb-4">
          <UInput v-model="state.from" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="To" name="to" class="not-last:pb-4">
          <UInput v-model="state.to" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="Subject" name="subject" class="not-last:pb-4">
          <UInput v-model="state.subject" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div v-show="!tabs || activeSection === 'content'" class="flex flex-col gap-4 p-1">
        <UFormField label="HtmlBody" name="htmlBody" class="not-last:pb-4">
          <UTextarea v-model="state.htmlBody" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="TextBody" name="textBody" class="not-last:pb-4">
          <UTextarea v-model="state.textBody" class="w-full" size="xl" />
        </UFormField>
      </div>
      </template>

      <template #sidebar>
      <div class="flex flex-col gap-4 p-1">
        <UFormField label="ConfigId" name="configId" class="not-last:pb-4">
          <CroutonFormReferenceSelect
            v-model="state.configId"
            collection="discubotConfigs"
            label="ConfigId"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="MessageType" name="messageType" class="not-last:pb-4">
          <UInput v-model="state.messageType" class="w-full" size="xl" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="ReceivedAt" name="receivedAt" class="not-last:pb-4">
          <CroutonCalendar v-model:date="state.receivedAt" />
        </UFormField>
        <UFormField label="Read" name="read" class="not-last:pb-4">
          <UCheckbox v-model="state.read" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="ForwardedTo" name="forwardedTo" class="not-last:pb-4">
          <UInput v-model="state.forwardedTo" class="w-full" size="xl" />
        </UFormField>
        <UFormField label="ForwardedAt" name="forwardedAt" class="not-last:pb-4">
          <CroutonCalendar v-model:date="state.forwardedAt" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4 p-1">
        <UFormField label="ResendEmailId" name="resendEmailId" class="not-last:pb-4">
          <UInput v-model="state.resendEmailId" class="w-full" size="xl" />
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
import type { DiscubotInboxMessageFormProps, DiscubotInboxMessageFormData } from '../../types'

const props = defineProps<DiscubotInboxMessageFormProps>()
const { defaultValue, schema, collection } = useDiscubotInboxMessages()

// Form layout configuration
const navigationItems = [
  { label: 'Details', value: 'details' },
  { label: 'Content', value: 'content' }
]

const tabs = ref(true)
const activeSection = ref('details')

// Map field names to their tab groups for error tracking
const fieldToGroup: Record<string, string> = {
  'from': 'details',
  'to': 'details',
  'subject': 'details',
  'htmlBody': 'content',
  'textBody': 'content'
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
  if (initialValues.receivedAt) {
    initialValues.receivedAt = new Date(initialValues.receivedAt)
  }
  if (initialValues.forwardedAt) {
    initialValues.forwardedAt = new Date(initialValues.forwardedAt)
  }
}

const state = ref<DiscubotInboxMessageFormData & { id?: string | null }>(initialValues)

const handleSubmit = async () => {
  try {
    // Serialize Date objects to ISO strings for API submission
    const serializedData = { ...state.value }
    if (serializedData.receivedAt instanceof Date) {
      serializedData.receivedAt = serializedData.receivedAt.toISOString()
    }
    if (serializedData.forwardedAt instanceof Date) {
      serializedData.forwardedAt = serializedData.forwardedAt.toISOString()
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