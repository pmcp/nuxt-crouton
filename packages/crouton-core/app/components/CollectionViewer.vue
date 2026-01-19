<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Header with title and layout switcher - fixed height -->
    <div class="px-6 py-4 flex items-center justify-between shrink-0">
      <h2 class="text-xl font-semibold">
        {{ camelToTitleCase(collectionName) }}
      </h2>
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

    <!-- Content area - fills remaining space -->
    <div class="flex-1 min-h-0">
      <div
        v-if="componentError"
        class="text-red-600 p-4 bg-red-50 rounded"
      >
        Unable to load collection component: {{ componentError }}
      </div>

      <component
        :is="componentName"
        v-else-if="componentName"
        :layout="currentLayout"
        class="h-full"
      />

      <div
        v-else
        class="text-gray-500"
      >
        Component not found for collection: {{ collectionName }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  collectionName: string
  defaultLayout?: 'table' | 'list' | 'grid' | 'cards' | 'tree' | 'kanban'
}

const props = withDefaults(defineProps<Props>(), {
  defaultLayout: 'table'
})

const componentError = ref<string | null>(null)
const currentLayout = ref(props.defaultLayout)

// Use composable for formatting
const { camelToTitleCase, toPascalCase } = useFormatCollections()

// Get collection config to check hierarchy support
const { getConfig } = useCollections()
const collectionConfig = computed(() => getConfig(props.collectionName))

// All available layout options
const allLayoutOptions = [
  { value: 'table' as const, icon: 'i-lucide-table' },
  { value: 'list' as const, icon: 'i-lucide-list' },
  { value: 'grid' as const, icon: 'i-lucide-grid-3x3' },
  { value: 'cards' as const, icon: 'i-lucide-layout-grid' },
  { value: 'tree' as const, icon: 'i-lucide-git-branch' },
  { value: 'kanban' as const, icon: 'i-lucide-columns-3' }
]

// Filter layout options - show tree if hierarchy OR sortable is enabled
// Kanban is always available as it auto-detects groupable fields
const layoutOptions = computed(() => {
  const config = collectionConfig.value
  const supportsTree = config?.hierarchy?.enabled || config?.sortable?.enabled

  let options = allLayoutOptions

  // Hide tree if not supported
  if (!supportsTree) {
    options = options.filter(o => o.value !== 'tree')
  }

  return options
})

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
