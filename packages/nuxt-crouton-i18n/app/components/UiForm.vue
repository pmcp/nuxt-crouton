<template>
  <div>
    <!-- DELETE CONFIRMATION -->
    <div
      v-if="action === 'delete'"
      class="space-y-6 p-6"
    >
      <div class="text-center space-y-4">
        <!-- Warning Icon -->
        <div class="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <UIcon name="i-lucide-alert-triangle" class="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>

        <!-- Title -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Remove Translation Override?
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This will permanently delete your team's custom translation and revert to using the system translation.
          </p>
        </div>

        <!-- Translation Preview -->
        <div v-if="activeItem" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
          <div class="text-xs text-blue-700 dark:text-blue-300 font-mono mb-2">
            {{ activeItem.keyPath }}
          </div>
          <TranslationsDisplay :translations="activeItem.values" />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 w-full justify-center">
        <UButton
          color="neutral"
          variant="soft"
          @click="close()"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          :loading="loading !== 'notLoading'"
          :disabled="loading !== 'notLoading'"
          @click="handleDelete"
          icon="i-lucide-trash-2"
        >
          Remove Override
        </UButton>
      </div>
    </div>

    <!-- CREATE/UPDATE FORM -->
    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="space-y-4 p-6"
      @submit="handleSubmit"
    >
      <!-- Key Path -->
      <UFormField label="Key Path" name="keyPath" required>
        <UInput
          v-model="state.keyPath"
          placeholder="e.g., table.search"
          :disabled="!!activeItem?.id"
        />
      </UFormField>

      <!-- Category -->
      <UFormField label="Category" name="category" required>
        <UInput
          v-model="state.category"
          placeholder="e.g., table"
          :disabled="!!activeItem?.id"
        />
      </UFormField>

      <!-- Translations Input -->
      <UFormField label="Translations" name="values" required>
        <TranslationsInput
          v-model="state.values"
          :locales="['en', 'nl', 'fr']"
        />
      </UFormField>

      <!-- Description -->
      <UFormField label="Description" name="description">
        <UTextarea
          v-model="state.description"
          placeholder="Optional description"
          :rows="3"
        />
      </UFormField>

      <!-- Form Actions -->
      <div class="flex gap-3 justify-end pt-4">
        <UButton
          color="neutral"
          variant="soft"
          @click="close()"
        >
          Cancel
        </UButton>
        <UButton
          type="submit"
          color="primary"
          :loading="loading !== 'notLoading'"
          :disabled="loading !== 'notLoading'"
        >
          {{ action === 'create' ? 'Create' : 'Update' }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { translationsUiSchema, TRANSLATIONS_UI_DEFAULTS } from '../composables/useTranslationsUi'

const props = defineProps<{
  action: 'create' | 'update' | 'delete'
  activeItem?: any
  loading?: string
  collection: string
}>()

const { send, close } = useCrouton()

// Form state
const state = ref({
  ...TRANSLATIONS_UI_DEFAULTS,
  ...(props.activeItem || {})
})

// Update state when activeItem changes
watch(() => props.activeItem, (newItem) => {
  if (newItem) {
    state.value = {
      ...TRANSLATIONS_UI_DEFAULTS,
      ...newItem
    }
  }
}, { immediate: true })

const schema = translationsUiSchema

const handleSubmit = () => {
  send(props.action, props.collection, state.value)
}

const handleDelete = () => {
  send(props.action, props.collection, [props.activeItem?.id])
}
</script>
