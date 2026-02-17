<script setup lang="ts">
import type { ProjectConfig, SeedDataMap, DesignerProject } from '../types/schema'
import type { CollectionWithFields } from '../composables/useCollectionEditor'

const props = defineProps<{
  projectId: string
  config: ProjectConfig
}>()

const emit = defineEmits<{
  'back-to-collections': []
}>()

const { buildApiUrl } = useTeamContext()
const { t } = useT()

// Load collections + fields + seed data for this project
const collections = ref<CollectionWithFields[]>([])
const seedData = ref<SeedDataMap>({})
const loading = ref(true)

async function loadCollections() {
  loading.value = true
  try {
    const [allCollections, allFields, projectRecords] = await Promise.all([
      $fetch<any[]>(buildApiUrl('/designer-collections')),
      $fetch<any[]>(buildApiUrl('/designer-fields')),
      $fetch<DesignerProject[]>(buildApiUrl(`/designer-projects?ids=${props.projectId}`))
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

    // Load seed data from project record
    const project = projectRecords?.[0]
    if (project?.seedData && typeof project.seedData === 'object') {
      seedData.value = project.seedData as SeedDataMap
    }
  }
  finally {
    loading.value = false
  }
}

onMounted(loadCollections)

// Validation
const { issues, errors, warnings, hasErrors } = useSchemaValidation(collections)

// App scaffold
const configRef = computed(() => props.config)
const { appName, artifactsByCategory, status, result, error, createApp } = useAppScaffold(collections, configRef, seedData)

// Category display order
const categoryOrder = ['config', 'app', 'server', 'schema', 'seed'] as const

// Step label map
const stepLabels: Record<string, string> = {
  scaffold: 'designer.review.stepScaffold',
  schemas: 'designer.review.stepSchemas',
  seedData: 'designer.review.stepSeedData',
  config: 'designer.review.stepConfig',
  install: 'designer.review.stepInstall',
  generate: 'designer.review.stepGenerate',
  doctor: 'designer.review.stepDoctor'
}

const copied = ref<string | null>(null)

async function copyText(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    setTimeout(() => { copied.value = null }, 2000)
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

      <!-- Artifacts grouped by category -->
      <div class="space-y-4">
        <h3 class="text-base font-semibold">{{ t('designer.review.generatedFiles') }}</h3>

        <div v-if="Object.keys(artifactsByCategory).length === 0" class="text-sm text-[var(--ui-text-muted)] italic px-1">
          {{ t('designer.review.noCollections') }}
        </div>

        <div v-for="category in categoryOrder" :key="category" class="space-y-1">
          <template v-if="artifactsByCategory[category]">
            <div class="flex items-center gap-2 text-sm font-medium text-[var(--ui-text-muted)] px-1 pt-2">
              <UIcon :name="artifactsByCategory[category].icon" class="size-4" />
              <span>{{ t(`designer.review.artifactCategories.${category}`) }}</span>
              <UBadge variant="subtle" color="neutral" size="xs" :label="String(artifactsByCategory[category].artifacts.length)" />
            </div>
            <div
              v-for="artifact in artifactsByCategory[category].artifacts"
              :key="artifact.filename"
              class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-[var(--ui-bg-elevated)]"
            >
              <span class="font-mono text-xs text-[var(--ui-text-dimmed)]">{{ artifact.filename }}</span>
            </div>
          </template>
        </div>
      </div>

      <USeparator />

      <!-- Create App button -->
      <div class="space-y-4">
        <UButton
          :label="status === 'creating' ? t('designer.review.creating') : t('designer.review.createApp')"
          :icon="status === 'creating' ? 'i-lucide-loader-2' : 'i-lucide-rocket'"
          :class="{ 'animate-pulse': status === 'creating' }"
          size="lg"
          block
          :disabled="hasErrors || !appName || Object.keys(artifactsByCategory).length === 0 || status === 'creating'"
          @click="() => { createApp() }"
        />

        <p v-if="hasErrors" class="text-xs text-[var(--ui-color-error-500)] text-center">
          {{ t('designer.review.fixValidationErrors') }}
        </p>
      </div>

      <!-- Error state -->
      <div v-if="status === 'error' && error" class="rounded-lg border border-[var(--ui-color-error-500)] p-4 space-y-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-circle-x" class="size-5 text-[var(--ui-color-error-500)]" />
          <span class="text-sm font-medium">{{ t('designer.review.createFailed') }}</span>
        </div>
        <p class="text-xs text-[var(--ui-text-muted)] font-mono">{{ error }}</p>
      </div>

      <!-- Post-creation success -->
      <div v-if="status === 'done' && result" class="space-y-4 rounded-lg border border-[var(--ui-border)] p-4">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <UIcon
            :name="result.success ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
            :class="result.success ? 'text-[var(--ui-color-success-500)]' : 'text-[var(--ui-color-warning-500)]'"
            class="size-5"
          />
          <span class="text-sm font-medium">
            {{ result.success ? t('designer.review.appCreated') : t('designer.review.createFailed') }}
          </span>
        </div>

        <!-- Step results -->
        <div class="space-y-1">
          <div
            v-for="(step, stepName) in result.steps"
            :key="stepName"
            class="flex items-center gap-2 text-sm px-2 py-1"
          >
            <UIcon
              :name="step.success ? 'i-lucide-check' : 'i-lucide-x'"
              :class="step.success ? 'text-[var(--ui-color-success-500)]' : 'text-[var(--ui-color-error-500)]'"
              class="size-3.5"
            />
            <span>{{ t(stepLabels[stepName as string] || stepName as string) }}</span>
            <span v-if="step.files?.length" class="text-xs text-[var(--ui-text-muted)]">
              ({{ step.files.length }} files)
            </span>
            <span v-if="!step.success && step.error" class="text-xs text-[var(--ui-color-error-500)] truncate ml-auto max-w-[50%]">
              {{ step.error }}
            </span>
          </div>
        </div>

        <!-- App directory -->
        <div v-if="result.success" class="space-y-3 pt-2">
          <div>
            <p class="text-xs text-[var(--ui-text-muted)] mb-1">{{ t('designer.review.appDirectory') }}</p>
            <code class="text-sm font-mono bg-[var(--ui-bg-elevated)] px-2 py-1 rounded">{{ result.appDir }}</code>
          </div>

          <!-- Dev command -->
          <div class="relative">
            <p class="text-xs text-[var(--ui-text-muted)] mb-1">{{ t('designer.review.runDev') }}</p>
            <pre class="bg-[var(--ui-bg-elevated)] rounded-md p-3 text-xs font-mono">cd {{ result.appDir }} && pnpm dev</pre>
            <UButton
              :icon="copied === 'dev' ? 'i-lucide-check' : 'i-lucide-copy'"
              variant="ghost"
              color="neutral"
              size="xs"
              class="absolute top-6 right-2"
              @click="copyText(`cd ${result.appDir} && pnpm dev`, 'dev')"
            />
          </div>

          <!-- Deploy command -->
          <div class="relative">
            <p class="text-xs text-[var(--ui-text-muted)] mb-1">{{ t('designer.review.deployInstructions') }}</p>
            <pre class="bg-[var(--ui-bg-elevated)] rounded-md p-3 text-xs font-mono">./scripts/deploy-app.sh {{ result.appDir }}</pre>
            <UButton
              :icon="copied === 'deploy' ? 'i-lucide-check' : 'i-lucide-copy'"
              variant="ghost"
              color="neutral"
              size="xs"
              class="absolute top-6 right-2"
              @click="copyText(`./scripts/deploy-app.sh ${result.appDir}`, 'deploy')"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
