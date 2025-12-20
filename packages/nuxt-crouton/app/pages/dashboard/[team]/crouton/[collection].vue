<template>
  <div class="px-6 pt-6">
    <NuxtLink
      :to="`/dashboard/${route.params.team}/crouton`"
      class="hover:underline mb-4 inline-block"
    >
      ← Back to collections
    </NuxtLink>
  </div>

  <div
    v-if="loading"
    class="m-6 italic opacity-50 flex items-center text-white gap-1"
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
  middleware: 'auth'
})
</script>
