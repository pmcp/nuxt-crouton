<script setup lang="ts">
import type { CroutonCollection } from '../composables/useCroutonCollections'

const { collections, loading, error, fetchCollections } = useCroutonCollections()

const searchQuery = ref('')
const selectedCollection = ref<CroutonCollection | null>(null)
const showDetailModal = ref(false)

const filteredCollections = computed(() => {
  if (!searchQuery.value) return collections.value

  const query = searchQuery.value.toLowerCase()
  return collections.value.filter(c =>
    c.name?.toLowerCase().includes(query) ||
    c.layer?.toLowerCase().includes(query) ||
    c.apiPath?.toLowerCase().includes(query)
  )
})

const viewDetails = (collection: CroutonCollection) => {
  selectedCollection.value = collection
  showDetailModal.value = true
}

onMounted(() => {
  fetchCollections()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
    <div class="container mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Crouton Collections
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Manage and inspect your CRUD collections
        </p>
      </div>

      <div class="mb-6">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          size="lg"
          placeholder="Search collections..."
        />
      </div>

      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p class="text-gray-600 dark:text-gray-400">Loading collections...</p>
        </div>
      </div>

      <UAlert
        v-else-if="error"
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="soft"
        title="Failed to load collections"
        :description="error"
      />

      <div v-else-if="filteredCollections.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">📦</div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No collections found
        </h3>
        <p class="text-gray-600 dark:text-gray-400">
          {{ searchQuery ? 'Try adjusting your search query' : 'Add collections to your app.config.ts to get started' }}
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CollectionCard
          v-for="collection in filteredCollections"
          :key="collection.key"
          :collection="collection"
          @view-details="viewDetails"
        />
      </div>

      <CollectionDetailModal
        v-model="showDetailModal"
        :collection="selectedCollection"
      />
    </div>
  </div>
</template>
