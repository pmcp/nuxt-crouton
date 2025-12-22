<script setup lang="ts">
import type { FieldType, FieldMeta } from '../../types/schema'

const { selectedField, selectedFieldId, updateField, selectField } = useSchemaDesigner()
const { FIELD_TYPES, META_PROPERTIES } = useFieldTypes()

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

        <UFormField label="Reference Target">
          <UInput
            v-model="localField.refTarget"
            placeholder="e.g., :users or categories"
          />
          <template #hint>
            Use : prefix for external refs (e.g., :users)
          </template>
        </UFormField>

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
