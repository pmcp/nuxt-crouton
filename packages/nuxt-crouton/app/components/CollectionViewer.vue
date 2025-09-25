<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">{{ formatCollectionName(collectionName) }}</h2>

    <div v-if="componentError" class="text-red-600 p-4 bg-red-50 rounded">
      Unable to load collection component: {{ componentError }}
    </div>

    <component
      :is="componentName"
      v-else-if="componentName"
    />

    <div v-else class="text-gray-500">
      Component not found for collection: {{ collectionName }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  collectionName: string
}

const props = defineProps<Props>()
const componentError = ref<string | null>(null)

// Convert collection name to component name
// e.g., translationsUi -> TranslationsUiList
// e.g., teamTranslations -> TeamTranslationsList
// e.g., posProducts -> PosProductsList
const componentName = computed(() => {
  if (!props.collectionName) return null

  // Capitalize first letter and append 'List'
  const pascalCase = props.collectionName
    .charAt(0).toUpperCase() +
    props.collectionName.slice(1) +
    'List'

  return pascalCase
})

// Format collection name for display
const formatCollectionName = (name: string) => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// Try to resolve the component
onMounted(async () => {
  if (!componentName.value) return

  try {
    // Check if component exists in the global scope
    const globalComponents = getCurrentInstance()?.appContext.components
    if (!globalComponents || !globalComponents[componentName.value]) {
      // Component might be auto-imported but not registered yet
      // This is fine, Vue will handle it
      console.debug(`Component ${componentName.value} will be resolved by auto-import`)
    }
  } catch (err) {
    componentError.value = err instanceof Error ? err.message : String(err)
  }
})
</script>