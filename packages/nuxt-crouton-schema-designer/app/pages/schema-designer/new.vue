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
  clearAISuggestions
} = useSchemaAI()

// Project composer for package-aware mode
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
  toProject,
  reset: resetComposer,
  schemaDesigner: designer
} = useProjectComposer()

// Export generator
const { generateExportBundle } = useExportGenerator()

// Wizard step state - NEW ORDER: chat → review → details → export
type WizardStep = 'chat' | 'review' | 'details' | 'export'
const currentStep = ref<WizardStep>('chat')

const steps: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'chat', label: 'Describe Your App', icon: 'i-lucide-sparkles' },
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

// Computed: Has any content from AI or manual input
const hasContent = computed(() => {
  return aiSuggestedPackages.value.length > 0 ||
    packages.value.length > 0 ||
    customCollections.value.some((c: { collectionName: string; fields: unknown[] }) =>
      c.collectionName || c.fields.length > 0
    )
})

// Step validation - NEW LOGIC
const stepValidation = computed(() => ({
  // Chat step: valid once there's any content (packages or collections)
  chat: hasContent.value,
  // Review step: valid once there's at least one package or collection with name
  review: hasPackages.value || customCollections.value.some((c: { collectionName: string }) => c.collectionName),
  // Details step: project name and layer name are set
  details: projectName.value.trim() !== '' && baseLayerName.value.trim() !== '',
  // Export: everything is valid
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

async function nextStep() {
  const nextIndex = currentStepIndex.value + 1
  if (nextIndex < steps.length) {
    const nextStepObj = steps[nextIndex]
    if (nextStepObj) {
      // When moving from chat to review, sync AI suggestions and pre-fill names
      if (currentStep.value === 'chat') {
        await syncAISuggestionsToProject()
        prefillFromAI()
      }
      // Also pre-fill when moving to details (in case user skipped or came back)
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
  // Auto-add any AI-suggested packages that haven't been accepted yet
  for (const pkg of aiSuggestedPackages.value) {
    if (!acceptedPackageIds.value.has(pkg.packageId)) {
      await addPackage(pkg.packageId)
    }
  }
  // Collections are synced via useSchemaAI directly to useSchemaDesigner
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

// Export modal state
const showExport = ref(false)
const showSaveDialog = ref(false)
const creating = ref(false)

// Display info for header
const collectionCount = computed(() => {
  const packageCollections = packages.value.reduce((acc: number, pkg: { packageId: string }) => {
    const manifest = packageManifests.value.get(pkg.packageId)
    return acc + (manifest?.collections.length || 0)
  }, 0)
  return packageCollections + customCollections.value.length
})

// Reset designer state on mount
onMounted(() => {
  resetComposer()
  reset()
  clearChat()
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
    // Stay on current page - project is saved
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
  clearChat()
  clearAISuggestions()
  currentStep.value = 'chat'
}

// ========= AI Chat Handlers =========
const chatContainer = ref<HTMLElement | null>(null)

// Auto-scroll to bottom when new messages arrive
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
    await addPackage(packageId)
  } finally {
    loadingPackageIds.value.delete(packageId)
  }
}

function handleRejectPackage(packageId: string) {
  // If already accepted, remove from project
  if (acceptedPackageIds.value.has(packageId)) {
    removePackage(packageId)
  }
  // Remove from AI suggestions list
  removeAISuggestedPackage(packageId)
}

function handleCollectionClick(collectionId: string) {
  designer.setActiveCollection(collectionId)
  // Go to review step to configure the collection
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
      <!-- Step 1: AI Chat (Full-Screen with Live Preview Sidebar) -->
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
              <h2 class="text-xl font-bold mb-2">What do you want to build?</h2>
              <p class="text-[var(--ui-text-muted)]">
                Describe your app and I'll set up packages and collections for you
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
                    Skip to Manual Setup
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
                  <!-- Avatar -->
                  <div
                    v-if="message.role === 'assistant'"
                    class="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-bot" class="text-xl text-[var(--ui-primary)]" />
                  </div>

                  <!-- Message Content -->
                  <div
                    class="max-w-[80%] rounded-xl px-4 py-3 text-sm"
                    :class="message.role === 'user'
                      ? 'bg-[var(--ui-primary)] text-white'
                      : 'bg-[var(--ui-bg)] border border-[var(--ui-border)]'"
                  >
                    <div class="whitespace-pre-wrap break-words" v-html="formatMessage(message.content)" />
                  </div>

                  <!-- User Avatar -->
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
                  placeholder="I want to build a tennis club booking system..."
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
                Describe your app to see<br />packages and collections appear here
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
          @save="openSaveDialog"
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
            <h2 class="text-2xl font-bold mb-2">Confirm Project Details</h2>
            <p class="text-[var(--ui-text-muted)]">
              Review and finalize your project configuration
            </p>
          </div>

          <div class="space-y-6">
            <UFormField label="Project Name" required>
              <UInput
                v-model="projectName"
                placeholder="My Awesome App"
                size="lg"
              />
              <template v-if="aiProjectName && projectName === aiProjectName" #hint>
                <span class="flex items-center gap-1 text-[var(--ui-primary)]">
                  <UIcon name="i-lucide-sparkles" class="text-xs" />
                  AI suggested
                </span>
              </template>
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
              <template v-if="aiBaseLayerName && baseLayerName === aiBaseLayerName" #hint>
                <span class="flex items-center gap-1 text-[var(--ui-primary)]">
                  <UIcon name="i-lucide-sparkles" class="text-xs" />
                  AI suggested
                </span>
              </template>
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
          @save="openSaveDialog"
          @export="showExport = true"
        />
      </div>
    </div>

    <!-- Step Navigation Footer -->
    <div class="border-t border-[var(--ui-border)] px-4 py-3 bg-[var(--ui-bg)] flex items-center justify-between">
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
            {{ hasContent ? 'Ready to continue' : 'Describe your app or add content manually' }}
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

<script lang="ts">
// Helper to format AI messages (highlight JSON blocks)
function formatMessage(content: string): string {
  // Escape HTML first
  let escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Highlight JSON code blocks
  escaped = escaped.replace(
    /```(?:json)?\s*([\s\S]*?)```/g,
    '<pre class="bg-[var(--ui-bg-elevated)] p-2 rounded mt-2 mb-2 overflow-x-auto text-xs"><code>$1</code></pre>'
  )

  // Highlight inline code
  escaped = escaped.replace(
    /`([^`]+)`/g,
    '<code class="bg-[var(--ui-bg-elevated)] px-1 rounded text-xs">$1</code>'
  )

  return escaped
}
</script>
