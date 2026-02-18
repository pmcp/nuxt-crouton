<script setup lang="ts">
import type { DesignerField, FieldType } from '../types/schema'
import type { CollectionWithFields } from '../composables/useCollectionEditor'

const props = defineProps<{
  field: DesignerField
  collections: CollectionWithFields[]
}>()

const emit = defineEmits<{
  update: [updates: { name?: string, type?: string, meta?: Record<string, any>, refTarget?: string }]
  delete: []
}>()

const { getFieldIcon, translatedFieldTypes } = useFieldTypes()
const { t } = useT()

// --- State ---
const expanded = ref(false)
const editingName = ref(false)
const editName = ref(props.field.name)

// --- Computed ---
const meta = computed(() => props.field.meta || {})
const isRequired = computed(() => meta.value.required === true)
const isUnique = computed(() => meta.value.unique === true)
const fieldIcon = computed(() => getFieldIcon(props.field.type as FieldType))
const fieldTypeLabel = computed(() => translatedFieldTypes.value.find(ft => ft.type === props.field.type)?.label || props.field.type)
const isReference = computed(() => props.field.type === 'reference')

const refTargetName = computed(() => {
  if (!isReference.value || !props.field.refTarget) return ''
  return props.collections.find(c => c.name === props.field.refTarget)?.name
    || props.collections.find(c => c.id === props.field.refTarget)?.name
    || props.field.refTarget
})

// Fields in the same collection (for dependsOn parent field selection)
const siblingFields = computed(() => {
  const col = props.collections.find(c =>
    c.fields.some(f => f.id === props.field.id)
  )
  return col?.fields.filter(f => f.id !== props.field.id) || []
})

// Fields in the dependsOn target collection
const dependsOnCollectionFields = computed(() => {
  const targetName = meta.value.dependsOnCollection
  if (!targetName) return []
  const col = props.collections.find(c => c.name === targetName)
  return col?.fields || []
})

const areaOptions = computed(() => [
  { label: t('designer.fields.areaMain'), value: 'main' },
  { label: t('designer.fields.areaSidebar'), value: 'sidebar' },
  { label: t('designer.fields.areaMeta'), value: 'meta' }
])

// --- Methods ---
function updateMeta(key: string, value: any) {
  const updated = { ...meta.value, [key]: value }
  // Remove falsy boolean keys
  if (value === false || value === '' || value === undefined) {
    delete updated[key]
  }
  emit('update', { meta: updated })
}

function startEditName() {
  editName.value = props.field.name
  editingName.value = true
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`[data-field-name="${props.field.id}"]`)
    input?.focus()
    input?.select()
  })
}

function saveName() {
  const trimmed = editName.value.trim()
  if (trimmed && trimmed !== props.field.name) {
    emit('update', { name: trimmed })
  }
  editingName.value = false
}

function cancelEditName() {
  editingName.value = false
  editName.value = props.field.name
}

function handleTypeChange(type: string) {
  emit('update', { type })
}

function handleRefTargetChange(targetName: string) {
  emit('update', { refTarget: targetName })
}

const hasExpandableMeta = computed(() => {
  // Show expand chevron if type supports additional meta
  const type = props.field.type
  return ['string', 'text', 'number', 'integer', 'decimal', 'boolean', 'reference', 'array'].includes(type)
    || meta.value.label
    || meta.value.area
    || meta.value.group
    || meta.value.dependsOn
})
</script>

<template>
  <div class="rounded-md border border-transparent hover:border-[var(--ui-border)] transition-colors">
    <!-- Compact row -->
    <div class="flex items-center gap-2 px-2 py-1.5 group">
      <!-- Expand chevron -->
      <UButton
        variant="ghost"
        color="neutral"
        size="xs"
        :aria-expanded="expanded"
        class="shrink-0"
        @click="expanded = !expanded"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3.5 transition-transform"
          :class="{ 'rotate-90': expanded }"
        />
      </UButton>

      <!-- Field type icon -->
      <UIcon :name="fieldIcon" class="size-4 shrink-0 text-[var(--ui-text-muted)]" />

      <!-- Field name (click to edit) -->
      <div class="flex-1 min-w-0">
        <UInput
          v-if="editingName"
          v-model="editName"
          :data-field-name="field.id"
          size="xs"
          class="font-mono"
          autofocus
          @blur="saveName"
          @keydown.enter="saveName"
          @keydown.escape="cancelEditName"
        />
        <UButton
          v-else
          variant="link"
          color="neutral"
          size="xs"
          class="font-mono truncate text-left"
          @click="startEditName"
        >
          {{ field.name }}
        </UButton>
      </div>

      <!-- Field type dropdown -->
      <UDropdownMenu
        :items="translatedFieldTypes.map(ft => ({
          label: ft.label,
          icon: ft.icon,
          onSelect: () => handleTypeChange(ft.type)
        }))"
      >
        <UButton
          :label="fieldTypeLabel"
          variant="ghost"
          color="neutral"
          size="xs"
          class="font-mono"
        />
      </UDropdownMenu>

      <!-- Reference target selector -->
      <UDropdownMenu
        v-if="isReference"
        :items="collections.map(c => ({
          label: c.name,
          icon: 'i-lucide-database',
          onSelect: () => handleRefTargetChange(c.name)
        }))"
      >
        <UButton
          :label="refTargetName || t('designer.fields.selectTarget')"
          variant="outline"
          color="neutral"
          size="xs"
          icon="i-lucide-link"
        />
      </UDropdownMenu>

      <!-- Inline badges -->
      <UTooltip :text="isRequired ? t('designer.fields.clickToMakeOptional') : t('designer.fields.clickToMakeRequired')">
        <button class="shrink-0" @click="updateMeta('required', !isRequired)">
          <UBadge
            :color="isRequired ? 'primary' : 'neutral'"
            :variant="isRequired ? 'solid' : 'outline'"
            size="xs"
          >
            {{ isRequired ? 'req' : 'opt' }}
          </UBadge>
        </button>
      </UTooltip>

      <UTooltip v-if="isUnique" :text="t('designer.fields.uniqueConstraint')">
        <UBadge variant="subtle" color="warning" size="xs">uniq</UBadge>
      </UTooltip>

      <!-- Delete button -->
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        color="error"
        size="xs"
        class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        @click="emit('delete')"
      />
    </div>

    <!-- Expandable meta panel -->
    <div v-if="expanded" class="px-8 pb-3 pt-1 space-y-3 border-t border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]/50">
      <!-- Tier 1: Inline meta (always visible when expanded) -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.label') }}</label>
          <UInput
            :model-value="meta.label || ''"
            size="xs"
            :placeholder="t('designer.fields.displayLabel')"
            @update:model-value="updateMeta('label', $event)"
          />
        </div>
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.area') }}</label>
          <USelectMenu
            :model-value="meta.area || 'main'"
            :items="areaOptions"
            value-key="value"
            size="xs"
            @update:model-value="updateMeta('area', $event)"
          />
        </div>
      </div>

      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-xs">
          <USwitch
            :model-value="isRequired"
            size="xs"
            @update:model-value="updateMeta('required', $event)"
          />
          {{ t('designer.fields.required') }}
        </label>
        <label class="flex items-center gap-2 text-xs">
          <USwitch
            :model-value="isUnique"
            size="xs"
            @update:model-value="updateMeta('unique', $event)"
          />
          {{ t('designer.fields.unique') }}
        </label>
        <label v-if="['string', 'text'].includes(field.type)" class="flex items-center gap-2 text-xs">
          <USwitch
            :model-value="meta.translatable === true"
            size="xs"
            @update:model-value="updateMeta('translatable', $event)"
          />
          {{ t('designer.fields.translatable') }}
        </label>
      </div>

      <!-- Tier 2: Type-specific meta -->
      <div v-if="field.type === 'string'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.maxLength') }}</label>
          <UInput
            :model-value="meta.maxLength || ''"
            type="number"
            size="xs"
            placeholder="255"
            @update:model-value="updateMeta('maxLength', $event ? Number($event) : undefined)"
          />
        </div>
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.default') }}</label>
          <UInput
            :model-value="meta.default || ''"
            size="xs"
            :placeholder="t('designer.fields.defaultValue')"
            @update:model-value="updateMeta('default', $event)"
          />
        </div>
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.displayAs') }}</label>
          <USelectMenu
            :model-value="meta.displayAs || ''"
            :items="[
              { label: t('designer.fields.displayDefault'), value: '' },
              { label: t('designer.fields.displayOptionsSelect'), value: 'optionsSelect' },
              { label: t('designer.fields.displayButtonGroup'), value: 'slotButtonGroup' }
            ]"
            value-key="value"
            size="xs"
            @update:model-value="updateMeta('displayAs', $event || undefined)"
          />
        </div>
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.group') }}</label>
          <UInput
            :model-value="meta.group || ''"
            size="xs"
            :placeholder="t('designer.fields.fieldGroupName')"
            @update:model-value="updateMeta('group', $event || undefined)"
          />
        </div>
      </div>

      <!-- Options (for string fields with displayAs) -->
      <div v-if="field.type === 'string' && (meta.displayAs === 'optionsSelect' || meta.displayAs === 'slotButtonGroup' || (meta.options && meta.options.length > 0))">
        <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.optionsCommaSeparated') }}</label>
        <UInput
          :model-value="(meta.options || []).join(', ')"
          size="xs"
          :placeholder="t('designer.fields.optionsPlaceholder')"
          @update:model-value="updateMeta('options', $event ? $event.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined)"
        />
      </div>

      <!-- Dynamic options from collection -->
      <div v-if="field.type === 'string'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.optionsCollection') }}</label>
          <USelectMenu
            :model-value="meta.optionsCollection || ''"
            :items="[{ label: t('designer.fields.none'), value: '' }, ...collections.map(c => ({ label: c.name, value: c.name }))]"
            value-key="value"
            size="xs"
            @update:model-value="updateMeta('optionsCollection', $event || undefined)"
          />
        </div>
        <div v-if="meta.optionsCollection">
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.optionsField') }}</label>
          <USelectMenu
            :model-value="meta.optionsField || ''"
            :items="(collections.find(c => c.name === meta.optionsCollection)?.fields || []).map(f => ({ label: f.name, value: f.name }))"
            value-key="value"
            size="xs"
            @update:model-value="updateMeta('optionsField', $event || undefined)"
          />
        </div>
      </div>

      <!-- Reference-specific meta -->
      <div v-if="isReference" class="space-y-3">
        <label class="flex items-center gap-2 text-xs">
          <USwitch
            :model-value="meta.readOnly === true"
            size="xs"
            @update:model-value="updateMeta('readOnly', $event)"
          />
          {{ t('designer.fields.readOnly') }}
        </label>
      </div>

      <!-- Dependent field configuration -->
      <div v-if="['array', 'string', 'reference'].includes(field.type)" class="space-y-3">
        <USeparator :label="t('designer.fields.dependsOn')" />

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.parentField') }}</label>
            <USelectMenu
              :model-value="meta.dependsOn || ''"
              :items="[{ label: t('designer.fields.none'), value: '' }, ...siblingFields.map(f => ({ label: f.name, value: f.name }))]"
              value-key="value"
              size="xs"
              @update:model-value="updateMeta('dependsOn', $event || undefined)"
            />
          </div>
          <div>
            <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.sourceCollection') }}</label>
            <USelectMenu
              :model-value="meta.dependsOnCollection || ''"
              :items="[{ label: t('designer.fields.none'), value: '' }, ...collections.map(c => ({ label: c.name, value: c.name }))]"
              value-key="value"
              size="xs"
              @update:model-value="updateMeta('dependsOnCollection', $event || undefined)"
            />
          </div>
          <div v-if="meta.dependsOnCollection">
            <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.sourceField') }}</label>
            <USelectMenu
              :model-value="meta.dependsOnField || ''"
              :items="dependsOnCollectionFields.map(f => ({ label: f.name, value: f.name }))"
              value-key="value"
              size="xs"
              @update:model-value="updateMeta('dependsOnField', $event || undefined)"
            />
          </div>
        </div>
      </div>

      <!-- Number/Integer/Decimal specific -->
      <div v-if="['number', 'integer', 'decimal'].includes(field.type)" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.default') }}</label>
          <UInput
            :model-value="meta.default ?? ''"
            type="number"
            size="xs"
            :placeholder="t('designer.fields.defaultValue')"
            @update:model-value="updateMeta('default', $event !== '' ? Number($event) : undefined)"
          />
        </div>
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.group') }}</label>
          <UInput
            :model-value="meta.group || ''"
            size="xs"
            :placeholder="t('designer.fields.fieldGroupName')"
            @update:model-value="updateMeta('group', $event || undefined)"
          />
        </div>
      </div>

      <!-- Boolean specific -->
      <div v-if="field.type === 'boolean'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.default') }}</label>
          <USelectMenu
            :model-value="meta.default === true ? 'true' : meta.default === false ? 'false' : ''"
            :items="[
              { label: t('designer.fields.none'), value: '' },
              { label: t('designer.fields.true'), value: 'true' },
              { label: t('designer.fields.false'), value: 'false' }
            ]"
            value-key="value"
            size="xs"
            @update:model-value="updateMeta('default', $event === 'true' ? true : $event === 'false' ? false : undefined)"
          />
        </div>
      </div>

      <!-- Text specific -->
      <div v-if="field.type === 'text'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.default') }}</label>
          <UInput
            :model-value="meta.default || ''"
            size="xs"
            :placeholder="t('designer.fields.defaultValue')"
            @update:model-value="updateMeta('default', $event || undefined)"
          />
        </div>
        <div>
          <label class="text-xs text-[var(--ui-text-muted)] mb-1 block">{{ t('designer.fields.group') }}</label>
          <UInput
            :model-value="meta.group || ''"
            size="xs"
            :placeholder="t('designer.fields.fieldGroupName')"
            @update:model-value="updateMeta('group', $event || undefined)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
