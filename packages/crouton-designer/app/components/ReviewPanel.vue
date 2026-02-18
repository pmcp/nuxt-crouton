<script setup lang="ts">
import type { ProjectConfig, SeedDataMap, DesignerProject } from '../types/schema'
import type { CollectionWithFields } from '../composables/useCollectionEditor'
import { isExtensionCollectionName, makeExtensionCollectionName } from '../composables/useCollectionEditor'
import type { PackageCollectionEntry } from '../composables/useCollectionEditor'

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

// All project collections (including __ext:) for package collection building
const allProjectCollections = ref<any[]>([])
const allProjectFields = ref<any[]>([])

const fieldsByColMap = computed(() => {
  const map = new Map<string, any[]>()
  for (const field of allProjectFields.value) {
    const existing = map.get(field.collectionId) || []
    existing.push(field)
    map.set(field.collectionId, existing)
  }
  return map
})

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

    // Store all project data (including __ext: rows) for package collection building
    allProjectCollections.value = projectCollections
    allProjectFields.value = projectFields

    // User collections: exclude __ext: shadow collections
    collections.value = projectCollections
      .filter(c => !isExtensionCollectionName(c.name))
      .map(col => ({
        ...col,
        fields: fieldsByColMap.value.get(col.id) || []
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

// Build package collection entries from the module registry + loaded __ext: data
const appConfig = useAppConfig()
const allModules = ((appConfig.crouton as any)?.modules ?? []) as any[]

const packageCollectionsForExport = computed<PackageCollectionEntry[]>(() => {
  const entries: PackageCollectionEntry[] = []
  for (const alias of props.config.packages ?? []) {
    const mod = allModules.find((m: any) => m.alias === alias)
    if (!mod?.ai?.collections?.length) continue

    for (const col of mod.ai.collections) {
      const extColName = makeExtensionCollectionName(alias, col.name)
      const extCol = allProjectCollections.value.find((c: any) => c.name === extColName)

      entries.push({
        id: `pkg:${alias}:${col.name}`,
        name: col.name,
        description: col.description,
        packageAlias: alias,
        layerName: mod.layer?.name ?? alias,
        manifestSchema: col.schema as Record<string, any> | undefined,
        extensionPoints: (mod.extensionPoints ?? []).filter((ep: any) => ep.collection === col.name),
        extensionFields: extCol ? (fieldsByColMap.value.get(extCol.id) ?? []) : [],
        extensionCollectionId: extCol?.id,
      })
    }
  }
  return entries
})

// Validation
const { issues, errors, warnings, hasErrors } = useSchemaValidation(collections)

// App scaffold
const toast = useToast()
const configRef = computed(() => props.config)
const { appName, effectiveFolderName, folderNameValid, folderOverride, conflictError, artifactsByCategory, status, result, error, createApp } = useAppScaffold(collections, configRef, seedData, packageCollectionsForExport)

watch(conflictError, (val) => {
  if (val) {
    toast.add({
      title: t('designer.review.appExists'),
      description: t('designer.review.appExistsToastDesc', { name: appName.value }),
      color: 'warning',
      icon: 'i-lucide-folder-x',
      duration: 6000
    })
  }
})

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

const { copy, copied: clipboardCopied } = useClipboard()
const copiedKey = ref<string | null>(null)

async function copyText(text: string, key: string) {
  await copy(text)
  copiedKey.value = key
  setTimeout(() => { copiedKey.value = null }, 2000)
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
        <!-- Folder rename input (shown on 409 conflict) -->
        <div v-if="conflictError" class="space-y-2 rounded-lg border border-[var(--ui-color-warning-300)] bg-[var(--ui-color-warning-50)] dark:bg-[var(--ui-color-warning-950)] dark:border-[var(--ui-color-warning-700)] p-4">
          <div class="flex items-center gap-2 text-sm font-medium text-[var(--ui-color-warning-700)] dark:text-[var(--ui-color-warning-300)] mb-3">
            <UIcon name="i-lucide-folder-x" class="size-4 shrink-0" />
            <span>{{ t('designer.review.appExists') }}</span>
          </div>
          <UFormField
            :label="t('designer.review.folderName')"
            :hint="t('designer.review.folderNameHint')"
            :error="folderOverride && !folderNameValid ? t('designer.review.folderNameDesc') : undefined"
          >
            <UInput
              v-model="folderOverride"
              :placeholder="appName"
              icon="i-lucide-folder"
              class="font-mono"
            />
          </UFormField>
        </div>

        <UButton
          :label="status === 'creating' ? t('designer.review.creating') : t('designer.review.createApp')"
          icon="i-lucide-rocket"
          :loading="status === 'creating'"
          size="lg"
          block
          :disabled="hasErrors || !effectiveFolderName || !folderNameValid || Object.keys(artifactsByCategory).length === 0 || status === 'creating'"
          @click="() => { createApp() }"
        />

        <p v-if="hasErrors" class="text-xs text-[var(--ui-color-error-500)] text-center">
          {{ t('designer.review.fixValidationErrors') }}
        </p>
      </div>

      <!-- Error state (non-conflict errors only) -->
      <UAlert
        v-if="status === 'error' && error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-x"
        :title="t('designer.review.createFailed')"
        :description="error"
      />

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
              :icon="copiedKey === 'dev' ? 'i-lucide-check' : 'i-lucide-copy'"
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
              :icon="copiedKey === 'deploy' ? 'i-lucide-check' : 'i-lucide-copy'"
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
