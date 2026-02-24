<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import type { DesignerField, ProjectConfig } from '../types/schema'
import type { PackageCollectionEntry } from '../composables/useCollectionEditor'

const props = defineProps<{
  projectId: string
  projectConfig?: ProjectConfig
}>()

const packages = computed(() => props.projectConfig?.packages ?? [])
const editor = useCollectionEditor(toRef(props, 'projectId'), packages)
const { collectionsWithFields, packageCollections, loading } = editor
const { t } = useT()

// Package collection names for reference validation (references to package collections are valid)
const packageCollectionNames = computed(() => packageCollections.value.map(p => p.name))

// Resolve a human-readable package label (falls back to alias if no i18n key)
function getPackageLabel(alias: string): string {
  const key = `designer.packageLabels.${alias}`
  // Check if key exists before translating to avoid returning the key as the value
  try { const v = t(key); return v !== key ? v : alias } catch { return alias }
}

// Validation (user collections only, but knows about package collection names for ref checks)
const { issues, errors, warnings, getCollectionIssues, getFieldIssues } = useSchemaValidation(collectionsWithFields, packageCollectionNames)

// Pre-filtered issues: global issues not tied to any collection
const globalIssues = computed(() => issues.value.filter(i => !i.collectionId))

// Collection-level issues (no field) for a given collection
function getCollectionLevelIssues(collectionId: string) {
  return getCollectionIssues(collectionId).filter(i => !i.fieldId)
}

// Find the package collection entry matching an accordion item
function getPackageCollection(itemValue: string) {
  return packageCollections.value.find(p => p.id === itemValue)
}

// Return matching package collections as array (for v-for in scoped slots)
function getPackageCollectionList(itemValue: string) {
  return packageCollections.value.filter(p => p.id === itemValue)
}

// Provide editor to child components
provide('collectionEditor', editor)

// Initialize on mount
onMounted(() => editor.fetchAll())

// --- User collection accordion ---

const accordionItems = computed<AccordionItem[]>(() =>
  collectionsWithFields.value.map(col => {
    const colIssues = getCollectionIssues(col.id)
    const hasErrors = colIssues.some(i => i.type === 'error')
    return {
      label: col.name,
      value: col.id,
      icon: hasErrors ? 'i-lucide-alert-circle' : 'i-lucide-database',
      ui: hasErrors ? { trigger: 'text-[var(--ui-color-error-500)]' } : undefined
    }
  })
)

const expandedItems = ref<string[]>([])

// --- Package collection accordion ---

const expandedPackageItems = ref<string[]>([])

const packageAccordionItems = computed<AccordionItem[]>(() =>
  packageCollections.value.map(pkg => ({
    label: pkg.name,
    value: pkg.id,
    icon: 'i-lucide-package',
  }))
)

// --- Inline editing for collection name ---

const editingCollectionId = ref<string | null>(null)
const editCollectionName = ref('')

function startEditCollectionName(collectionId: string) {
  const col = collectionsWithFields.value.find(c => c.id === collectionId)
  if (!col) return
  editCollectionName.value = col.name
  editingCollectionId.value = collectionId
}

async function saveCollectionName(collectionId: string) {
  const trimmed = editCollectionName.value.trim()
  if (trimmed) {
    await editor.updateCollection(collectionId, { name: trimmed })
  }
  editingCollectionId.value = null
}

function getFieldCount(collectionId: string): number {
  return editor.fieldsByCollection.value.get(collectionId)?.length || 0
}

function getFields(collectionId: string): DesignerField[] {
  return editor.fieldsByCollection.value.get(collectionId) || []
}

// --- User collection actions ---

async function handleAddCollection() {
  const result = await editor.createCollection({ name: 'NewCollection' })
  expandedItems.value = [...expandedItems.value, result.id]
}

async function handleAddField(collectionId: string) {
  await editor.addField({
    collectionId,
    name: 'newField',
    type: 'string',
    sortOrder: String(getFieldCount(collectionId))
  })
}

async function handleDeleteCollection(collectionId: string) {
  await editor.deleteCollection(collectionId)
}

async function handleDeleteField(fieldId: string) {
  await editor.deleteField(fieldId)
}

async function handleUpdateField(fieldId: string, updates: { name?: string, type?: string, meta?: Record<string, any>, refTarget?: string }) {
  await editor.updateField(fieldId, updates)
}

async function handleReorderFields(collectionId: string, fieldIds: string[]) {
  await editor.reorderFields(collectionId, fieldIds)
}

// --- Extension field actions ---

function getAvailableExtensionFieldNames(pkg: PackageCollectionEntry): string[] {
  if (!pkg.extensionPoints.length) return []
  const usedNames = new Set(pkg.extensionFields.map(f => f.name))
  // Collect all allowed names across all extension points for this collection
  const allowed = pkg.extensionPoints.flatMap(ep => ep.allowedFields)
  return [...new Set(allowed)].filter(name => !usedNames.has(name))
}

async function handleAddExtensionField(pkg: PackageCollectionEntry, fieldName: string) {
  await editor.addExtensionField(pkg.packageAlias, pkg.name, {
    name: fieldName,
    type: 'string',
  })
}

async function handleDeleteExtensionField(fieldId: string) {
  await editor.deleteField(fieldId)
}

async function handleUpdateExtensionField(fieldId: string, updates: { name?: string, type?: string, meta?: Record<string, any>, refTarget?: string }) {
  await editor.updateField(fieldId, updates)
}

async function handleReorderExtensionFields(pkg: PackageCollectionEntry, fieldIds: string[]) {
  if (!pkg.extensionCollectionId) return
  await editor.reorderFields(pkg.extensionCollectionId, fieldIds)
}

// Expose editor for parent to use (AI tool wiring)
defineExpose({ editor })
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-semibold">{{ t('designer.collections.title') }}</h3>
        <UBadge v-if="errors.length > 0" color="error" variant="subtle" size="xs">
          {{ errors.length }} {{ errors.length === 1 ? t('designer.collections.issue') : t('designer.collections.issues') }}
        </UBadge>
        <UBadge v-else-if="warnings.length > 0" color="warning" variant="subtle" size="xs">
          {{ warnings.length }} {{ warnings.length === 1 ? t('designer.collections.warning') : t('designer.collections.warnings') }}
        </UBadge>
      </div>
      <UButton
        :label="t('designer.collections.addCollection')"
        icon="i-lucide-plus"
        size="sm"
        @click="handleAddCollection"
      />
    </div>

    <!-- Validation issues banner -->
    <div v-if="globalIssues.length > 0" class="space-y-1">
      <UAlert
        v-for="issue in globalIssues"
        :key="issue.code + issue.message"
        :color="issue.type === 'error' ? 'error' : 'warning'"
        variant="subtle"
        :icon="issue.type === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-alert-triangle'"
        :description="issue.message"
      />
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-[var(--ui-text-muted)]" />
    </div>

    <template v-else>
      <!-- Empty state (no user collections and no package collections) -->
      <div
        v-if="collectionsWithFields.length === 0 && packageCollections.length === 0"
        class="text-center py-12 text-[var(--ui-text-muted)]"
      >
        <UIcon name="i-lucide-database" class="size-12 mx-auto mb-3 opacity-50" />
        <p>{{ t('designer.collections.noCollections') }}</p>
        <p class="text-sm mt-1">{{ t('designer.collections.noCollectionsHint') }}</p>
      </div>

      <!-- User collections accordion -->
      <UAccordion
        v-if="collectionsWithFields.length > 0"
        v-model="expandedItems"
        type="multiple"
        :items="accordionItems"
      >
        <template #trailing="{ item }">
          <div class="flex items-center gap-2">
            <UTooltip
              v-if="getCollectionIssues(item.value as string).some(i => i.type === 'error')"
              :text="getCollectionIssues(item.value as string).filter(i => i.type === 'error').map(i => i.message).join(', ')"
            >
              <UIcon name="i-lucide-alert-circle" class="size-4 text-[var(--ui-color-error-500)]" />
            </UTooltip>

            <UBadge
              variant="subtle"
              color="neutral"
              size="xs"
              :label="t('designer.collections.fieldCount', { params: { count: getFieldCount(item.value as string) } })"
            />
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              @click.stop="startEditCollectionName(item.value as string)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click.stop="handleDeleteCollection(item.value as string)"
            />
          </div>
        </template>

        <template #body="{ item }">
          <div class="space-y-1">
            <!-- Inline collection name editor -->
            <div v-if="editingCollectionId === item.value" class="flex items-center gap-2 px-2 py-1.5 mb-2">
              <UInput
                v-model="editCollectionName"
                size="xs"
                class="flex-1 font-semibold"
                autofocus
                @keydown.enter="saveCollectionName(item.value as string)"
                @keydown.escape="editingCollectionId = null"
                @blur="saveCollectionName(item.value as string)"
              />
            </div>

            <!-- Collection-level validation issues -->
            <div
              v-for="issue in getCollectionLevelIssues(item.value as string)"
              :key="issue.code"
              class="flex items-center gap-2 text-xs px-2 py-1"
              :class="issue.type === 'error' ? 'text-[var(--ui-color-error-500)]' : 'text-[var(--ui-color-warning-500)]'"
            >
              <UIcon :name="issue.type === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-alert-triangle'" class="size-3 shrink-0" />
              {{ issue.message }}
            </div>

            <!-- Publishable toggle -->
            <div class="flex items-center gap-2 px-2 py-1.5">
              <USwitch
                :model-value="collectionsWithFields.find(c => c.id === item.value)?.publishable ?? false"
                size="xs"
                @update:model-value="(val) => editor.updateCollection(item.value as string, { publishable: val })"
              />
              <span class="text-xs text-[var(--ui-text-muted)]">{{ t('designer.collections.publishable') }}</span>
            </div>

            <!-- Field list with drag-to-reorder -->
            <DesignerFieldList
              :fields="getFields(item.value as string)"
              :collections="collectionsWithFields"
              :collection-id="item.value as string"
              @update-field="handleUpdateField"
              @delete-field="handleDeleteField"
              @add-field="handleAddField(item.value as string)"
              @reorder="(fieldIds) => handleReorderFields(item.value as string, fieldIds)"
            />
          </div>
        </template>
      </UAccordion>

      <!-- Package collections section -->
      <template v-if="packageCollections.length > 0">
        <USeparator
          v-if="collectionsWithFields.length > 0"
          class="my-2"
        />

        <div class="flex items-center gap-2 px-1">
          <UIcon name="i-lucide-package" class="size-4 text-[var(--ui-text-muted)] shrink-0" />
          <span class="text-sm font-medium text-[var(--ui-text-muted)]">{{ t('designer.packageCollections.title') }}</span>
        </div>

        <UAccordion
          v-model="expandedPackageItems"
          type="multiple"
          :items="packageAccordionItems"
        >
          <template #trailing="{ item }">
            <div
              v-for="pkg in getPackageCollectionList(item.value as string)"
              :key="pkg.id"
              class="flex items-center gap-2"
            >
              <!-- Package source badge -->
              <UBadge
                variant="subtle"
                color="primary"
                size="xs"
                :label="getPackageLabel(pkg.packageAlias)"
              />

              <!-- Custom field count (if any) -->
              <UBadge
                v-if="pkg.extensionFields.length"
                variant="subtle"
                color="neutral"
                size="xs"
                :label="`+${pkg.extensionFields.length}`"
              />

              <!-- Lock icon -->
              <UTooltip
                :text="t('designer.packageCollections.lockHint', { params: { package: getPackageLabel(pkg.packageAlias) } })"
              >
                <UIcon name="i-lucide-lock" class="size-3.5 text-[var(--ui-text-muted)]" />
              </UTooltip>
            </div>
          </template>

          <template #body="{ item }">
            <div
              v-for="pkg in getPackageCollectionList(item.value as string)"
              :key="pkg.id"
              class="space-y-3"
            >
              <!-- Package collection description -->
              <p v-if="pkg.description" class="text-xs text-[var(--ui-text-muted)] px-2">
                {{ pkg.description }}
              </p>

              <!-- Manifest fields (read-only) -->
              <template v-if="pkg.manifestSchema && Object.keys(pkg.manifestSchema).length > 0">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 px-1 pb-0.5">
                    <UIcon name="i-lucide-lock" class="size-3 text-[var(--ui-text-muted)]" />
                    <span class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('designer.packageCollections.packageFields') }}</span>
                  </div>
                  <div
                    v-for="(fieldDef, fieldName) in pkg.manifestSchema"
                    :key="fieldName"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--ui-bg-elevated)] opacity-70"
                  >
                    <UIcon name="i-lucide-lock" class="size-3 shrink-0 text-[var(--ui-text-dimmed)]" />
                    <span class="text-xs font-mono font-medium text-[var(--ui-text)]">{{ fieldName }}</span>
                    <UBadge variant="subtle" color="neutral" size="xs" :label="fieldDef.type" />
                    <span class="text-xs text-[var(--ui-text-dimmed)] ml-auto italic">{{ t('designer.packageCollections.fromPackage') }}</span>
                  </div>
                </div>
              </template>

              <!-- Extension points section -->
              <template v-if="pkg.extensionPoints.length > 0">
                <div class="space-y-2">
                  <!-- Section header -->
                  <div class="flex items-center justify-between px-1">
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-lucide-plus-circle" class="size-3.5 text-[var(--ui-text-muted)]" />
                      <span class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('designer.packageCollections.customFields') }}</span>
                    </div>
                  </div>

                  <!-- Extension hint -->
                  <p class="text-xs text-[var(--ui-text-muted)] px-2">
                    {{ pkg.extensionPoints[0]?.description }}
                  </p>

                  <!-- Existing extension fields -->
                  <DesignerFieldList
                    v-if="pkg.extensionFields.length > 0"
                    :fields="pkg.extensionFields"
                    :collections="collectionsWithFields"
                    :collection-id="pkg.extensionCollectionId ?? ''"
                    :hide-add-button="true"
                    @update-field="handleUpdateExtensionField"
                    @delete-field="handleDeleteExtensionField"
                    @add-field="() => {}"
                    @reorder="(fieldIds) => handleReorderExtensionFields(pkg, fieldIds)"
                  />

                  <!-- Add custom field chips -->
                  <div class="px-2">
                    <template v-if="getAvailableExtensionFieldNames(pkg).length > 0">
                      <p class="text-xs text-[var(--ui-text-muted)] mb-1.5">
                        {{ t('designer.packageCollections.allowedFieldsHint') }}
                      </p>
                      <div class="flex flex-wrap gap-1.5">
                        <UButton
                          v-for="fieldName in getAvailableExtensionFieldNames(pkg)"
                          :key="fieldName"
                          :label="fieldName"
                          icon="i-lucide-plus"
                          variant="outline"
                          color="neutral"
                          size="xs"
                          @click="handleAddExtensionField(pkg, fieldName)"
                        />
                      </div>
                    </template>
                    <p
                      v-else-if="pkg.extensionFields.length > 0"
                      class="text-xs text-[var(--ui-text-muted)] italic"
                    >
                      {{ t('designer.packageCollections.allFieldsAdded') }}
                    </p>
                  </div>
                </div>
              </template>

              <!-- No extension points -->
              <p
                v-else-if="!pkg.manifestSchema || Object.keys(pkg.manifestSchema).length === 0"
                class="text-xs text-[var(--ui-text-muted)] italic px-2"
              >
                {{ t('designer.packageCollections.noExtensionPoints') }}
              </p>
            </div>
          </template>
        </UAccordion>
      </template>
    </template>
  </div>
</template>