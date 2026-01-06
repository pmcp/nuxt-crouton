<script setup lang="ts">
import type { SchemaProject, CollectionSchema } from '../../types'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)

const { getProject, updateProject, loading } = useSchemaProjects()
const {
  state,
  collections,
  multiState,
  loadState,
  loadMultiState,
  isValid,
  validationErrors,
  reset
} = useSchemaDesigner()

// Display info for header
const collectionCount = computed(() => collections.value.length)
const { isFieldFromAI } = useSchemaAI()

const project = ref<SchemaProject | null>(null)
const saving = ref(false)
const showExport = ref(false)

// Right panel view toggle
type RightPanelView = 'preview' | 'code'
const rightPanelView = ref<RightPanelView>('preview')

// Load project on mount
onMounted(async () => {
  if (projectId.value && projectId.value !== 'new') {
    try {
      project.value = await getProject(projectId.value)

      // Load the schema state
      if (project.value) {
        // Use multi-collection loading if collections available
        if (project.value.collections && project.value.collections.length > 0) {
          loadMultiState(project.value.layerName, project.value.collections as CollectionSchema[])
        } else {
          // Fallback to legacy single-collection loading
          loadState({
            collectionName: project.value.collectionName,
            layerName: project.value.layerName,
            fields: project.value.schema.fields || [],
            options: project.value.options,
            cardTemplate: project.value.schema.cardTemplate
          })
        }
      }
    } catch (e) {
      console.error('Failed to load project:', e)
    }
  }
})

// Auto-save function
async function save() {
  if (!project.value || !isValid.value) return

  saving.value = true
  try {
    // Save using multi-collection format
    await updateProject(project.value.id, {
      name: project.value.name,
      layerName: multiState.value.layerName,
      collections: multiState.value.collections
    })
  } catch (e) {
    console.error('Failed to save project:', e)
  } finally {
    saving.value = false
  }
}

// Debounced auto-save
const debouncedSave = useDebounceFn(save, 2000)

// Watch for changes and auto-save (watch multiState for multi-collection support)
watch(multiState, () => {
  if (project.value) {
    debouncedSave()
  }
}, { deep: true })
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-[var(--ui-border)] px-4 py-3 flex items-center justify-between bg-[var(--ui-bg)]">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          to="/schema-designer"
        />
        <div>
          <h1 class="font-semibold">{{ project?.name || 'Loading...' }}</h1>
          <div v-if="project" class="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-layers" class="size-3" />
              {{ state.layerName }}
            </span>
            <span class="text-[var(--ui-border)]">|</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-database" class="size-3" />
              {{ collectionCount }} {{ collectionCount === 1 ? 'collection' : 'collections' }}
            </span>
          </div>
        </div>
        <UBadge v-if="saving" variant="soft" color="warning" size="xs">
          Saving...
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-trash-2"
          @click="reset"
        >
          Reset
        </UButton>
        <UButton
          icon="i-lucide-download"
          :disabled="!isValid"
          @click="showExport = true"
        >
          Export Schema
        </UButton>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
    </div>

    <!-- Main Content -->
    <div v-if="!loading" class="flex-1 flex overflow-hidden">
      <!-- Left: AI Chat Panel -->
      <CroutonSchemaDesignerAIChatPanel />

      <!-- Right: Collection Tabs + Editor -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Collection Tabs -->
        <CroutonSchemaDesignerCollectionTabs />

        <!-- Editor Area -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Field Catalog -->
          <aside class="w-64 border-r border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-y-auto">
            <CroutonSchemaDesignerFieldCatalog />
          </aside>

          <!-- Center: Schema Builder -->
          <main class="flex-1 overflow-y-auto bg-[var(--ui-bg)]">
            <CroutonSchemaDesignerSchemaBuilder :is-field-from-ai="isFieldFromAI" />
          </main>

          <!-- Right: Preview/Code Panel (50% width) -->
          <aside class="w-1/2 border-l border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden flex flex-col">
            <!-- Panel Tabs -->
            <div class="flex border-b border-[var(--ui-border)] bg-[var(--ui-bg)]">
              <button
                :class="[
                  'px-4 py-2 text-sm font-medium transition-colors',
                  rightPanelView === 'preview'
                    ? 'text-[var(--ui-primary)] border-b-2 border-[var(--ui-primary)]'
                    : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                ]"
                @click="rightPanelView = 'preview'"
              >
                <span class="flex items-center gap-2">
                  <UIcon name="i-lucide-eye" />
                  Preview
                </span>
              </button>
              <button
                :class="[
                  'px-4 py-2 text-sm font-medium transition-colors',
                  rightPanelView === 'code'
                    ? 'text-[var(--ui-primary)] border-b-2 border-[var(--ui-primary)]'
                    : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                ]"
                @click="rightPanelView = 'code'"
              >
                <span class="flex items-center gap-2">
                  <UIcon name="i-lucide-code" />
                  Card Template
                </span>
              </button>
            </div>

            <!-- Panel Content -->
            <div class="flex-1 overflow-hidden">
              <CroutonSchemaDesignerPreviewPanel v-if="rightPanelView === 'preview'" />
              <CroutonSchemaDesignerCodeEditor v-else />
            </div>
          </aside>
        </div>
      </div>
    </div>

    <!-- Validation Errors -->
    <div
      v-if="validationErrors.length > 0"
      class="border-t border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2"
    >
      <div class="flex items-center gap-2 text-sm text-[var(--ui-text-muted)]">
        <UIcon name="i-lucide-alert-circle" class="text-amber-500" />
        <span>{{ validationErrors[0] }}</span>
        <span v-if="validationErrors.length > 1" class="text-xs">
          (+{{ validationErrors.length - 1 }} more)
        </span>
      </div>
    </div>

    <!-- Export Modal -->
    <CroutonSchemaDesignerExportPanel v-model="showExport" />
  </div>
</template>
