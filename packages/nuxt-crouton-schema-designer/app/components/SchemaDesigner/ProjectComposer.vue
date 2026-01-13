<script setup lang="ts">
import type { PackageManifest, PackageInstance, PackageSummary } from '../../types/package-manifest'
import type { CollectionSchema } from '../../types/schema'

const emit = defineEmits<{
  save: []
  export: []
}>()

// Use the project composer
const {
  projectName,
  baseLayerName,
  packages,
  packageManifests,
  hasPackages,
  customCollections,
  hasCustomCollections,
  validationErrors,
  isValid,
  addPackage,
  removePackage,
  setPackageConfigValue,
  updatePackageLayerName,
  getPackageManifest,
  addCollection,
  removeCollection,
  schemaDesigner
} = useProjectComposer()

// Tab state
type TabId = 'packages' | 'custom'
const activeTab = ref<TabId>('packages')

// Panel states
const showPackageBrowser = ref(false)
const selectedPackageId = ref<string | null>(null)
const selectedCollectionId = ref<string | null>(null)

// Get selected package IDs for the browser
const selectedPackageIds = computed(() => packages.value.map((p: PackageInstance) => p.packageId))

// Get selected package manifest
const selectedPackageManifest = computed<PackageManifest | null>(() => {
  if (!selectedPackageId.value) return null
  return getPackageManifest(selectedPackageId.value) || null
})

// Get selected package instance
const selectedPackageInstance = computed<PackageInstance | null>(() => {
  if (!selectedPackageId.value) return null
  return packages.value.find((p: PackageInstance) => p.packageId === selectedPackageId.value) || null
})

// Get selected collection
const selectedCollection = computed<CollectionSchema | null>(() => {
  if (!selectedCollectionId.value) return null
  return customCollections.value.find((c: CollectionSchema) => c.id === selectedCollectionId.value) || null
})

// Handle package toggle from browser
async function handlePackageToggle(packageId: string) {
  const isSelected = selectedPackageIds.value.includes(packageId)
  if (isSelected) {
    removePackage(packageId)
    if (selectedPackageId.value === packageId) {
      selectedPackageId.value = null
    }
  } else {
    await addPackage(packageId)
    selectedPackageId.value = packageId
    showPackageBrowser.value = false
  }
}

// Handle package selection from list
function handlePackageSelect(packageId: string) {
  selectedPackageId.value = packageId
  selectedCollectionId.value = null
}

// Handle package config update
function handlePackageConfigUpdate(key: string, value: unknown) {
  if (selectedPackageId.value) {
    setPackageConfigValue(selectedPackageId.value, key, value)
  }
}

// Handle package layer name update
function handlePackageLayerNameUpdate(name: string) {
  if (selectedPackageId.value) {
    updatePackageLayerName(selectedPackageId.value, name)
  }
}

// Handle package removal
function handleRemovePackage(packageId: string) {
  removePackage(packageId)
  if (selectedPackageId.value === packageId) {
    selectedPackageId.value = null
  }
}

// Handle collection selection
function handleCollectionSelect(collectionId: string) {
  selectedCollectionId.value = collectionId
  selectedPackageId.value = null
  // Also set in schema designer for editing
  schemaDesigner.setActiveCollection(collectionId)
}

// Handle add new collection
function handleAddCollection() {
  const id = addCollection()
  selectedCollectionId.value = id
  selectedPackageId.value = null
  schemaDesigner.setActiveCollection(id)
}

// Handle collection removal
function handleRemoveCollection(collectionId: string) {
  removeCollection(collectionId)
  if (selectedCollectionId.value === collectionId) {
    selectedCollectionId.value = null
  }
}

// Get config status for a package
function getPackageConfigStatus(pkg: PackageInstance): 'configured' | 'default' | 'incomplete' {
  const manifest = getPackageManifest(pkg.packageId)
  if (!manifest) return 'incomplete'

  const hasNonDefault = Object.entries(pkg.configuration).some(([key, value]) => {
    const option = (manifest.configuration || {})[key]
    return option && JSON.stringify(value) !== JSON.stringify(option.default)
  })

  return hasNonDefault ? 'configured' : 'default'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Project Info Header -->
    <div class="p-4 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]">
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Project Name" required>
          <UInput
            v-model="projectName"
            placeholder="My Crouton App"
            size="sm"
          />
        </UFormField>
        <UFormField label="Base Layer Name" required>
          <UInput
            v-model="baseLayerName"
            placeholder="app"
            size="sm"
          />
        </UFormField>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-1 min-h-0">
      <!-- Left Panel: Package/Collection List -->
      <div class="w-80 border-r border-[var(--ui-border)] flex flex-col bg-[var(--ui-bg)]">
        <!-- Tabs -->
        <div class="flex border-b border-[var(--ui-border)]">
          <button
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
            :class="[
              activeTab === 'packages'
                ? 'text-[var(--ui-primary)] border-b-2 border-[var(--ui-primary)]'
                : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
            ]"
            @click="activeTab = 'packages'"
          >
            <UIcon name="i-lucide-package" class="mr-2" />
            Packages
            <UBadge
              v-if="hasPackages"
              color="primary"
              variant="subtle"
              size="xs"
              class="ml-2"
            >
              {{ packages.length }}
            </UBadge>
          </button>
          <button
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
            :class="[
              activeTab === 'custom'
                ? 'text-[var(--ui-primary)] border-b-2 border-[var(--ui-primary)]'
                : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
            ]"
            @click="activeTab = 'custom'"
          >
            <UIcon name="i-lucide-database" class="mr-2" />
            Custom
            <UBadge
              v-if="hasCustomCollections"
              color="primary"
              variant="subtle"
              size="xs"
              class="ml-2"
            >
              {{ customCollections.length }}
            </UBadge>
          </button>
        </div>

        <!-- Package List -->
        <div
          v-if="activeTab === 'packages'"
          class="flex-1 overflow-y-auto"
        >
          <div class="p-2 space-y-1">
            <div
              v-for="pkg in packages"
              :key="pkg.packageId"
              class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
              :class="[
                selectedPackageId === pkg.packageId
                  ? 'bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20'
                  : 'hover:bg-[var(--ui-bg-elevated)] border border-transparent'
              ]"
              @click="handlePackageSelect(pkg.packageId)"
            >
              <UIcon
                :name="packageManifests.get(pkg.packageId)?.icon || 'i-lucide-package'"
                class="text-lg"
                :class="[
                  selectedPackageId === pkg.packageId
                    ? 'text-[var(--ui-primary)]'
                    : 'text-[var(--ui-text-muted)]'
                ]"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ packageManifests.get(pkg.packageId)?.name || pkg.packageId }}
                </p>
                <p class="text-xs text-[var(--ui-text-muted)]">
                  {{ pkg.layerName }}
                </p>
              </div>
              <UBadge
                :color="getPackageConfigStatus(pkg) === 'configured' ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                {{ getPackageConfigStatus(pkg) === 'configured' ? 'Configured' : 'Default' }}
              </UBadge>
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                @click.stop="handleRemovePackage(pkg.packageId)"
              >
                <UIcon name="i-lucide-x" />
              </UButton>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="packages.length === 0"
            class="p-4 text-center"
          >
            <UIcon
              name="i-lucide-package-open"
              class="text-3xl text-[var(--ui-text-muted)] mb-2"
            />
            <p class="text-sm text-[var(--ui-text-muted)]">No packages added</p>
            <p class="text-xs text-[var(--ui-text-dimmed)]">Browse packages to add functionality</p>
          </div>

          <!-- Add Package Button -->
          <div class="p-2 border-t border-[var(--ui-border)]">
            <UButton
              block
              color="primary"
              variant="soft"
              size="sm"
              @click="showPackageBrowser = true"
            >
              <template #leading>
                <UIcon name="i-lucide-plus" />
              </template>
              Browse Packages
            </UButton>
          </div>
        </div>

        <!-- Custom Collections List -->
        <div
          v-if="activeTab === 'custom'"
          class="flex-1 overflow-y-auto"
        >
          <div class="p-2 space-y-1">
            <div
              v-for="collection in customCollections"
              :key="collection.id"
              class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
              :class="[
                selectedCollectionId === collection.id
                  ? 'bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20'
                  : 'hover:bg-[var(--ui-bg-elevated)] border border-transparent'
              ]"
              @click="handleCollectionSelect(collection.id)"
            >
              <UIcon
                name="i-lucide-database"
                class="text-lg"
                :class="[
                  selectedCollectionId === collection.id
                    ? 'text-[var(--ui-primary)]'
                    : 'text-[var(--ui-text-muted)]'
                ]"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ collection.collectionName || 'Untitled' }}
                </p>
                <p class="text-xs text-[var(--ui-text-muted)]">
                  {{ collection.fields.length }} field{{ collection.fields.length !== 1 ? 's' : '' }}
                </p>
              </div>
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                @click.stop="handleRemoveCollection(collection.id)"
              >
                <UIcon name="i-lucide-x" />
              </UButton>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="customCollections.length === 0"
            class="p-4 text-center"
          >
            <UIcon
              name="i-lucide-database"
              class="text-3xl text-[var(--ui-text-muted)] mb-2"
            />
            <p class="text-sm text-[var(--ui-text-muted)]">No custom collections</p>
            <p class="text-xs text-[var(--ui-text-dimmed)]">Create your own collection schemas</p>
          </div>

          <!-- Add Collection Button -->
          <div class="p-2 border-t border-[var(--ui-border)]">
            <UButton
              block
              color="primary"
              variant="soft"
              size="sm"
              @click="handleAddCollection"
            >
              <template #leading>
                <UIcon name="i-lucide-plus" />
              </template>
              Add Collection
            </UButton>
          </div>
        </div>
      </div>

      <!-- Right Panel: Detail View -->
      <div class="flex-1 overflow-y-auto bg-[var(--ui-bg-muted)]">
        <!-- Package Config Panel -->
        <div
          v-if="selectedPackageId && selectedPackageManifest && selectedPackageInstance"
          class="p-6"
        >
          <CroutonSchemaDesignerPackageConfigPanel
            :manifest="selectedPackageManifest"
            :instance="selectedPackageInstance"
            @update:config="handlePackageConfigUpdate"
            @update:layer-name="handlePackageLayerNameUpdate"
          />
        </div>

        <!-- Collection Editor -->
        <div
          v-else-if="selectedCollectionId && selectedCollection"
          class="h-full"
        >
          <CroutonSchemaDesignerSchemaBuilder />
        </div>

        <!-- Empty State -->
        <div
          v-else
          class="flex items-center justify-center h-full"
        >
          <div class="text-center">
            <UIcon
              name="i-lucide-mouse-pointer-click"
              class="text-4xl text-[var(--ui-text-muted)] mb-4"
            />
            <p class="text-lg font-medium text-[var(--ui-text-muted)]">
              Select an item
            </p>
            <p class="text-sm text-[var(--ui-text-dimmed)]">
              Choose a package or collection to configure
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer: Validation & Actions -->
    <div class="p-4 border-t border-[var(--ui-border)] bg-[var(--ui-bg)]">
      <div class="flex items-center justify-between">
        <!-- Validation Status -->
        <div class="flex items-center gap-4">
          <div
            v-if="isValid"
            class="flex items-center gap-2 text-sm text-[var(--ui-success)]"
          >
            <UIcon name="i-lucide-check-circle" />
            Ready to export
          </div>
          <div
            v-else
            class="flex items-center gap-2 text-sm text-[var(--ui-error)]"
          >
            <UIcon name="i-lucide-alert-circle" />
            {{ validationErrors.length }} issue{{ validationErrors.length !== 1 ? 's' : '' }}
            <UTooltip
              :text="validationErrors.join('\n')"
            >
              <UIcon name="i-lucide-info" class="cursor-help" />
            </UTooltip>
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <div class="text-sm text-[var(--ui-text-muted)]">
            {{ packages.length }} package{{ packages.length !== 1 ? 's' : '' }}
            &middot;
            {{ customCollections.length }} custom collection{{ customCollections.length !== 1 ? 's' : '' }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="emit('save')"
          >
            <template #leading>
              <UIcon name="i-lucide-save" />
            </template>
            Save Project
          </UButton>
          <UButton
            color="primary"
            :disabled="!isValid"
            @click="emit('export')"
          >
            <template #leading>
              <UIcon name="i-lucide-download" />
            </template>
            Export
          </UButton>
        </div>
      </div>
    </div>

    <!-- Package Browser Modal -->
    <UModal
      v-model:open="showPackageBrowser"
      :ui="{ width: 'max-w-4xl' }"
    >
      <template #content="{ close }">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold">Browse Packages</h2>
              <p class="text-sm text-[var(--ui-text-muted)]">
                Add pre-built functionality to your project
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              @click="close"
            >
              <UIcon name="i-lucide-x" />
            </UButton>
          </div>

          <CroutonSchemaDesignerPackageBrowser
            :selected-package-ids="selectedPackageIds"
            @toggle="handlePackageToggle"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
