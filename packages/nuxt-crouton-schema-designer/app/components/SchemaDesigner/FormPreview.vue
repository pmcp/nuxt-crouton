<script setup lang="ts">
import type { SchemaField } from '../../types/schema'

interface Props {
  fields: SchemaField[]
  mode?: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  fields: () => [],
  mode: 'create'
})

const { generateValue } = useMockData()

// Generate form state based on mode
const formState = computed(() => {
  const state: Record<string, any> = {}

  for (const field of props.fields) {
    if (!field.name) continue

    if (props.mode === 'edit') {
      // Pre-fill with mock data
      state[field.name] = generateValue(field)
    } else {
      // Create mode: use defaults or empty values
      state[field.name] = field.meta.default ?? getEmptyValue(field.type)
    }
  }

  return state
})

function getEmptyValue(type: string): any {
  switch (type) {
    case 'string':
    case 'text':
    case 'uuid':
      return ''
    case 'number':
    case 'integer':
    case 'decimal':
      return null
    case 'boolean':
      return false
    case 'date':
    case 'datetime':
      return null
    case 'json':
      return {}
    case 'array':
    case 'repeater':
      return []
    default:
      return ''
  }
}

// Get the appropriate Nuxt UI component for each field type
function getFieldComponent(field: SchemaField): string {
  // Check if custom component is specified
  if (field.meta.component) {
    return field.meta.component
  }

  switch (field.type) {
    case 'string':
      return 'UInput'
    case 'text':
      return 'UTextarea'
    case 'number':
    case 'integer':
    case 'decimal':
      return 'UInputNumber'
    case 'boolean':
      return 'USwitch'
    case 'date':
      return 'UInputDate'
    case 'datetime':
      return 'UInputDate'
    case 'json':
      return 'UTextarea'
    case 'array':
      return 'UInputTags'
    case 'uuid':
      return 'UInput'
    case 'repeater':
      return 'UTextarea'
    default:
      return 'UInput'
  }
}

// Get input props for each field type
function getFieldProps(field: SchemaField): Record<string, any> {
  const baseProps: Record<string, any> = {
    disabled: true, // Read-only preview
    placeholder: field.meta.label || field.name
  }

  switch (field.type) {
    case 'text':
      return { ...baseProps, rows: 3 }
    case 'number':
    case 'integer':
      return { ...baseProps, step: 1 }
    case 'decimal':
      return {
        ...baseProps,
        step: Math.pow(10, -(field.meta.scale || 2))
      }
    case 'string':
      if (field.meta.maxLength) {
        return { ...baseProps, maxlength: field.meta.maxLength }
      }
      return baseProps
    case 'json':
    case 'repeater':
      return { ...baseProps, rows: 4, class: 'font-mono text-xs' }
    case 'datetime':
      return { ...baseProps, type: 'datetime-local' }
    default:
      return baseProps
  }
}

// Format value for display
function formatValue(field: SchemaField, value: any): any {
  if (value === null || value === undefined) return ''

  switch (field.type) {
    case 'json':
    case 'repeater':
    case 'array':
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : value
    case 'date':
    case 'datetime':
      return value instanceof Date ? value.toISOString().split('T')[0] : value
    case 'boolean':
      return !!value
    default:
      return value
  }
}

// Get field label
function getFieldLabel(field: SchemaField): string {
  return field.meta.label || field.name
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Empty state -->
    <div
      v-if="fields.length === 0 || !fields.some(f => f.name)"
      class="text-center text-[var(--ui-text-muted)] py-8"
    >
      <UIcon name="i-lucide-form-input" class="text-3xl mb-2" />
      <p class="text-sm">Add fields to see form preview</p>
    </div>

    <!-- Form preview -->
    <UForm v-else :state="formState" class="space-y-4">
      <template v-for="field in fields" :key="field.id">
        <UFormField
          v-if="field.name"
          :label="getFieldLabel(field)"
          :name="field.name"
          :required="field.meta.required"
        >
          <!-- Boolean / Switch -->
          <USwitch
            v-if="field.type === 'boolean'"
            :model-value="formatValue(field, formState[field.name])"
            disabled
          />

          <!-- Textarea for text, json, repeater -->
          <UTextarea
            v-else-if="['text', 'json', 'repeater'].includes(field.type)"
            :model-value="formatValue(field, formState[field.name])"
            v-bind="getFieldProps(field)"
          />

          <!-- Number input -->
          <UInputNumber
            v-else-if="['number', 'integer', 'decimal'].includes(field.type)"
            :model-value="formatValue(field, formState[field.name])"
            v-bind="getFieldProps(field)"
          />

          <!-- Date input -->
          <UInput
            v-else-if="['date', 'datetime'].includes(field.type)"
            :model-value="formatValue(field, formState[field.name])"
            :type="field.type === 'datetime' ? 'datetime-local' : 'date'"
            v-bind="getFieldProps(field)"
          />

          <!-- Array / Tags -->
          <UInputTags
            v-else-if="field.type === 'array'"
            :model-value="formState[field.name]"
            disabled
          />

          <!-- Default: text input -->
          <UInput
            v-else
            :model-value="formatValue(field, formState[field.name])"
            v-bind="getFieldProps(field)"
          />

          <!-- Field info -->
          <template #hint>
            <span class="text-xs text-[var(--ui-text-muted)]">
              {{ field.type }}
              <span v-if="field.meta.maxLength">(max: {{ field.meta.maxLength }})</span>
              <span v-if="field.meta.unique" class="ml-1">unique</span>
              <span v-if="field.meta.translatable" class="ml-1">translatable</span>
            </span>
          </template>
        </UFormField>
      </template>

      <!-- Metadata fields preview -->
      <USeparator class="my-4" />
      <p class="text-xs text-[var(--ui-text-muted)] mb-2">Auto-generated fields:</p>
      <div class="grid grid-cols-2 gap-4 opacity-50">
        <UFormField label="Created At" name="createdAt">
          <UInput type="datetime-local" disabled placeholder="Auto-generated" />
        </UFormField>
        <UFormField label="Updated At" name="updatedAt">
          <UInput type="datetime-local" disabled placeholder="Auto-generated" />
        </UFormField>
      </div>
    </UForm>
  </div>
</template>
