<script setup lang="ts">
import { GENERATION_STEPS } from '../../types/app-generator'
import type { CollectionConfig, PackageConfig } from '../../types/app-generator'
import type { CollectionSchema, SchemaField } from '../../types/schema'
import type { PackageInstance } from '../../types/package-manifest'

const emit = defineEmits<{
  close: []
}>()

const { multiState, collections } = useSchemaDesigner()
const {
  projectName: composerProjectName,
  baseLayerName,
  packages,
  packageManifests,
  customCollections,
  hasPackages
} = useProjectComposer()

const {
  support,
  projectName,
  targetPath,
  folderSelected,
  selectedFolderName,
  isGenerating,
  progress,
  error,
  result,
  selectFolder,
  createApp,
  reset
} = useAppGenerator()

const toast = useToast()

// Determine if we're in package mode
const isPackageMode = computed(() => hasPackages.value)

// Get the effective layer name
// When a package has a non-editable layer name, use it instead of the base layer name
const effectiveLayerName = computed(() => {
  if (isPackageMode.value) {
    // Check if any package has a non-editable layer name
    for (const pkg of packages.value) {
      const manifest = packageManifests.value.get(pkg.packageId)
      if (manifest?.layer && !manifest.layer.editable) {
        return manifest.layer.name
      }
    }
    // Fall back to base layer name for custom collections
    return baseLayerName.value
  }
  return multiState.value.layerName
})

// Get the effective collections (custom collections in package mode, all in legacy mode)
const effectiveCollections = computed(() => {
  return isPackageMode.value ? customCollections.value : collections.value
})

// Form state - global options only, per-collection options come from collections
const options = ref({
  dialect: 'sqlite' as const,
  includeAuth: false,
  includeI18n: false
})

// Auto-detect auth/i18n from packages
watchEffect(() => {
  if (isPackageMode.value) {
    for (const pkg of packages.value) {
      const manifest = packageManifests.value.get(pkg.packageId)
      if (manifest?.dependencies?.includes('@fyit/crouton-auth')) {
        options.value.includeAuth = true
      }
      if (manifest?.dependencies?.includes('@fyit/crouton-i18n')) {
        options.value.includeI18n = true
      }
    }
  }
})

/**
 * Convert fields to schema export format
 */
function fieldsToSchema(fields: SchemaField[]): Record<string, unknown> {
  const schema: Record<string, any> = {}

  // Add id field first
  schema.id = { type: 'uuid', meta: { primaryKey: true } }

  // Add user fields
  for (const field of fields) {
    if (!field.name) continue

    const fieldDef: Record<string, any> = {
      type: field.type
    }

    // Add meta if there are any properties set
    const meta: Record<string, any> = {}
    if (field.meta.required) meta.required = true
    if (field.meta.maxLength) meta.maxLength = field.meta.maxLength
    if (field.meta.label) meta.label = field.meta.label
    if (field.meta.translatable) meta.translatable = true
    if (field.meta.area) meta.area = field.meta.area
    if (field.meta.unique) meta.unique = true
    if (field.meta.default !== undefined) meta.default = field.meta.default
    if (field.meta.group) meta.group = field.meta.group
    if (field.meta.precision) meta.precision = field.meta.precision
    if (field.meta.scale) meta.scale = field.meta.scale

    if (Object.keys(meta).length > 0) {
      fieldDef.meta = meta
    }

    // Add refTarget if set
    if (field.refTarget) {
      fieldDef.refTarget = field.refTarget
    }

    schema[field.name] = fieldDef
  }

  return schema
}

/**
 * Convert multi-collection state to CollectionConfig array
 */
function collectionsToConfigs(): CollectionConfig[] {
  return effectiveCollections.value.map((col: CollectionSchema) => ({
    name: col.collectionName,
    schema: fieldsToSchema(col.fields),
    hierarchy: col.options.hierarchy,
    sortable: col.options.sortable,
    seed: col.options.seed,
    seedCount: col.options.seedCount
  }))
}

/**
 * Convert packages to PackageConfig array
 */
function packagesToConfigs(): PackageConfig[] {
  return packages.value.map((pkg: PackageInstance) => {
    const manifest = packageManifests.value.get(pkg.packageId)
    return {
      packageId: pkg.packageId,
      layerName: pkg.layerName,
      config: pkg.config || {},
      npmPackage: manifest?.npmPackage
    }
  })
}

// Initialize project name from layer or composer
onMounted(() => {
  if (!projectName.value) {
    if (isPackageMode.value && composerProjectName.value) {
      projectName.value = composerProjectName.value.toLowerCase().replace(/\s+/g, '-')
    } else if (effectiveLayerName.value) {
      const collectionCount = effectiveCollections.value.length
      const suffix = collectionCount > 1 ? 'app' : effectiveCollections.value[0]?.collectionName || 'app'
      projectName.value = `${effectiveLayerName.value}-${suffix}`
    }
  }
})

async function handleSelectFolder() {
  try {
    const name = await selectFolder()
    if (name) {
      toast.add({
        title: 'Folder selected',
        description: `Will create project in: ${name}`,
        icon: 'i-lucide-folder-check',
        color: 'success'
      })
    }
  } catch (e: any) {
    toast.add({
      title: 'Failed to select folder',
      description: e.message,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function handleCreate() {
  if (!targetPath.value) {
    toast.add({
      title: 'No folder selected',
      description: 'Please select a folder or enter a path',
      icon: 'i-lucide-folder-x',
      color: 'warning'
    })
    return
  }

  try {
    const collectionConfigs = collectionsToConfigs()
    const packageConfigs = isPackageMode.value ? packagesToConfigs() : []

    await createApp({
      projectName: projectName.value,
      targetPath: targetPath.value,
      layerName: effectiveLayerName.value,
      collections: collectionConfigs,
      packages: packageConfigs,
      options: options.value
    })

    if (result.value?.success) {
      const itemCount = collectionConfigs.length + packageConfigs.length
      const itemLabel = packageConfigs.length > 0
        ? `${packageConfigs.length} package(s) and ${collectionConfigs.length} collection(s)`
        : `${collectionConfigs.length} collection(s)`
      toast.add({
        title: 'Project created!',
        description: `Created ${itemLabel} at ${result.value.projectPath}`,
        icon: 'i-lucide-check-circle',
        color: 'success'
      })
    }
  } catch (e: any) {
    toast.add({
      title: 'Failed to create project',
      description: e.message,
      icon: 'i-lucide-x-circle',
      color: 'error'
    })
  }
}

function handleReset() {
  reset()
}

const currentStepIndex = computed(() => {
  return GENERATION_STEPS.findIndex(s => s.id === progress.value.step)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Success State -->
    <div v-if="result?.success" class="space-y-4">
      <div class="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-check-circle" class="text-green-500 text-xl" />
          <div>
            <div class="font-medium">Project Created Successfully!</div>
            <div class="text-sm text-[var(--ui-text-muted)] mt-1">
              {{ result.projectPath }}
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-sm font-medium">Next Steps:</div>
        <div class="p-3 bg-[var(--ui-bg-elevated)] rounded-lg font-mono text-sm space-y-1">
          <div>cd {{ projectName }}</div>
          <div>pnpm dev</div>
        </div>
      </div>

      <div v-if="result.warnings.length > 0" class="space-y-2">
        <div class="text-sm font-medium text-amber-500">Warnings:</div>
        <ul class="text-sm text-[var(--ui-text-muted)] list-disc list-inside">
          <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>

      <div class="flex gap-2">
        <UButton variant="outline" @click="handleReset">
          Create Another
        </UButton>
        <UButton @click="emit('close')">
          Done
        </UButton>
      </div>
    </div>

    <!-- Generating State -->
    <div v-else-if="isGenerating" class="space-y-4">
      <div class="space-y-3">
        <div
          v-for="(step, index) in GENERATION_STEPS"
          :key="step.id"
          class="flex items-center gap-3 p-2 rounded-lg"
          :class="{
            'bg-[var(--ui-bg-elevated)]': index === currentStepIndex,
            'opacity-50': index > currentStepIndex
          }"
        >
          <div class="w-6 h-6 flex items-center justify-center">
            <UIcon
              v-if="index < currentStepIndex"
              name="i-lucide-check"
              class="text-green-500"
            />
            <UIcon
              v-else-if="index === currentStepIndex"
              name="i-lucide-loader-2"
              class="text-[var(--ui-primary)] animate-spin"
            />
            <div
              v-else
              class="w-2 h-2 rounded-full bg-[var(--ui-border)]"
            />
          </div>
          <div>
            <div class="text-sm font-medium">{{ step.label }}</div>
            <div v-if="index === currentStepIndex" class="text-xs text-[var(--ui-text-muted)]">
              {{ progress.message }}
            </div>
          </div>
        </div>
      </div>

      <div class="h-2 bg-[var(--ui-bg-elevated)] rounded-full overflow-hidden">
        <div
          class="h-full bg-[var(--ui-primary)] transition-all duration-300"
          :style="{ width: `${progress.progress}%` }"
        />
      </div>
    </div>

    <!-- Form State -->
    <template v-else>
      <!-- Error Display -->
      <div
        v-if="error"
        class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
      >
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-alert-circle" class="text-red-500 mt-0.5" />
          <div class="text-sm">{{ error }}</div>
        </div>
      </div>

      <!-- Project Name -->
      <UFormField label="Project Name" required>
        <UInput
          v-model="projectName"
          placeholder="my-crouton-app"
        />
      </UFormField>

      <!-- Folder Selection -->
      <UFormField label="Target Folder" required>
        <div class="flex gap-2">
          <UInput
            v-model="targetPath"
            placeholder="/Users/you/projects"
            class="flex-1"
          />
          <UButton
            v-if="support.hasNativePicker"
            variant="outline"
            icon="i-lucide-folder-open"
            @click="handleSelectFolder"
          >
            Browse
          </UButton>
        </div>
        <template #hint>
          <div class="space-y-1">
            <div v-if="folderSelected" class="text-green-600 flex items-center gap-1">
              <UIcon name="i-lucide-folder-check" />
              Folder selected: <strong>{{ selectedFolderName }}</strong>
            </div>
            <div v-if="folderSelected" class="text-[var(--ui-text-muted)]">
              Enter the full path to this folder (e.g., /Users/you/projects/{{ selectedFolderName }})
            </div>
            <div v-else-if="!support.hasNativePicker" class="text-amber-500">
              Native folder picker not available. Enter the full path manually.
            </div>
            <div v-else class="text-[var(--ui-text-muted)]">
              Click Browse to select a folder, then enter the full path.
            </div>
          </div>
        </template>
      </UFormField>

      <!-- Database Dialect -->
      <UFormField label="Database">
        <USelect
          v-model="options.dialect"
          :options="[
            { label: 'SQLite (NuxtHub)', value: 'sqlite' },
            { label: 'PostgreSQL', value: 'pg' }
          ]"
        />
      </UFormField>

      <!-- Packages -->
      <UFormField label="Include Packages">
        <div class="space-y-2">
          <UCheckbox
            v-model="options.includeAuth"
            name="includeAuth"
            label="Authentication (@fyit/crouton-auth)"
          />
          <UCheckbox
            v-model="options.includeI18n"
            name="includeI18n"
            label="Internationalization (@fyit/crouton-i18n)"
          />
        </div>
      </UFormField>

      <!-- Info about per-collection options -->
      <div class="text-xs text-[var(--ui-text-muted)] p-2 bg-[var(--ui-bg-elevated)] rounded">
        Per-collection options (hierarchy, seed, etc.) are configured in each collection's settings.
        Dependencies will be installed automatically.
      </div>

      <!-- Summary -->
      <div class="p-3 bg-[var(--ui-bg-elevated)] rounded-lg text-sm space-y-2">
        <div class="font-medium">Will create:</div>
        <div class="text-[var(--ui-text-muted)]">
          <span class="font-mono">{{ targetPath }}/{{ projectName }}</span>
        </div>
        <div class="text-[var(--ui-text-muted)]">
          Layer: <span class="font-mono">{{ effectiveLayerName }}</span>
        </div>

        <!-- Packages (if in package mode) -->
        <template v-if="isPackageMode && packages.length > 0">
          <div class="text-[var(--ui-text-muted)]">
            <span class="font-medium">{{ packages.length }} Package{{ packages.length > 1 ? 's' : '' }}:</span>
          </div>
          <div class="pl-3 space-y-1">
            <div
              v-for="pkg in packages"
              :key="pkg.packageId"
              class="text-[var(--ui-text-muted)] flex items-center gap-2"
            >
              <UIcon :name="packageManifests.get(pkg.packageId)?.icon || 'i-lucide-package'" class="text-xs text-[var(--ui-primary)]" />
              <span class="font-mono">{{ packageManifests.get(pkg.packageId)?.name || pkg.packageId }}</span>
            </div>
          </div>
        </template>

        <!-- Collections -->
        <div v-if="effectiveCollections.length > 0" class="text-[var(--ui-text-muted)]">
          <span class="font-medium">{{ effectiveCollections.length }} {{ isPackageMode ? 'Custom ' : '' }}Collection{{ effectiveCollections.length > 1 ? 's' : '' }}:</span>
        </div>
        <div v-if="effectiveCollections.length > 0" class="pl-3 space-y-1">
          <div
            v-for="col in effectiveCollections"
            :key="col.id"
            class="text-[var(--ui-text-muted)] flex items-center gap-2"
          >
            <UIcon name="i-lucide-database" class="text-xs opacity-50" />
            <span class="font-mono">{{ col.collectionName }}</span>
            <span class="text-xs opacity-50">({{ col.fields.length }} fields)</span>
          </div>
        </div>
        <div v-else-if="!isPackageMode" class="text-[var(--ui-text-muted)] italic">
          No collections defined
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          @click="emit('close')"
        >
          Cancel
        </UButton>
        <UButton
          icon="i-lucide-rocket"
          :disabled="!projectName || !targetPath"
          @click="handleCreate"
        >
          Create Project
        </UButton>
      </div>
    </template>
  </div>
</template>
