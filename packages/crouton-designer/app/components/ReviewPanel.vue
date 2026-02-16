<script setup lang="ts">
import type { ProjectConfig } from '../types/schema'
import type { CollectionWithFields } from '../composables/useCollectionEditor'

const props = defineProps<{
  projectId: string
  config: ProjectConfig
}>()

const emit = defineEmits<{
  'back-to-collections': []
}>()

const { buildApiUrl } = useTeamContext()

// Load collections + fields for this project
const collections = ref<CollectionWithFields[]>([])
const loading = ref(true)

async function loadCollections() {
  loading.value = true
  try {
    const [allCollections, allFields] = await Promise.all([
      $fetch<any[]>(buildApiUrl('/designer-collections')),
      $fetch<any[]>(buildApiUrl('/designer-fields'))
    ])
    const projectCollections = allCollections.filter(c => c.projectId === props.projectId)
    const collectionIds = new Set(projectCollections.map(c => c.id))
    const projectFields = allFields.filter(f => collectionIds.has(f.collectionId))

    // Build CollectionWithFields
    const fieldsByCollection = new Map<string, any[]>()
    for (const field of projectFields) {
      const existing = fieldsByCollection.get(field.collectionId) || []
      existing.push(field)
      fieldsByCollection.set(field.collectionId, existing)
    }

    collections.value = projectCollections.map(col => ({
      ...col,
      fields: fieldsByCollection.get(col.id) || []
    }))
  }
  finally {
    loading.value = false
  }
}

onMounted(loadCollections)

// Validation
const { issues, errors, warnings, hasErrors } = useSchemaValidation(collections)

// Schema download
const configRef = computed(() => props.config)
const { artifacts, cliCommand, downloadZip } = useSchemaDownload(collections, configRef)

// Track download state
const hasDownloaded = ref(false)
const copied = ref(false)

function handleGenerate() {
  downloadZip()
  hasDownloaded.value = true
}

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(cliCommand.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
  catch {
    // Fallback — select text
  }
}

function handleNavigateToCollection(_collectionId: string) {
  emit('back-to-collections')
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8 py-4">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-[var(--ui-text-muted)]" />
    </div>

    <template v-else>
      <!-- Summary -->
      <DesignerGenerationSummary
        :config="config"
        :collections="collections"
      />

      <USeparator />

      <!-- Validation -->
      <DesignerValidationChecklist
        :collections="collections"
        :issues="issues"
        :errors="errors"
        :warnings="warnings"
        :has-errors="hasErrors"
        @navigate-to="handleNavigateToCollection"
      />

      <USeparator />

      <!-- Artifacts -->
      <div class="space-y-3">
        <h3 class="text-base font-semibold">Generated Files</h3>
        <div class="space-y-1">
          <div
            v-for="artifact in artifacts"
            :key="artifact.filename"
            class="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-[var(--ui-bg-elevated)]"
          >
            <UIcon name="i-lucide-file-json" class="size-4 text-[var(--ui-text-muted)]" />
            <span class="font-mono text-xs">{{ artifact.filename }}</span>
            <UBadge
              :color="artifact.status === 'ready' ? 'success' : 'warning'"
              variant="subtle"
              size="xs"
              :label="artifact.status"
              class="ml-auto"
            />
          </div>
          <p v-if="artifacts.length === 0" class="text-sm text-[var(--ui-text-muted)] italic px-1">
            No collections to export.
          </p>
        </div>
      </div>

      <USeparator />

      <!-- Generate button -->
      <div class="space-y-4">
        <UButton
          label="Download Schemas"
          icon="i-lucide-download"
          size="lg"
          block
          :disabled="hasErrors || artifacts.length === 0"
          @click="handleGenerate"
        />

        <p v-if="hasErrors" class="text-xs text-[var(--ui-color-error-500)] text-center">
          Fix validation errors before generating.
        </p>
      </div>

      <!-- Post-download instructions -->
      <div v-if="hasDownloaded" class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-check-circle" class="size-5 text-[var(--ui-color-success-500)]" />
          <span class="text-sm font-medium">Schemas downloaded</span>
        </div>

        <p class="text-sm text-[var(--ui-text-muted)]">
          Extract the ZIP into your project directory, then run these commands:
        </p>

        <div class="relative">
          <pre class="bg-[var(--ui-bg-elevated)] rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{{ cliCommand }}</pre>
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            variant="ghost"
            color="neutral"
            size="xs"
            class="absolute top-2 right-2"
            @click="copyCommand"
          />
        </div>

        <p class="text-xs text-[var(--ui-text-muted)]">
          The CLI will generate collections, APIs, components, and database migrations in your Nuxt project.
        </p>
      </div>
    </template>
  </div>
</template>
