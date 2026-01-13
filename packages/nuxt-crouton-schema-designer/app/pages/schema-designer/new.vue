<script setup lang="ts">
import type { SchemaProjectWithPackages } from '../../types/package-manifest'

const router = useRouter()
const { createProject, loading } = useSchemaProjects()
const {
  state,
  multiState,
  collections,
  isValid,
  validationErrors,
  reset
} = useSchemaDesigner()
const { isFieldFromAI } = useSchemaAI()

// Project composer for package-aware mode
const {
  projectName,
  baseLayerName,
  packages,
  packageManifests,
  hasPackages,
  customCollections,
  hasCustomCollections,
  isValid: composerIsValid,
  validationErrors: composerValidationErrors,
  toProject,
  reset: resetComposer
} = useProjectComposer()

// Export generator
const { generateExportBundle } = useExportGenerator()

// Wizard step state
type WizardStep = 'setup' | 'blocks' | 'configure' | 'export'
const currentStep = ref<WizardStep>('setup')

const steps: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'setup', label: 'Project Setup', icon: 'i-lucide-folder' },
  { id: 'blocks', label: 'Building Blocks', icon: 'i-lucide-blocks' },
  { id: 'configure', label: 'Configure', icon: 'i-lucide-settings' },
  { id: 'export', label: 'Review & Export', icon: 'i-lucide-download' }
]

const currentStepIndex = computed(() => steps.findIndex(s => s.id === currentStep.value))

// Step validation
const stepValidation = computed(() => ({
  setup: projectName.value.trim() !== '' && baseLayerName.value.trim() !== '',
  blocks: hasPackages.value || hasCustomCollections.value,
  configure: composerIsValid.value,
  export: composerIsValid.value
}))

function canProceedToStep(step: WizardStep): boolean {
  const stepIndex = steps.findIndex(s => s.id === step)

  // Can always go back
  if (stepIndex < currentStepIndex.value) return true

  // Check all previous steps are valid
  for (let i = 0; i < stepIndex; i++) {
    const prevStep = steps[i]
    if (prevStep && !stepValidation.value[prevStep.id]) {
      return false
    }
  }
  return true
}

function goToStep(step: WizardStep) {
  if (canProceedToStep(step)) {
    currentStep.value = step
  }
}

function nextStep() {
  const nextIndex = currentStepIndex.value + 1
  if (nextIndex < steps.length) {
    const nextStepObj = steps[nextIndex]
    if (nextStepObj) {
      goToStep(nextStepObj.id)
    }
  }
}

function prevStep() {
  const prevIndex = currentStepIndex.value - 1
  if (prevIndex >= 0) {
    const prevStepObj = steps[prevIndex]
    if (prevStepObj) {
      goToStep(prevStepObj.id)
    }
  }
}

// Export modal state
const showExport = ref(false)
const showSaveDialog = ref(false)
const creating = ref(false)

// Display info for header
const collectionCount = computed(() => {
  const packageCollections = packages.value.reduce((acc, pkg) => {
    const manifest = packageManifests.value.get(pkg.packageId)
    return acc + (manifest?.collections.length || 0)
  }, 0)
  return packageCollections + customCollections.value.length
})

// Reset designer state on mount
onMounted(() => {
  resetComposer()
  reset()
})

async function handleSave() {
  if (!projectName.value || !composerIsValid.value) {
    return
  }

  creating.value = true
  try {
    const projectData = toProject()

    // Use multi-collection format for new projects
    const project = await createProject({
      name: projectData.name,
      layerName: projectData.baseLayerName,
      collections: projectData.collections,
      // Include packages in the project data
      packages: projectData.packages
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
  showSaveDialog.value = true
}

function handleReset() {
  resetComposer()
  reset()
  currentStep.value = 'setup'
}

// Right panel view toggle for configure step
type RightPanelView = 'preview' | 'code'
const rightPanelView = ref<RightPanelView>('preview')
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
          <h1 class="font-semibold">{{ projectName || 'New Project' }}</h1>
          <div class="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-layers" class="size-3" />
              {{ baseLayerName || 'layer' }}
            </span>
            <span class="text-[var(--ui-border)]">|</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-package" class="size-3" />
              {{ packages.length }} {{ packages.length === 1 ? 'package' : 'packages' }}
            </span>
            <span class="text-[var(--ui-border)]">|</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-database" class="size-3" />
              {{ customCollections.length }} custom
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-trash-2"
          @click="handleReset"
        >
          Reset
        </UButton>
        <UButton
          variant="outline"
          icon="i-lucide-download"
          :disabled="!composerIsValid"
          @click="showExport = true"
        >
          Export
        </UButton>
        <UButton
          icon="i-lucide-save"
          :disabled="!composerIsValid"
          @click="openSaveDialog"
        >
          Save Project
        </UButton>
      </div>
    </header>

    <!-- Step Navigation -->
    <div class="px-6 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]">
      <div class="flex items-center justify-center gap-2">
        <template v-for="(step, index) in steps" :key="step.id">
          <!-- Step Button -->
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            :class="[
              currentStep === step.id
                ? 'bg-[var(--ui-primary)] text-white'
                : canProceedToStep(step.id)
                  ? 'bg-[var(--ui-bg-elevated)] hover:bg-[var(--ui-bg-accented)] cursor-pointer'
                  : 'bg-[var(--ui-bg-muted)] text-[var(--ui-text-muted)] cursor-not-allowed'
            ]"
            :disabled="!canProceedToStep(step.id)"
            @click="goToStep(step.id)"
          >
            <UIcon
              :name="stepValidation[step.id] && currentStep !== step.id ? 'i-lucide-check-circle' : step.icon"
              :class="[
                stepValidation[step.id] && currentStep !== step.id ? 'text-[var(--ui-success)]' : ''
              ]"
            />
            <span class="text-sm font-medium">{{ step.label }}</span>
          </button>

          <!-- Connector -->
          <UIcon
            v-if="index < steps.length - 1"
            name="i-lucide-chevron-right"
            class="text-[var(--ui-text-muted)]"
          />
        </template>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Step 1: Project Setup -->
      <div
        v-if="currentStep === 'setup'"
        class="flex-1 flex items-center justify-center bg-[var(--ui-bg-muted)]"
      >
        <div class="w-full max-w-md p-8">
          <div class="text-center mb-8">
            <UIcon name="i-lucide-folder-plus" class="text-5xl text-[var(--ui-primary)] mb-4" />
            <h2 class="text-2xl font-bold mb-2">Create Your Project</h2>
            <p class="text-[var(--ui-text-muted)]">
              Set up the basic details for your new Crouton project
            </p>
          </div>

          <div class="space-y-6">
            <UFormField label="Project Name" required>
              <UInput
                v-model="projectName"
                placeholder="My Awesome App"
                size="lg"
                autofocus
              />
            </UFormField>

            <UFormField
              label="Base Layer Name"
              required
              hint="Used for custom collections (e.g., 'app' creates appProducts table)"
            >
              <UInput
                v-model="baseLayerName"
                placeholder="app"
                size="lg"
              />
            </UFormField>
          </div>

          <div class="mt-8 flex justify-end">
            <UButton
              size="lg"
              :disabled="!stepValidation.setup"
              @click="nextStep"
            >
              Continue
              <template #trailing>
                <UIcon name="i-lucide-arrow-right" />
              </template>
            </UButton>
          </div>
        </div>
      </div>

      <!-- Step 2: Building Blocks -->
      <div
        v-else-if="currentStep === 'blocks'"
        class="flex-1 flex flex-col overflow-hidden"
      >
        <CroutonSchemaDesignerProjectComposer
          class="flex-1"
          @save="openSaveDialog"
          @export="showExport = true"
        />
      </div>

      <!-- Step 3: Configure -->
      <div
        v-else-if="currentStep === 'configure'"
        class="flex-1 flex overflow-hidden"
      >
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
        </div>
      </div>

      <!-- Step 4: Review & Export -->
      <div
        v-else-if="currentStep === 'export'"
        class="flex-1 flex overflow-hidden"
      >
        <CroutonSchemaDesignerExportReview
          @save="openSaveDialog"
          @export="showExport = true"
        />
      </div>
    </div>

    <!-- Step Navigation Footer -->
    <div class="border-t border-[var(--ui-border)] px-4 py-3 bg-[var(--ui-bg)] flex items-center justify-between">
      <!-- Validation Status -->
      <div class="flex items-center gap-2">
        <template v-if="composerValidationErrors.length > 0">
          <UIcon name="i-lucide-alert-circle" class="text-amber-500" />
          <span class="text-sm text-[var(--ui-text-muted)]">{{ composerValidationErrors[0] }}</span>
          <span v-if="composerValidationErrors.length > 1" class="text-xs text-[var(--ui-text-muted)]">
            (+{{ composerValidationErrors.length - 1 }} more)
          </span>
        </template>
        <template v-else-if="composerIsValid">
          <UIcon name="i-lucide-check-circle" class="text-[var(--ui-success)]" />
          <span class="text-sm text-[var(--ui-success)]">Ready to export</span>
        </template>
      </div>

      <!-- Step Buttons -->
      <div class="flex items-center gap-2">
        <UButton
          v-if="currentStepIndex > 0"
          variant="outline"
          @click="prevStep"
        >
          <template #leading>
            <UIcon name="i-lucide-arrow-left" />
          </template>
          Back
        </UButton>
        <UButton
          v-if="currentStepIndex < steps.length - 1"
          :disabled="!stepValidation[currentStep]"
          @click="nextStep"
        >
          Continue
          <template #trailing>
            <UIcon name="i-lucide-arrow-right" />
          </template>
        </UButton>
        <template v-else>
          <UButton
            variant="outline"
            :disabled="!composerIsValid"
            @click="openSaveDialog"
          >
            <template #leading>
              <UIcon name="i-lucide-save" />
            </template>
            Save Project
          </UButton>
          <UButton
            :disabled="!composerIsValid"
            @click="showExport = true"
          >
            <template #leading>
              <UIcon name="i-lucide-download" />
            </template>
            Export
          </UButton>
        </template>
      </div>
    </div>

    <!-- Save Project Dialog -->
    <UModal v-model:open="showSaveDialog">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Save Project</h3>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-[var(--ui-text-muted)]">Project:</span>
                <span class="ml-2 font-medium">{{ projectName || '—' }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Base Layer:</span>
                <span class="ml-2 font-medium">{{ baseLayerName || '—' }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Packages:</span>
                <span class="ml-2 font-medium">{{ packages.length }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Custom Collections:</span>
                <span class="ml-2 font-medium">{{ customCollections.length }}</span>
              </div>
            </div>

            <!-- Validation Errors in Dialog -->
            <div v-if="composerValidationErrors.length > 0" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-alert-circle" class="text-red-500 mt-0.5" />
                <div class="text-sm text-red-600 dark:text-red-400">
                  <p class="font-medium">Please fix these issues:</p>
                  <ul class="list-disc list-inside mt-1">
                    <li v-for="error in composerValidationErrors" :key="error">{{ error }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" color="neutral" @click="close">
              Cancel
            </UButton>
            <UButton
              :loading="creating"
              :disabled="!composerIsValid"
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
