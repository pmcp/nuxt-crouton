<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'
import type { ProjectConfig } from '@fyit/crouton-designer/types'
import type { DesignerProject } from '~~/layers/designer/collections/projects/types'

definePageMeta({
  middleware: ['auth'],
  layout: 'designer'
})

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)
const isNewProject = computed(() => projectId.value === 'new')

const { buildApiUrl } = useTeamContext()
const { buildSystemPrompt } = useIntakePrompt()

// ------- Project state -------
const projectConfig = ref<ProjectConfig>({
  name: '',
  description: '',
  appType: undefined,
  multiTenant: undefined,
  authType: undefined,
  languages: [],
  defaultLocale: 'en',
  packages: []
})

const currentPhase = ref<string>('1')
const chatCollapsed = ref(false)
const projectRecord = ref<DesignerProject | null>(null)

// ------- Load project from DB -------
const { data: projectData, status: projectStatus } = await useFetch<DesignerProject[]>(
  () => buildApiUrl(`/designer-projects?ids=${projectId.value}`),
  {
    immediate: !isNewProject.value,
    default: () => []
  }
)

// Initialize from loaded project
watch(projectData, (projects) => {
  if (projects && projects.length > 0) {
    const proj = projects[0]!
    projectRecord.value = proj
    if (proj.config && typeof proj.config === 'object') {
      projectConfig.value = { ...projectConfig.value, ...proj.config as ProjectConfig }
    }
    if (proj.currentPhase) {
      currentPhase.value = proj.currentPhase
    }
  }
}, { immediate: true })

// ------- Create new project -------
async function ensureProject(): Promise<string> {
  if (projectRecord.value?.id) return projectRecord.value.id

  const result = await $fetch<DesignerProject>(buildApiUrl('/designer-projects'), {
    method: 'POST',
    body: {
      name: projectConfig.value.name || 'Untitled Project',
      currentPhase: '1',
      config: projectConfig.value,
      messages: {}
    }
  })
  projectRecord.value = result
  // Update URL without creating a new history entry
  if (isNewProject.value) {
    router.replace(`/designer/${result.id}`)
  }
  return result.id
}

// ------- Persist config to DB -------
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function saveConfig() {
  const id = await ensureProject()
  await $fetch(buildApiUrl(`/designer-projects/${id}`), {
    method: 'PATCH',
    body: {
      config: projectConfig.value,
      name: projectConfig.value.name || 'Untitled Project'
    }
  })
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveConfig, 800)
}

// ------- Config updates (from summary card or AI tool) -------
function updateConfig(partial: Partial<ProjectConfig>) {
  projectConfig.value = { ...projectConfig.value, ...partial }
  debouncedSave()
}

// ------- AI Chat -------
const systemPrompt = computed(() => buildSystemPrompt(projectConfig.value))

const { messages, input, isLoading, status, error, append, clearMessages, toolCalls } = useChat({
  api: '/api/ai/designer-chat',
  maxSteps: 2,
  body: computed(() => ({
    system: systemPrompt.value
  })) as any,
  onToolCall: ({ toolCall }) => {
    if (toolCall.toolName === 'set_app_config') {
      const args = toolCall.args as Partial<ProjectConfig>
      updateConfig(args)
      return { success: true, config: args }
    }
  },
  onError: (err) => {
    console.error('Chat error:', err)
  }
})

function handleChatSend(text: string) {
  append({
    id: crypto.randomUUID(),
    role: 'user',
    content: text
  })
}

// ------- Phase navigation -------
const phases: StepperItem[] = [
  {
    slot: 'intake' as const,
    title: 'Intake',
    description: 'Describe your app',
    icon: 'i-lucide-message-circle',
    value: '1'
  },
  {
    slot: 'collections' as const,
    title: 'Collections',
    description: 'Design your data model',
    icon: 'i-lucide-database',
    value: '2'
  },
  {
    slot: 'review' as const,
    title: 'Review & Generate',
    description: 'Validate and export',
    icon: 'i-lucide-rocket',
    value: '5'
  }
]

const canContinue = computed(() => !!(projectConfig.value.name && projectConfig.value.appType))

async function continueToCollections() {
  const id = await ensureProject()
  // Save current state with phase update
  await $fetch(buildApiUrl(`/designer-projects/${id}`), {
    method: 'PATCH',
    body: {
      currentPhase: '2',
      config: projectConfig.value
    }
  })
  currentPhase.value = '2'
  clearMessages()
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          to="/designer"
        />
        <h1 class="text-xl font-semibold">
          {{ projectConfig.name || 'New Project' }}
        </h1>
      </div>
    </div>

    <!-- Phase stepper -->
    <UStepper
      v-model="currentPhase"
      :items="phases"
      :linear="false"
      class="mb-6"
    >
      <!-- Phase 1: Intake -->
      <template #intake>
        <DesignerTwoPanelLayout v-model:chat-collapsed="chatCollapsed">
          <template #chat>
            <DesignerChatPanel
              :messages="messages"
              :is-loading="isLoading"
              @send="handleChatSend"
            />
          </template>
          <template #content>
            <DesignerIntakeSummaryCard
              :config="projectConfig"
              @update:config="updateConfig"
            />

            <!-- Transition button -->
            <div class="px-6 pb-6">
              <USeparator class="mb-6" />
              <div class="flex items-center justify-between">
                <p v-if="!canContinue" class="text-sm text-[var(--ui-text-muted)]">
                  Set an app name and type to continue.
                </p>
                <div v-else />
                <UButton
                  label="Continue to Collection Design"
                  icon="i-lucide-arrow-right"
                  trailing
                  :disabled="!canContinue"
                  @click="continueToCollections"
                />
              </div>
            </div>
          </template>
        </DesignerTwoPanelLayout>
      </template>

      <!-- Phase 2: Collection Design (placeholder) -->
      <template #collections>
        <div class="py-6">
          <div class="text-center text-[var(--ui-text-muted)]">
            <UIcon name="i-lucide-database" class="size-12 mx-auto mb-3 opacity-50" />
            <p>Phase 2: Collection Design</p>
            <p class="text-sm mt-1">
              Design your data model with AI assistance.
            </p>
          </div>
        </div>
      </template>

      <!-- Phase 5: Review & Generate (placeholder) -->
      <template #review>
        <div class="py-6">
          <div class="text-center text-[var(--ui-text-muted)]">
            <UIcon name="i-lucide-rocket" class="size-12 mx-auto mb-3 opacity-50" />
            <p>Phase 5: Review & Generate</p>
            <p class="text-sm mt-1">
              Validate your schema and export.
            </p>
          </div>
        </div>
      </template>
    </UStepper>
  </div>
</template>
