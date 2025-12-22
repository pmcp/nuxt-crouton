<script setup lang="ts">
import type { SchemaProject } from '../../types'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)

const { getProject, updateProject, loading } = useSchemaProjects()
const {
  state,
  setCollectionName,
  setLayerName,
  setOptions,
  loadState,
  isValid,
  validationErrors,
  reset
} = useSchemaDesigner()

const project = ref<SchemaProject | null>(null)
const saving = ref(false)
const showExport = ref(false)

// Load project on mount
onMounted(async () => {
  if (projectId.value && projectId.value !== 'new') {
    try {
      project.value = await getProject(projectId.value)

      // Load the schema state
      if (project.value) {
        loadState({
          collectionName: project.value.collectionName,
          layerName: project.value.layerName,
          fields: project.value.schema.fields || [],
          options: project.value.options
        })
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
    await updateProject(project.value.id, {
      name: project.value.name,
      layerName: state.value.layerName,
      collectionName: state.value.collectionName,
      schema: state.value,
      options: state.value.options
    })
  } catch (e) {
    console.error('Failed to save project:', e)
  } finally {
    saving.value = false
  }
}

// Debounced auto-save
const debouncedSave = useDebounceFn(save, 2000)

// Watch for changes and auto-save
watch(state, () => {
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
          <p v-if="project" class="text-xs text-[var(--ui-text-muted)]">
            {{ state.layerName }}/{{ state.collectionName }}
          </p>
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
    <div v-else class="flex-1 flex overflow-hidden">
      <!-- Left: Field Catalog -->
      <aside class="w-64 border-r border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-y-auto">
        <CroutonSchemaDesignerFieldCatalog />
      </aside>

      <!-- Center: Schema Builder -->
      <main class="flex-1 overflow-y-auto bg-[var(--ui-bg)]">
        <CroutonSchemaDesignerSchemaBuilder />
      </main>

      <!-- Right: Preview Panel (50% width) -->
      <aside class="w-1/2 border-l border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden flex flex-col">
        <CroutonSchemaDesignerPreviewPanel />
      </aside>
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
