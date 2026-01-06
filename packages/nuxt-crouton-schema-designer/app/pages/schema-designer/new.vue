<script setup lang="ts">
const router = useRouter()
const { createProject, loading } = useSchemaProjects()
const {
  state,
  multiState,
  isValid,
  validationErrors,
  reset
} = useSchemaDesigner()
const { isFieldFromAI } = useSchemaAI()

const projectName = ref('')
const creating = ref(false)
const showExport = ref(false)
const showSaveDialog = ref(false)

// Right panel view toggle
type RightPanelView = 'preview' | 'code'
const rightPanelView = ref<RightPanelView>('preview')

// Reset designer state on mount
onMounted(() => {
  reset()
})

async function handleSave() {
  if (!projectName.value || !multiState.value.layerName || multiState.value.collections.length === 0) {
    return
  }

  creating.value = true
  try {
    // Use multi-collection format for new projects
    const project = await createProject({
      name: projectName.value,
      layerName: multiState.value.layerName,
      collections: multiState.value.collections
    })

    showSaveDialog.value = false
    // Navigate to the editor
    router.push(`/schema-designer/${project.id}`)
  } catch (e) {
    console.error('Failed to create project:', e)
  } finally {
    creating.value = false
  }
}

function openSaveDialog() {
  // Pre-fill project name if empty
  if (!projectName.value && state.value.collectionName) {
    projectName.value = state.value.collectionName.charAt(0).toUpperCase()
      + state.value.collectionName.slice(1)
      + ' Schema'
  }
  showSaveDialog.value = true
}
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
          <h1 class="font-semibold">New Schema</h1>
          <p class="text-xs text-[var(--ui-text-muted)]">
            {{ state.layerName || 'layer' }}/{{ state.collectionName || 'collection' }}
          </p>
        </div>
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
          variant="outline"
          icon="i-lucide-download"
          :disabled="!isValid"
          @click="showExport = true"
        >
          Export
        </UButton>
        <UButton
          icon="i-lucide-save"
          :disabled="!isValid"
          @click="openSaveDialog"
        >
          Save Project
        </UButton>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: AI Chat Panel -->
      <CroutonSchemaDesignerAIChatPanel />

      <!-- Field Catalog -->
      <aside class="w-64 border-r border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-y-auto">
        <CroutonSchemaDesignerFieldCatalog />
      </aside>

      <!-- Center: Schema Builder -->
      <main class="flex-1 overflow-y-auto bg-[var(--ui-bg)]">
        <CroutonSchemaDesignerSchemaBuilder :is-field-from-ai="isFieldFromAI" />
      </main>

      <!-- Right: Preview/Code Panel -->
      <aside class="w-[40%] border-l border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden flex flex-col">
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

    <!-- Save Project Dialog -->
    <UModal v-model="showSaveDialog">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Save Project</h3>

          <div class="space-y-4">
            <UFormField label="Project Name" required>
              <UInput
                v-model="projectName"
                placeholder="e.g., E-commerce Products"
                autofocus
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-[var(--ui-text-muted)]">Layer:</span>
                <span class="ml-2 font-medium">{{ state.layerName }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Collections:</span>
                <span class="ml-2 font-medium">{{ multiState.collections.length }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Active:</span>
                <span class="ml-2 font-medium">{{ state.collectionName }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Fields:</span>
                <span class="ml-2 font-medium">{{ state.fields.length }}</span>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" color="neutral" @click="close">
              Cancel
            </UButton>
            <UButton
              :loading="creating"
              :disabled="!projectName"
              @click="handleSave"
            >
              Save & Continue Editing
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Export Modal -->
    <CroutonSchemaDesignerExportPanel v-model="showExport" />
  </div>
</template>
