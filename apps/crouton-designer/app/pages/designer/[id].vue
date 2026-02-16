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
const { buildSystemPrompt: buildIntakePrompt } = useIntakePrompt()
const { buildSystemPrompt: buildCollectionPrompt } = useCollectionDesignPrompt()

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

// ------- Collection editor (Phase 2) -------
const collectionEditorRef = ref<{ editor: ReturnType<typeof useCollectionEditor> } | null>(null)

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
const systemPrompt = computed(() => {
  if (currentPhase.value === '2') {
    const editor = collectionEditorRef.value?.editor
    const collections = toValue(editor?.collectionsWithFields) || []
    return buildCollectionPrompt(projectConfig.value, collections)
  }
  return buildIntakePrompt(projectConfig.value)
})

const { messages, input, isLoading, status, error, append, clearMessages, toolCalls } = useChat({
  api: '/api/ai/designer-chat',
  maxSteps: 5,
  body: computed(() => ({
    system: systemPrompt.value,
    phase: currentPhase.value
  })) as any,
  onToolCall: async ({ toolCall }) => {
    // Phase 1 tools
    if (toolCall.toolName === 'set_app_config') {
      const args = toolCall.args as Partial<ProjectConfig>
      updateConfig(args)
      return { success: true, config: args }
    }

    // Phase 2 tools
    const editor = collectionEditorRef.value?.editor
    if (!editor) return { success: false, error: 'Editor not ready' }

    const args = toolCall.args as Record<string, any>

    if (toolCall.toolName === 'create_collection') {
      const collection = await editor.createCollection({
        name: args.name,
        description: args.description
      })
      // Create initial fields if provided
      if (args.fields?.length) {
        for (const field of args.fields) {
          await editor.addField({
            collectionId: collection.id,
            name: field.name,
            type: field.type,
            meta: field.meta,
            refTarget: field.refTarget
          })
        }
      }
      return { success: true, collectionId: collection.id, name: args.name }
    }

    if (toolCall.toolName === 'update_collection') {
      await editor.updateCollection(args.collectionId, {
        name: args.name,
        description: args.description
      })
      return { success: true }
    }

    if (toolCall.toolName === 'delete_collection') {
      await editor.deleteCollection(args.collectionId)
      return { success: true }
    }

    if (toolCall.toolName === 'add_field') {
      const field = await editor.addField({
        collectionId: args.collectionId,
        name: args.name,
        type: args.type,
        meta: args.meta,
        refTarget: args.refTarget
      })
      return { success: true, fieldId: field.id }
    }

    if (toolCall.toolName === 'update_field') {
      await editor.updateField(args.fieldId, {
        name: args.name,
        type: args.type,
        meta: args.meta,
        refTarget: args.refTarget
      })
      return { success: true }
    }

    if (toolCall.toolName === 'delete_field') {
      await editor.deleteField(args.fieldId)
      return { success: true }
    }

    if (toolCall.toolName === 'reorder_fields') {
      await editor.reorderFields(args.collectionId, args.fieldIds)
      return { success: true }
    }

    return { success: false, error: `Unknown tool: ${toolCall.toolName}` }
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
  await $fetch(buildApiUrl(`/designer-projects/${id}`), {
    method: 'PATCH',
    body: {
      currentPhase: '2',
      config: projectConfig.value
    }
  })
  currentPhase.value = '2'
  clearMessages()
  // Auto-generate initial proposal after editor loads
  triggerInitialProposal()
}

// --- Auto-generate initial proposal on Phase 2 entry (A3.10) ---
const proposalTriggered = ref(false)

function triggerInitialProposal() {
  // Wait for editor to be ready, then send automatic AI message
  const stop = watch(
    () => collectionEditorRef.value?.editor,
    (editor) => {
      if (!editor || proposalTriggered.value) return
      // Only propose if no collections exist yet
      nextTick(async () => {
        await editor.fetchAll()
        if (toValue(editor.collections).length === 0 && !proposalTriggered.value) {
          proposalTriggered.value = true
          append({
            id: crypto.randomUUID(),
            role: 'user',
            content: `Based on the app configuration (${projectConfig.value.name} — ${projectConfig.value.appType}${projectConfig.value.description ? ': ' + projectConfig.value.description : ''}), propose an initial set of collections with fields. Be opinionated and create a complete, well-structured data model.`
          })
        }
        stop()
      })
    },
    { immediate: true }
  )
}

// Also trigger when loading an existing project that's in Phase 2
watch(currentPhase, (phase) => {
  if (phase === '2' && !proposalTriggered.value) {
    // Check if collections already exist — if so, don't propose
    const checkEditor = watch(
      () => toValue(collectionEditorRef.value?.editor?.collections),
      (cols) => {
        if (cols && cols.length > 0) {
          proposalTriggered.value = true
          checkEditor()
        }
      },
      { immediate: true }
    )
  }
}, { immediate: true })

async function continueToReview() {
  const id = await ensureProject()
  await $fetch(buildApiUrl(`/designer-projects/${id}`), {
    method: 'PATCH',
    body: { currentPhase: '5' }
  })
  currentPhase.value = '5'
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

      <!-- Phase 2: Collection Design -->
      <template #collections>
        <DesignerTwoPanelLayout v-model:chat-collapsed="chatCollapsed">
          <template #chat>
            <DesignerChatPanel
              :messages="messages"
              :is-loading="isLoading"
              @send="handleChatSend"
            />
          </template>
          <template #content>
            <DesignerCollectionEditor
              ref="collectionEditorRef"
              :project-id="projectId"
            />

            <!-- Transition button -->
            <div class="px-4 pb-4">
              <USeparator class="mb-4" />
              <div class="flex items-center justify-end">
                <UButton
                  label="Continue to Review"
                  icon="i-lucide-arrow-right"
                  trailing
                  @click="continueToReview"
                />
              </div>
            </div>
          </template>
        </DesignerTwoPanelLayout>
      </template>

      <!-- Phase 5: Review & Generate -->
      <template #review>
        <DesignerReviewPanel
          :project-id="projectId"
          :config="projectConfig"
          @back-to-collections="currentPhase = '2'"
        />
      </template>
    </UStepper>
  </div>
</template>
