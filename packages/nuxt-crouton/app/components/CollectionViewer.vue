<template>
  <div class="px-6 py-4 flex items-center justify-between">
    <h2 class="text-xl font-semibold">{{ camelToTitleCase(collectionName) }}</h2>
    <!-- Layout Switcher -->
    <div class="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <UButton
        v-for="layoutOption in layoutOptions"
        :key="layoutOption.value"
        :icon="layoutOption.icon"
        :color="currentLayout === layoutOption.value ? 'primary' : 'neutral'"
        :variant="currentLayout === layoutOption.value ? 'solid' : 'ghost'"
        size="sm"
        @click="currentLayout = layoutOption.value"
      />
    </div>
  </div>

  <div v-if="componentError" class="text-red-600 p-4 bg-red-50 rounded">
    Unable to load collection component: {{ componentError }}
  </div>

  <component
    :is="componentName"
    v-else-if="componentName"
    :layout="currentLayout"
  />

  <div v-else class="text-gray-500">
    Component not found for collection: {{ collectionName }}
  </div>

</template>

<script setup lang="ts">
interface Props {
  collectionName: string
  defaultLayout?: 'table' | 'list' | 'grid' | 'cards' | 'tree'
}

const props = withDefaults(defineProps<Props>(), {
  defaultLayout: 'table'
})

const componentError = ref<string | null>(null)
const currentLayout = ref(props.defaultLayout)

// Use composable for formatting
const { camelToTitleCase, toPascalCase } = useFormatCollections()

// Layout options for switcher
const layoutOptions = [
  { value: 'table', icon: 'i-lucide-table' },
  { value: 'list', icon: 'i-lucide-list' },
  { value: 'grid', icon: 'i-lucide-grid-3x3' },
  { value: 'cards', icon: 'i-lucide-layout-grid' },
  { value: 'tree', icon: 'i-lucide-git-branch' }
] as const

// Convert collection name to component name
// e.g., translationsUi -> TranslationsUiList
// e.g., teamTranslations -> TeamTranslationsList
// e.g., posProducts -> PosProductsList
const componentName = computed(() => {
  if (!props.collectionName) return null
  return `${toPascalCase(props.collectionName)}List`
})

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