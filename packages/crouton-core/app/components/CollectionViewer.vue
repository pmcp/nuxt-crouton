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
    <div class="flex-1 min-h-0 flex">
      <!-- Left: collection layout (shrinks when inline editor is open) -->
      <div
        :class="showInlineEditor ? 'w-2/5 border-r border-default' : 'w-full'"
        class="transition-all duration-200 min-h-0 overflow-auto"
      >
        <div
          v-if="componentError"
          class="text-red-600 p-4 bg-red-50 rounded"
        >
          {{ t('collection.componentError', { error: componentError }) }}
        </div>

        <!-- Workspace layout: render CroutonWorkspace directly -->
        <CroutonWorkspace
          v-else-if="currentLayout === 'workspace'"
          :collection="collectionName"
          class="h-full"
        />

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
          {{ t('collection.componentNotFound', { collection: collectionName }) }}
        </div>
      </div>

      <!-- Right: inline editor panel -->
      <div v-if="showInlineEditor" class="flex-1 min-h-0 overflow-auto">
        <CroutonWorkspaceEditor
          :key="inlineSessionKey"
          :collection="collectionName"
          :item-id="inlineItemId"
          @save="handleInlineSave"
          @delete="handleInlineDelete"
          @cancel="handleInlineCancel"
        />
      </div>

      <!-- Empty state when inline mode is active but no item selected -->
      <div
        v-else-if="isInlineMode"
        class="flex-1 flex items-center justify-center text-muted"
      >
        <div class="text-center">
          <UIcon name="i-lucide-mouse-pointer-click" class="size-12 mb-3 opacity-30" />
          <p class="text-sm">{{ t('collection.selectItem') || 'Select an item to edit' }}</p>
          <p class="text-xs text-muted mt-1">
            {{ t('collection.orPressN') || 'or press N to create new' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CroutonItemAction } from '../types/table'
import { CROUTON_ITEM_ACTION_KEY } from '../types/table'

interface Props {
  collectionName: string
  defaultLayout?: 'table' | 'list' | 'grid' | 'cards' | 'tree' | 'kanban' | 'workspace'
}

const props = withDefaults(defineProps<Props>(), {
  defaultLayout: 'table'
})

const { t } = useT()
const componentError = ref<string | null>(null)
const currentLayout = ref(props.defaultLayout)

// Use composable for formatting
const { camelToTitleCase, toPascalCase } = useFormatCollections()

// Get collection config to check hierarchy support and container type
const { getConfig } = useCollections()
const collectionConfig = computed(() => getConfig(props.collectionName))

// Resolve container type from config
const container = computed(() =>
  collectionConfig.value?.container ?? 'slideover'
)
const isInlineMode = computed(() => container.value === 'inline')

// Inline editor state
const inlineItemId = ref<string | null>(null)
const inlineMode = ref<'view' | 'create' | 'edit'>('view')
const inlineSessionKey = ref(0)
const showInlineEditor = computed(() =>
  isInlineMode.value && (inlineMode.value === 'create' || (inlineMode.value === 'edit' && !!inlineItemId.value))
)

// Provide the item action handler for all child components
const crouton = useCrouton()

const handleItemAction: CroutonItemAction = (action, ids = [], initialData?) => {
  if (isInlineMode.value && action !== 'delete') {
    // Inline mode: show editor panel
    if (action === 'create') {
      inlineItemId.value = null
      inlineMode.value = 'create'
      inlineSessionKey.value++
    } else if (action === 'update' || action === 'view') {
      inlineItemId.value = ids[0] ?? null
      inlineMode.value = action === 'view' ? 'view' : 'edit'
      inlineSessionKey.value++
    }
  } else {
    // Modal/slideover/dialog mode (or delete which always uses overlay)
    const effectiveContainer = action === 'delete' ? 'modal' : container.value === 'inline' ? 'slideover' : container.value
    crouton.open(action, props.collectionName, ids, effectiveContainer as any, initialData)
  }
}

provide(CROUTON_ITEM_ACTION_KEY, handleItemAction)

// Inline editor event handlers
function handleInlineSave(savedItem: any) {
  if (savedItem?.id) {
    inlineItemId.value = savedItem.id
    inlineMode.value = 'edit'
  }
  inlineSessionKey.value++
}

function handleInlineDelete() {
  inlineItemId.value = null
  inlineMode.value = 'view'
}

function handleInlineCancel() {
  if (inlineMode.value === 'create') {
    inlineMode.value = 'view'
    inlineItemId.value = null
  }
}

// All available layout options
const allLayoutOptions = [
  { value: 'table' as const, icon: 'i-lucide-table' },
  { value: 'list' as const, icon: 'i-lucide-list' },
  { value: 'grid' as const, icon: 'i-lucide-grid-3x3' },
  { value: 'cards' as const, icon: 'i-lucide-layout-grid' },
  { value: 'tree' as const, icon: 'i-lucide-git-branch' },
  { value: 'kanban' as const, icon: 'i-lucide-columns-3' },
  { value: 'workspace' as const, icon: 'i-lucide-panel-left' }
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
