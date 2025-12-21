<template>
  <div>
    <div
      v-if="loading"
      class="italic opacity-50 flex items-center gap-2"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="animate-spin"
      />
      Loading collection...
    </div>

    <div
      v-else-if="error"
      class="text-red-600"
    >
      {{ error }}
    </div>

    <CroutonCollectionViewer
      v-else
      :collection-name="collectionName"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const collectionName = computed(() => route.params.collection as string)

const loading = ref(true)
const error = ref<string | null>(null)

// Verify collection exists in registry
const appConfig = useAppConfig()
const croutonCollections = (appConfig.croutonCollections || {}) as Record<string, any>

onMounted(() => {
  if (!croutonCollections || !croutonCollections[collectionName.value]) {
    error.value = `Collection not found: ${collectionName.value}`
    loading.value = false
  } else {
    loading.value = false
  }
})

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})
</script>
