<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-4">Collections</h1>
    <div v-if="!collectionNames.length" class="text-gray-500">
      No collections found. Run the generator to create collections.
    </div>
    <ul v-else class="space-y-2">
      <li v-for="name in collectionNames" :key="name">
        <NuxtLink
          :to="`/dashboard/${route.params.team}/crouton/${name}`"
          class="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {{ formatCollectionName(name) }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const appConfig = useAppConfig()

// Get collection names from registry
const collectionNames = computed(() => {
  const croutonCollections = appConfig.croutonCollections || {}
  return Object.keys(croutonCollections)
})

// Format collection name for display (e.g., translationsUi -> Translations UI)
const formatCollectionName = (name: string) => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

definePageMeta({
  middleware: 'auth',
})
</script>