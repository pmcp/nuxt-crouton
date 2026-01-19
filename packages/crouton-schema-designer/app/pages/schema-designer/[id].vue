<script setup lang="ts">
import type { SchemaProject, CollectionSchema } from '../../types'
import type { SchemaProjectWithPackages } from '../../types/package-manifest'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)

const { getProject, updateProject, loading } = useSchemaProjects()
const {
  state,
  multiState,
  collections,
  loadMultiState,
  isValid,
  validationErrors,
  reset
} = useSchemaDesigner()

// AI integration
const {
  isFieldFromAI,
  messages,
  input,
  isLoading: isAILoading,
  isAIAvailable,
  error: aiError,
  sendMessage,
  clearChat,
  updateInput,
  aiSuggestedPackages,
  aiProjectName,
  aiBaseLayerName,
  aiCreatedCollectionIds,
  removeAISuggestedPackage,
  clearAISuggestions,
  importPackageCollections,
  removePackageCollections
} = useSchemaAI()

// Project composer for package-aware editing
const {
  projectName,
  baseLayerName,
  packages,
  packageManifests,
  hasPackages,
  customCollections,
  hasCustomCollections,
  addPackage,
  removePackage,
  isValid: composerIsValid,
  validationErrors: composerValidationErrors,
  loadProject,
  toProject,
  reset: resetComposer,
  schemaDesigner: designer
} = useProjectComposer()

// Export generator
const { generateExportBundle } = useExportGenerator()

// Wizard step state - same as new.vue
type WizardStep = 'chat' | 'review' | 'details' | 'export'
const currentStep = ref<WizardStep>('review') // Start at review for existing projects

const steps: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'chat', label: 'AI Assistant', icon: 'i-lucide-sparkles' },
  { id: 'review', label: 'Review & Configure', icon: 'i-lucide-check-circle' },
  { id: 'details', label: 'Project Details', icon: 'i-lucide-folder' },
  { id: 'export', label: 'Review & Export', icon: 'i-lucide-download' }
]

const currentStepIndex = computed(() => steps.findIndex(s => s.id === currentStep.value))

// Track accepted package IDs
const acceptedPackageIds = computed(() => {
  return new Set(packages.value.map((p: { packageId: string }) => p.packageId))
})

// Loading state per package
const loadingPackageIds = ref<Set<string>>(new Set())

// Check if a collection is new (recently created by AI)
function isCollectionNew(collectionId: string): boolean {
  return aiCreatedCollectionIds.value.has(collectionId)
}

// Project state
const project = ref<SchemaProject | null>(null)
const saving = ref(false)
const showExport = ref(false)
const showSaveDialog = ref(false)
const projectLoaded = ref(false)

// Computed: Has any content from AI or manual input
const hasContent = computed(() => {
  return aiSuggestedPackages.value.length > 0 ||
    packages.value.length > 0 ||
    customCollections.value.some((c: { collectionName: string; fields: unknown[] }) =>
      c.collectionName || c.fields.length > 0
    )
})

// Step validation - same as new.vue
const stepValidation = computed(() => ({
  chat: hasContent.value,
  review: hasPackages.value || customCollections.value.some((c: { collectionName: string }) => c.collectionName),
  details: projectName.value.trim() !== '' && baseLayerName.value.trim() !== '',
  export: composerIsValid.value
}))

function canProceedToStep(step: WizardStep): boolean {
  const stepIndex = steps.findIndex(s => s.id === step)
  if (stepIndex < currentStepIndex.value) return true

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

async function nextStep() {
  const nextIndex = currentStepIndex.value + 1
  if (nextIndex < steps.length) {
    const nextStepObj = steps[nextIndex]
    if (nextStepObj) {
      if (currentStep.value === 'chat') {
        await syncAISuggestionsToProject()
        prefillFromAI()
      }
      if (nextStepObj.id === 'details') {
        prefillFromAI()
      }
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

// Sync AI suggestions to the project composer
async function syncAISuggestionsToProject() {
  for (const pkg of aiSuggestedPackages.value) {
    if (!acceptedPackageIds.value.has(pkg.packageId)) {
      await addPackage(pkg.packageId)
    }
  }
}

// Pre-fill project details from AI suggestions
function prefillFromAI() {
  if (aiProjectName.value && !projectName.value) {
    projectName.value = aiProjectName.value
  }
  if (aiBaseLayerName.value && !baseLayerName.value) {
    baseLayerName.value = aiBaseLayerName.value
  }
}

// Display info for header
const collectionCount = computed(() => {
  const packageCollections = packages.value.reduce((acc: number, pkg: { packageId: string }) => {
    const manifest = packageManifests.value.get(pkg.packageId)
    return acc + (manifest?.collections.length || 0)
  }, 0)
  return packageCollections + customCollections.value.length
})

// Load project on mount
onMounted(async () => {
  if (projectId.value && projectId.value !== 'new') {
    try {
      project.value = await getProject(projectId.value)

      if (project.value) {
        const projectWithPackages = project.value as SchemaProjectWithPackages

        if (projectWithPackages.packages && projectWithPackages.packages.length > 0) {
          // Load using project composer (package-aware mode)
          await loadProject(projectWithPackages)
          projectLoaded.value = true
        } else if (project.value.collections && project.value.collections.length > 0) {
          // Use multi-collection loading if collections available (legacy)
          loadMultiState(project.value.layerName, project.value.collections as CollectionSchema[])
          projectLoaded.value = true

          projectName.value = project.value.name
          baseLayerName.value = project.value.layerName
        } else {
          // Fallback to legacy single-collection loading
          projectName.value = project.value.name
          baseLayerName.value = project.value.layerName
          projectLoaded.value = true
        }

        // Start at review step for existing projects
        currentStep.value = 'review'
      }
    } catch (e) {
      console.error('Failed to load project:', e)
    }
  }
})

// Auto-save function
async function save() {
  if (!project.value || !composerIsValid.value) return

  saving.value = true
  try {
    const projectData = toProject()

    await updateProject(project.value.id, {
      name: projectName.value,
      layerName: baseLayerName.value,
      collections: projectData.collections,
      packages: projectData.packages
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
watch([multiState, packages, baseLayerName, projectName], () => {
  if (project.value && projectLoaded.value) {
    debouncedSave()
  }
}, { deep: true })

function handleReset() {
  resetComposer()
  reset()
  clearChat()
  clearAISuggestions()
}

// ========= AI Chat Handlers =========
const chatContainer = ref<HTMLElement | null>(null)

watch(messages, async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}, { deep: true })

function handleChatSubmit(e?: Event) {
  e?.preventDefault()
  if (input.value.trim() && !isAILoading.value) {
    sendMessage()
  }
}

function handleSuggestionSelect(prompt: string) {
  updateInput(prompt)
  nextTick(() => sendMessage())
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleChatSubmit()
  }
}

async function handleAcceptPackage(packageId: string) {
  loadingPackageIds.value.add(packageId)
  try {
    const suggestion = aiSuggestedPackages.value.find(p => p.packageId === packageId)
    const config = suggestion?.configuration || {}
    await importPackageCollections(packageId, config)
    await addPackage(packageId)
  } finally {
    loadingPackageIds.value.delete(packageId)
  }
}

function handleRejectPackage(packageId: string) {
  if (acceptedPackageIds.value.has(packageId)) {
    removePackageCollections(packageId)
    removePackage(packageId)
  }
  removeAISuggestedPackage(packageId)
}

function handleCollectionClick(collectionId: string) {
  designer.setActiveCollection(collectionId)
  if (currentStep.value === 'chat') {
    nextStep()
  }
}

// Right panel view toggle for review step
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
          <h1 class="font-semibold">{{ projectName || project?.name || 'Loading...' }}</h1>
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
            <UBadge v-if="saving" variant="soft" color="warning" size="xs" class="ml-2">
              Saving...
            </UBadge>
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
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
    </div>

    <!-- Step Navigation -->
    <div v-if="!loading && projectLoaded" class="px-6 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]">
      <div class="flex items-center justify-center gap-2">
        <template v-for="(step, index) in steps" :key="step.id">
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

          <UIcon
            v-if="index < steps.length - 1"
            name="i-lucide-chevron-right"
            class="text-[var(--ui-text-muted)]"
          />
        </template>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="!loading && projectLoaded" class="flex-1 flex overflow-hidden">
      <!-- Step 1: AI Chat -->
      <div
        v-if="currentStep === 'chat'"
        class="flex-1 flex overflow-hidden"
      >
        <!-- Left: Chat Area -->
        <div class="flex-1 flex flex-col bg-[var(--ui-bg-muted)]">
          <!-- Chat Header -->
          <div class="px-6 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]">
            <div class="max-w-2xl mx-auto text-center">
              <UIcon name="i-lucide-sparkles" class="text-4xl text-[var(--ui-primary)] mb-3" />
              <h2 class="text-xl font-bold mb-2">Need to make changes?</h2>
              <p class="text-[var(--ui-text-muted)]">
                Ask AI to add more packages or collections to your project
              </p>
            </div>
          </div>

          <!-- Messages Area -->
          <div
            ref="chatContainer"
            class="flex-1 overflow-y-auto px-6 py-4"
          >
            <div class="max-w-2xl mx-auto space-y-4">
              <!-- Not Available Message -->
              <div v-if="!isAIAvailable" class="flex items-center justify-center py-12">
                <div class="text-center space-y-2">
                  <UIcon name="i-lucide-bot-off" class="text-4xl text-[var(--ui-text-muted)]" />
                  <p class="text-sm text-[var(--ui-text-muted)]">
                    AI features require the<br />
                    <code class="text-xs bg-[var(--ui-bg-elevated)] px-1 rounded">@friendlyinternet/nuxt-crouton-ai</code><br />
                    package to be installed.
                  </p>
                  <UButton
                    variant="outline"
                    class="mt-4"
                    @click="nextStep"
                  >
                    Skip to Manual Editing
                  </UButton>
                </div>
              </div>

              <!-- Empty State with Suggestions -->
              <CroutonSchemaDesignerAIPromptSuggestions
                v-else-if="messages.length === 0"
                @select="handleSuggestionSelect"
              />

              <!-- Messages -->
              <template v-else>
                <div
                  v-for="message in messages"
                  :key="message.id"
                  class="flex gap-3"
                  :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
                >
                  <div
                    v-if="message.role === 'assistant'"
                    class="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-bot" class="text-xl text-[var(--ui-primary)]" />
                  </div>

                  <div
                    class="max-w-[80%] rounded-xl px-4 py-3 text-sm"
                    :class="message.role === 'user'
                      ? 'bg-[var(--ui-primary)] text-white'
                      : 'bg-[var(--ui-bg)] border border-[var(--ui-border)]'"
                  >
                    <div class="whitespace-pre-wrap break-words" v-html="formatMessage(message.content)" />
                  </div>

                  <div
                    v-if="message.role === 'user'"
                    class="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--ui-bg)] border border-[var(--ui-border)] flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-user" class="text-[var(--ui-text-muted)]" />
                  </div>
                </div>

                <!-- Loading Indicator -->
                <div v-if="isAILoading" class="flex gap-3 justify-start">
                  <div class="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center">
                    <UIcon name="i-lucide-bot" class="text-xl text-[var(--ui-primary)] animate-pulse" />
                  </div>
                  <div class="bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-xl px-4 py-3">
                    <div class="flex gap-1">
                      <span class="w-2 h-2 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 0ms" />
                      <span class="w-2 h-2 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 150ms" />
                      <span class="w-2 h-2 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 300ms" />
                    </div>
                  </div>
                </div>

                <!-- Error Message -->
                <div v-if="aiError" class="flex gap-3 justify-start">
                  <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <UIcon name="i-lucide-alert-circle" class="text-xl text-red-500" />
                  </div>
                  <div class="max-w-[80%] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <p class="font-medium">Error</p>
                    <p class="text-xs mt-1">{{ aiError.message }}</p>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Input Area -->
          <div v-if="isAIAvailable" class="px-6 py-4 border-t border-[var(--ui-border)] bg-[var(--ui-bg)]">
            <form class="max-w-2xl mx-auto" @submit.prevent="handleChatSubmit">
              <div class="flex gap-3">
                <UTextarea
                  :model-value="input"
                  placeholder="Add a notifications system to my project..."
                  :rows="1"
                  autoresize
                  :maxrows="4"
                  class="flex-1"
                  size="lg"
                  :disabled="isAILoading"
                  @update:model-value="updateInput"
                  @keydown="handleKeydown"
                />
                <UButton
                  type="submit"
                  icon="i-lucide-send"
                  size="lg"
                  :loading="isAILoading"
                  :disabled="!input.trim() || isAILoading"
                />
              </div>
              <p class="text-xs text-[var(--ui-text-muted)] mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </form>
          </div>
        </div>

        <!-- Right: Live Preview Sidebar -->
        <aside class="w-80 border-l border-[var(--ui-border)] bg-[var(--ui-bg)] flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-[var(--ui-border)]">
            <h3 class="font-semibold text-sm flex items-center gap-2">
              <UIcon name="i-lucide-eye" class="text-[var(--ui-text-muted)]" />
              Live Preview
            </h3>
            <p class="text-xs text-[var(--ui-text-muted)]">
              See what AI is creating
            </p>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- AI Project Metadata -->
            <div v-if="aiProjectName || aiBaseLayerName" class="p-3 rounded-lg bg-[var(--ui-bg-elevated)] space-y-2">
              <p v-if="aiProjectName" class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-folder" class="text-[var(--ui-text-muted)]" />
                <span class="text-[var(--ui-text-muted)]">Project:</span>
                <span class="font-medium">{{ aiProjectName }}</span>
              </p>
              <p v-if="aiBaseLayerName" class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-layers" class="text-[var(--ui-text-muted)]" />
                <span class="text-[var(--ui-text-muted)]">Layer:</span>
                <span class="font-medium font-mono">{{ aiBaseLayerName }}</span>
              </p>
            </div>

            <!-- Package Suggestions -->
            <div v-if="aiSuggestedPackages.length > 0" class="space-y-3">
              <h4 class="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide flex items-center gap-2">
                <UIcon name="i-lucide-package" />
                Suggested Packages
              </h4>
              <CroutonSchemaDesignerAIPackageSuggestion
                v-for="pkg in aiSuggestedPackages"
                :key="pkg.packageId"
                :suggestion="pkg"
                :accepted="acceptedPackageIds.has(pkg.packageId)"
                :loading="loadingPackageIds.has(pkg.packageId)"
                @accept="handleAcceptPackage"
                @reject="handleRejectPackage"
              />
            </div>

            <!-- Collection Previews -->
            <div v-if="designer.collections.value.length > 0" class="space-y-3">
              <h4 class="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide flex items-center gap-2">
                <UIcon name="i-lucide-database" />
                Collections
                <UBadge color="primary" variant="subtle" size="xs">
                  {{ designer.collections.value.length }}
                </UBadge>
              </h4>
              <CroutonSchemaDesignerAICollectionPreview
                v-for="collection in designer.collections.value"
                :key="collection.id"
                :collection="collection"
                :is-new="isCollectionNew(collection.id)"
                @click="handleCollectionClick"
              />
            </div>

            <!-- Empty State -->
            <div
              v-if="!aiProjectName && !aiBaseLayerName && aiSuggestedPackages.length === 0 && designer.collections.value.length === 0"
              class="text-center py-8"
            >
              <UIcon name="i-lucide-inbox" class="text-4xl text-[var(--ui-text-muted)] mb-3" />
              <p class="text-sm text-[var(--ui-text-muted)]">
                Describe changes to see<br />packages and collections appear here
              </p>
            </div>
          </div>
        </aside>
      </div>

      <!-- Step 2: Review & Configure -->
      <div
        v-else-if="currentStep === 'review'"
        class="flex-1 flex flex-col overflow-hidden"
      >
        <CroutonSchemaDesignerProjectComposer
          class="flex-1"
          @save="showSaveDialog = true"
          @export="showExport = true"
        />
      </div>

      <!-- Step 3: Project Details -->
      <div
        v-else-if="currentStep === 'details'"
        class="flex-1 flex items-center justify-center bg-[var(--ui-bg-muted)]"
      >
        <div class="w-full max-w-md p-8">
          <div class="text-center mb-8">
            <UIcon name="i-lucide-folder-check" class="text-5xl text-[var(--ui-primary)] mb-4" />
            <h2 class="text-2xl font-bold mb-2">Project Details</h2>
            <p class="text-[var(--ui-text-muted)]">
              Review and update your project configuration
            </p>
          </div>

          <div class="space-y-6">
            <UFormField label="Project Name" required>
              <UInput
                v-model="projectName"
                placeholder="My Awesome App"
                size="lg"
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

            <!-- Summary -->
            <div class="p-4 rounded-lg bg-[var(--ui-bg)] border border-[var(--ui-border)]">
              <h4 class="font-medium mb-3">Project Summary</h4>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-package" class="text-[var(--ui-text-muted)]" />
                  <span class="text-[var(--ui-text-muted)]">Packages:</span>
                  <span class="font-medium">{{ packages.length }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-database" class="text-[var(--ui-text-muted)]" />
                  <span class="text-[var(--ui-text-muted)]">Collections:</span>
                  <span class="font-medium">{{ customCollections.length }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 flex justify-between">
            <UButton
              variant="outline"
              @click="prevStep"
            >
              <template #leading>
                <UIcon name="i-lucide-arrow-left" />
              </template>
              Back
            </UButton>
            <UButton
              size="lg"
              :disabled="!stepValidation.details"
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

      <!-- Step 4: Review & Export -->
      <div
        v-else-if="currentStep === 'export'"
        class="flex-1 flex overflow-hidden"
      >
        <CroutonSchemaDesignerExportReview
          @save="showSaveDialog = true"
          @export="showExport = true"
        />
      </div>
    </div>

    <!-- Step Navigation Footer -->
    <div v-if="!loading && projectLoaded" class="border-t border-[var(--ui-border)] px-4 py-3 bg-[var(--ui-bg)] flex items-center justify-between">
      <!-- Validation Status -->
      <div class="flex items-center gap-2">
        <template v-if="composerValidationErrors.length > 0 && currentStep !== 'chat'">
          <UIcon name="i-lucide-alert-circle" class="text-amber-500" />
          <span class="text-sm text-[var(--ui-text-muted)]">{{ composerValidationErrors[0] }}</span>
          <span v-if="composerValidationErrors.length > 1" class="text-xs text-[var(--ui-text-muted)]">
            (+{{ composerValidationErrors.length - 1 }} more)
          </span>
        </template>
        <template v-else-if="currentStep === 'chat'">
          <UIcon name="i-lucide-info" class="text-[var(--ui-text-muted)]" />
          <span class="text-sm text-[var(--ui-text-muted)]">
            Ask AI to add more packages or collections
          </span>
        </template>
        <template v-else-if="composerIsValid">
          <UIcon name="i-lucide-check-circle" class="text-[var(--ui-success)]" />
          <span class="text-sm text-[var(--ui-success)]">Auto-saving enabled</span>
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

    <!-- Export Modal -->
    <CroutonSchemaDesignerExportPanel v-model="showExport" />
  </div>
</template>

<script lang="ts">
// Helper to format AI messages (highlight JSON blocks)
function formatMessage(content: string): string {
  let escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  escaped = escaped.replace(
    /```(?:json)?\s*([\s\S]*?)```/g,
    '<pre class="bg-[var(--ui-bg-elevated)] p-2 rounded mt-2 mb-2 overflow-x-auto text-xs"><code>$1</code></pre>'
  )

  escaped = escaped.replace(
    /`([^`]+)`/g,
    '<code class="bg-[var(--ui-bg-elevated)] px-1 rounded text-xs">$1</code>'
  )

  return escaped
}
</script>
