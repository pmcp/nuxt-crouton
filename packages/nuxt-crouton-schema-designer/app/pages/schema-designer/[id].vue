<script setup lang="ts">
import type { SchemaProject, CollectionSchema } from '../../types'
import type { PackageInstance, SchemaProjectWithPackages, PackageCollection } from '../../types/package-manifest'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)

const { getProject, updateProject, loading } = useSchemaProjects()
const {
  state,
  collections,
  multiState,
  loadState,
  loadMultiState,
  isValid,
  validationErrors,
  reset
} = useSchemaDesigner()

// Project composer for package-aware editing
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
  loadProject,
  toProject,
  reset: resetComposer,
  getEnabledPackageCollections,
  schemaDesigner
} = useProjectComposer()

// Display info for header
const collectionCount = computed(() => collections.value.length)
const { isFieldFromAI } = useSchemaAI()

const project = ref<SchemaProject | null>(null)
const saving = ref(false)
const showExport = ref(false)
const projectLoaded = ref(false)

// Editing mode: 'custom' for custom collections, 'package' for package view
type EditMode = 'custom' | 'package'
const editMode = ref<EditMode>('custom')

// Selected package for viewing
const selectedPackageId = ref<string | null>(null)
const selectedPackageCollectionName = ref<string | null>(null)

// Get the selected package manifest
const selectedPackageManifest = computed(() => {
  if (!selectedPackageId.value) return null
  return packageManifests.value.get(selectedPackageId.value) || null
})

// Get the selected package instance
const selectedPackageInstance = computed(() => {
  if (!selectedPackageId.value) return null
  return packages.value.find((p: PackageInstance) => p.packageId === selectedPackageId.value) || null
})

// Get the selected package collection
const selectedPackageCollection = computed(() => {
  if (!selectedPackageId.value || !selectedPackageCollectionName.value || !selectedPackageManifest.value) {
    return null
  }
  return selectedPackageManifest.value.collections.find(
    (c: PackageCollection) => c.name === selectedPackageCollectionName.value
  ) || null
})

// Right panel view toggle
type RightPanelView = 'preview' | 'code'
const rightPanelView = ref<RightPanelView>('preview')

// Load project on mount
onMounted(async () => {
  if (projectId.value && projectId.value !== 'new') {
    try {
      project.value = await getProject(projectId.value)

      // Load the schema state
      if (project.value) {
        // Check if project has packages (new format)
        const projectWithPackages = project.value as SchemaProjectWithPackages

        if (projectWithPackages.packages && projectWithPackages.packages.length > 0) {
          // Load using project composer (package-aware mode)
          await loadProject(projectWithPackages)
          projectLoaded.value = true

          // Set edit mode based on project content
          if (projectWithPackages.packages.length > 0 && !customCollections.value.length) {
            editMode.value = 'package'
            selectedPackageId.value = projectWithPackages.packages[0]?.packageId || null
          }
        } else if (project.value.collections && project.value.collections.length > 0) {
          // Use multi-collection loading if collections available (legacy multi-collection)
          loadMultiState(project.value.layerName, project.value.collections as CollectionSchema[])
          projectLoaded.value = true

          // Also load into composer
          projectName.value = project.value.name
          baseLayerName.value = project.value.layerName
        } else {
          // Fallback to legacy single-collection loading
          loadState({
            collectionName: project.value.collectionName,
            layerName: project.value.layerName,
            fields: project.value.schema.fields || [],
            options: project.value.options,
            cardTemplate: project.value.schema.cardTemplate
          })
          projectLoaded.value = true

          // Also update composer state
          projectName.value = project.value.name
          baseLayerName.value = project.value.layerName
        }
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

    // Save using new format with packages
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

// Handle package selection
function handleSelectPackage(packageId: string, collectionName?: string) {
  editMode.value = 'package'
  selectedPackageId.value = packageId
  selectedPackageCollectionName.value = collectionName || null
}

// Handle custom collection selection
function handleSelectCustom() {
  editMode.value = 'custom'
  selectedPackageId.value = null
  selectedPackageCollectionName.value = null
}

// Get all package collections for tab display
const allPackageCollections = computed(() => {
  const result: { packageId: string; packageName: string; collection: PackageCollection }[] = []

  for (const pkg of packages.value) {
    const manifest = packageManifests.value.get(pkg.packageId)
    if (!manifest) continue

    const enabledCollections = getEnabledPackageCollections(pkg.packageId)
    for (const collection of enabledCollections) {
      result.push({
        packageId: pkg.packageId,
        packageName: manifest.name,
        collection
      })
    }
  }

  return result
})
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
          <div v-if="project" class="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-layers" class="size-3" />
              {{ baseLayerName || state.layerName }}
            </span>
            <span v-if="hasPackages" class="text-[var(--ui-border)]">|</span>
            <span v-if="hasPackages" class="flex items-center gap-1">
              <UIcon name="i-lucide-package" class="size-3" />
              {{ packages.length }} {{ packages.length === 1 ? 'package' : 'packages' }}
            </span>
            <span class="text-[var(--ui-border)]">|</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-database" class="size-3" />
              {{ collectionCount }} {{ collectionCount === 1 ? 'collection' : 'collections' }}
            </span>
          </div>
        </div>
        <UBadge v-if="saving" variant="soft" color="warning" size="xs">
          Saving...
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-trash-2"
          @click="reset(); resetComposer()"
        >
          Reset
        </UButton>
        <UButton
          icon="i-lucide-download"
          :disabled="!composerIsValid"
          @click="showExport = true"
        >
          Export Schema
        </UButton>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
    </div>

    <!-- Main Content -->
    <div v-if="!loading && projectLoaded" class="flex-1 flex overflow-hidden">
      <!-- Left: AI Chat Panel -->
      <CroutonSchemaDesignerAIChatPanel />

      <!-- Center: Collection Selection + Editor -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Tab Navigation: Packages + Custom Collections -->
        <div class="border-b border-[var(--ui-border)] bg-[var(--ui-bg)] overflow-x-auto">
          <div class="flex items-center p-2 gap-1">
            <!-- Package Collections Tabs -->
            <template v-for="item in allPackageCollections" :key="`${item.packageId}-${item.collection.name}`">
              <button
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                :class="[
                  editMode === 'package' &&
                  selectedPackageId === item.packageId &&
                  selectedPackageCollectionName === item.collection.name
                    ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20'
                    : 'hover:bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)] border border-transparent'
                ]"
                @click="handleSelectPackage(item.packageId, item.collection.name)"
              >
                <UIcon :name="packageManifests.get(item.packageId)?.icon || 'i-lucide-package'" />
                <span>{{ item.collection.name }}</span>
                <UBadge color="neutral" variant="subtle" size="xs">pkg</UBadge>
              </button>
            </template>

            <!-- Separator if both exist -->
            <USeparator
              v-if="hasPackages && hasCustomCollections"
              orientation="vertical"
              class="h-6 mx-2"
            />

            <!-- Custom Collections Tabs -->
            <CroutonSchemaDesignerCollectionTabs
              v-if="hasCustomCollections || !hasPackages"
              class="flex-1"
              @click.capture="handleSelectCustom"
            />

            <!-- Add custom collection button if only packages exist -->
            <UButton
              v-if="hasPackages && !hasCustomCollections"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="handleSelectCustom"
            >
              <template #leading>
                <UIcon name="i-lucide-plus" />
              </template>
              Add Custom Collection
            </UButton>
          </div>
        </div>

        <!-- Editor Area -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Package View Mode -->
          <template v-if="editMode === 'package' && selectedPackageId">
            <div class="flex-1 flex overflow-hidden">
              <!-- Package Collection View (Read-only) -->
              <main class="flex-1 overflow-y-auto bg-[var(--ui-bg)] p-6">
                <div v-if="selectedPackageCollection">
                  <div class="max-w-3xl mx-auto">
                    <!-- Package Info Header -->
                    <div class="mb-6 p-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
                      <div class="flex items-center gap-3 mb-2">
                        <UIcon
                          :name="selectedPackageManifest?.icon || 'i-lucide-package'"
                          class="text-2xl text-[var(--ui-primary)]"
                        />
                        <div>
                          <h2 class="font-semibold">{{ selectedPackageCollection.name }}</h2>
                          <p class="text-sm text-[var(--ui-text-muted)]">
                            {{ selectedPackageManifest?.name }} &middot; {{ selectedPackageInstance?.layerName }}
                          </p>
                        </div>
                        <UBadge color="neutral" variant="soft" class="ml-auto">
                          Read-only (Package)
                        </UBadge>
                      </div>
                      <p v-if="selectedPackageCollection.description" class="text-sm text-[var(--ui-text-muted)]">
                        {{ selectedPackageCollection.description }}
                      </p>
                    </div>

                    <!-- Collection View -->
                    <SchemaDesignerPackageCollectionView
                      :collection="selectedPackageCollection"
                      :package-id="selectedPackageId"
                    />
                  </div>
                </div>
                <div v-else class="flex items-center justify-center h-full">
                  <div class="text-center">
                    <UIcon name="i-lucide-package" class="text-4xl text-[var(--ui-text-muted)] mb-4" />
                    <p class="text-lg font-medium text-[var(--ui-text-muted)]">Select a collection</p>
                  </div>
                </div>
              </main>

              <!-- Package Config Panel (Right) -->
              <aside
                v-if="selectedPackageManifest && selectedPackageInstance"
                class="w-80 border-l border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-y-auto"
              >
                <div class="p-4">
                  <h3 class="font-semibold mb-4">Package Configuration</h3>
                  <SchemaDesignerPackageConfigPanel
                    :manifest="selectedPackageManifest"
                    :instance="selectedPackageInstance"
                    compact
                  />
                </div>
              </aside>
            </div>
          </template>

          <!-- Custom Collection Edit Mode -->
          <template v-else>
            <!-- Field Catalog -->
            <aside class="w-64 border-r border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-y-auto">
              <CroutonSchemaDesignerFieldCatalog />
            </aside>

            <!-- Center: Schema Builder -->
            <main class="flex-1 overflow-y-auto bg-[var(--ui-bg)]">
              <CroutonSchemaDesignerSchemaBuilder :is-field-from-ai="isFieldFromAI" />
            </main>

            <!-- Right: Preview/Code Panel (50% width) -->
            <aside class="w-1/2 border-l border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden flex flex-col">
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
          </template>
        </div>
      </div>
    </div>

    <!-- Validation Errors -->
    <div
      v-if="composerValidationErrors.length > 0"
      class="border-t border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2"
    >
      <div class="flex items-center gap-2 text-sm text-[var(--ui-text-muted)]">
        <UIcon name="i-lucide-alert-circle" class="text-amber-500" />
        <span>{{ composerValidationErrors[0] }}</span>
        <span v-if="composerValidationErrors.length > 1" class="text-xs">
          (+{{ composerValidationErrors.length - 1 }} more)
        </span>
      </div>
    </div>

    <!-- Export Modal -->
    <CroutonSchemaDesignerExportPanel v-model="showExport" />
  </div>
</template>
