<template>
  <div class="space-y-6">
    <CroutonTable
      collection="translationsUi"
      :columns="columns"
      :rows="items"
    >
      <template #header>
        <CroutonTableHeader
          title="UI Translation Overrides"
          collection="translationsUi"
          :create-button="true"
        />
      </template>

      <!-- Custom cell for translations values -->
      <template #values-data="{ row }">
        <TranslationsDisplay :translations="row.values" />
      </template>

      <!-- Custom cell for description -->
      <template #description-data="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ row.description || '-' }}
        </span>
      </template>
    </CroutonTable>

    <!-- Crouton Form for modals -->
    <CroutonForm />
  </div>
</template>

<script setup lang="ts">
import { TRANSLATIONS_UI_COLUMNS } from '../composables/useTranslationsUi'

const columns = TRANSLATIONS_UI_COLUMNS

// Fetch translations using Crouton's collection query
const { items, pending, error, refresh } = await useCollectionQuery('translationsUi')

// Log for debugging
console.log('[TranslationsUiList] Loaded:', {
  itemCount: items.value.length,
  pending: pending.value,
  error: error.value
})
</script>
