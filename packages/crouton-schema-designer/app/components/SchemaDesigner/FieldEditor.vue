<script setup lang="ts">
import type { FieldType, FieldMeta } from '../../types/schema'
import type { RefTargetOption } from '../../composables/useProjectComposer'

const { selectedField, selectedFieldId, updateField, selectField } = useSchemaDesigner()
const { FIELD_TYPES, META_PROPERTIES } = useFieldTypes()

// Try to use project composer for reference targets (may not be available in standalone mode)
let refTargets: Ref<RefTargetOption[]>
let hasProjectComposer = false

try {
  const composer = useProjectComposer()
  refTargets = computed(() => composer.getRefTargets())
  hasProjectComposer = true
} catch {
  // Project composer not available, use empty ref targets
  refTargets = ref([])
}

// Build grouped options for USelectMenu
const refTargetOptions = computed(() => {
  if (refTargets.value.length === 0) return []

  const options: { label: string; value: string; badge?: string; icon?: string }[] = []

  // Package collections
  const packageTargets = refTargets.value.filter(t => t.group === 'package')
  if (packageTargets.length > 0) {
    for (const target of packageTargets) {
      options.push({
        value: target.value,
        label: target.label,
        badge: 'package',
        icon: 'i-lucide-package'
      })
    }
  }

  // Custom collections
  const customTargets = refTargets.value.filter(t => t.group === 'custom')
  if (customTargets.length > 0) {
    for (const target of customTargets) {
      options.push({
        value: target.value,
        label: target.label,
        badge: 'custom',
        icon: 'i-lucide-layers'
      })
    }
  }

  return options
})

const hasRefTargetOptions = computed(() => refTargetOptions.value.length > 0)

const isOpen = computed({
  get: () => selectedFieldId.value !== null,
  set: (value) => {
    if (!value) selectField(null)
  }
})

// Local editable state
const localField = ref<{
  name: string
  type: FieldType
  meta: FieldMeta
  refTarget: string
}>({
  name: '',
  type: 'string',
  meta: {},
  refTarget: ''
})

// Flag to prevent recursive updates
const isSyncing = ref(false)

// Sync local state when selected field changes
watch(selectedField, (field) => {
  if (field) {
    isSyncing.value = true
    localField.value = {
      name: field.name,
      type: field.type,
      meta: { ...field.meta },
      refTarget: field.refTarget || ''
    }
    nextTick(() => {
      isSyncing.value = false
    })
  }
}, { immediate: true })

// Save changes
function saveChanges() {
  if (!selectedFieldId.value || isSyncing.value) return

  updateField(selectedFieldId.value, {
    name: localField.value.name,
    type: localField.value.type,
    meta: localField.value.meta,
    refTarget: localField.value.refTarget || undefined
  })
}

// Auto-save on change (debounced to avoid excessive updates)
watch(localField, saveChanges, { deep: true })

const typeOptions = computed(() =>
  FIELD_TYPES.map(ft => ({
    label: ft.label,
    value: ft.type,
    icon: ft.icon
  }))
)

const areaOptions = [
  { label: 'Main', value: 'main' },
  { label: 'Sidebar', value: 'sidebar' },
  { label: 'Meta', value: 'meta' }
]
</script>

<template>
  <USlideover v-model:open="isOpen" class="max-w-md">
    <template #content>
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Edit Field</h2>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            size="sm"
            @click="isOpen = false"
          />
        </div>

        <USeparator />

        <!-- Field Name -->
        <UFormField label="Field Name" required>
          <UInput
            v-model="localField.name"
            placeholder="e.g., title, price, description"
          />
        </UFormField>

        <!-- Field Type -->
        <UFormField label="Field Type">
          <USelectMenu
            v-model="localField.type"
            :items="typeOptions"
            value-key="value"
          >
            <template #leading>
              <UIcon
                :name="FIELD_TYPES.find(ft => ft.type === localField.type)?.icon || 'i-lucide-circle'"
              />
            </template>
          </USelectMenu>
        </UFormField>

        <USeparator label="Properties" />

        <!-- Required -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Required</div>
            <div class="text-xs text-[var(--ui-text-muted)]">Field must have a value</div>
          </div>
          <USwitch v-model="localField.meta.required" />
        </div>

        <!-- Max Length (for string/text) -->
        <UFormField
          v-if="['string', 'text'].includes(localField.type)"
          label="Max Length"
        >
          <UInput
            v-model.number="localField.meta.maxLength"
            type="number"
            placeholder="e.g., 200"
          />
        </UFormField>

        <!-- Label -->
        <UFormField label="Display Label">
          <UInput
            v-model="localField.meta.label"
            placeholder="Human-readable label"
          />
        </UFormField>

        <!-- Form Area -->
        <UFormField label="Form Area">
          <USelectMenu
            v-model="localField.meta.area"
            :items="areaOptions"
            value-key="value"
            placeholder="Select area"
          />
        </UFormField>

        <!-- Translatable -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Translatable</div>
            <div class="text-xs text-[var(--ui-text-muted)]">Enable i18n for this field</div>
          </div>
          <USwitch v-model="localField.meta.translatable" />
        </div>

        <!-- Unique -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Unique</div>
            <div class="text-xs text-[var(--ui-text-muted)]">Enforce unique values</div>
          </div>
          <USwitch v-model="localField.meta.unique" />
        </div>

        <!-- Default Value -->
        <UFormField label="Default Value">
          <UInput
            v-model="localField.meta.default"
            placeholder="Default value for new records"
          />
        </UFormField>

        <!-- Field Group -->
        <UFormField label="Field Group">
          <UInput
            v-model="localField.meta.group"
            placeholder="Group name"
          />
        </UFormField>

        <!-- Reference Target (for relations) -->
        <USeparator label="Relations" />

        <!-- Reference target picker when options available -->
        <template v-if="hasRefTargetOptions">
          <UFormField label="Reference Target">
            <USelectMenu
              v-model="localField.refTarget"
              :items="refTargetOptions"
              value-key="value"
              placeholder="Select a collection"
              searchable
              searchable-placeholder="Search collections..."
            >
              <template #leading>
                <UIcon
                  v-if="localField.refTarget"
                  :name="refTargetOptions.find(o => o.value === localField.refTarget)?.icon || 'i-lucide-link'"
                  class="text-[var(--ui-text-muted)]"
                />
                <UIcon v-else name="i-lucide-link" class="text-[var(--ui-text-muted)]" />
              </template>
              <template #item="{ item }">
                <div class="flex items-center gap-2 w-full">
                  <UIcon :name="item.icon || 'i-lucide-link'" class="text-[var(--ui-text-muted)]" />
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <UBadge
                    :color="item.badge === 'package' ? 'info' : 'success'"
                    size="xs"
                    variant="subtle"
                  >
                    {{ item.badge }}
                  </UBadge>
                </div>
              </template>
            </USelectMenu>
            <template #hint>
              Select a collection from packages or custom collections
            </template>
          </UFormField>

          <!-- Show current reference target info -->
          <div v-if="localField.refTarget" class="bg-[var(--ui-bg-elevated)] rounded-md p-3">
            <div class="flex items-center gap-2 mb-1">
              <UIcon
                :name="refTargetOptions.find(o => o.value === localField.refTarget)?.icon || 'i-lucide-link'"
                class="text-[var(--ui-text-muted)]"
              />
              <span class="text-sm font-medium">
                {{ refTargetOptions.find(o => o.value === localField.refTarget)?.label || localField.refTarget }}
              </span>
              <UBadge
                :color="refTargetOptions.find(o => o.value === localField.refTarget)?.badge === 'package' ? 'info' : 'success'"
                size="xs"
                variant="subtle"
              >
                {{ refTargetOptions.find(o => o.value === localField.refTarget)?.badge || 'custom' }}
              </UBadge>
            </div>
            <div class="text-xs text-[var(--ui-text-muted)] font-mono">
              {{ localField.refTarget }}
            </div>
          </div>
        </template>

        <!-- Fallback to text input when no options available -->
        <template v-else>
          <UFormField label="Reference Target">
            <UInput
              v-model="localField.refTarget"
              placeholder="e.g., :users or categories"
            />
            <template #hint>
              Use : prefix for external refs (e.g., :users)
            </template>
          </UFormField>
        </template>

        <!-- Decimal-specific -->
        <template v-if="localField.type === 'decimal'">
          <USeparator label="Decimal Options" />

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Precision">
              <UInput
                v-model.number="localField.meta.precision"
                type="number"
                placeholder="10"
              />
            </UFormField>
            <UFormField label="Scale">
              <UInput
                v-model.number="localField.meta.scale"
                type="number"
                placeholder="2"
              />
            </UFormField>
          </div>
        </template>
      </div>
    </template>
  </USlideover>
</template>
