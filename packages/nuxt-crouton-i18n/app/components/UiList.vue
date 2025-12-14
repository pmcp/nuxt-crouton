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
        <CroutonI18nDisplay :translations="row.values" />
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
const columns = [
  { accessorKey: 'keyPath', header: 'Key Path' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'values', header: 'Translations' },
  { accessorKey: 'description', header: 'Description' }
]

// Fetch translations using Crouton's collection query
const { items, pending, error, refresh } = await useCollectionQuery('translationsUi')
</script>
