// Generator for Field component folder (Input.vue, Select.vue, CardMini.vue)
import { toCase } from '../utils/helpers.mjs'

/**
 * Generate field-specific components for dependent field rendering
 * Creates [FieldName]/Input.vue, Select.vue, and CardMini.vue
 */
export function generateFieldComponents(fieldName, collectionData) {
  const { pascalCase: fieldPascalCase } = toCase(fieldName)
  const { pascalCase, pascalCasePlural, layerPascalCase } = collectionData

  return {
    input: generateInputComponent(fieldName, fieldPascalCase, collectionData),
    select: generateSelectComponent(fieldName, fieldPascalCase, collectionData),
    cardMini: generateCardMiniComponent(fieldName, fieldPascalCase, collectionData)
  }
}

/**
 * Generate Input.vue - for editing a single item (used as repeater item component)
 */
function generateInputComponent(fieldName, fieldPascalCase, collectionData) {
  const { layerPascalCase, pascalCasePlural } = collectionData

  return `<script setup lang="ts">
import { nanoid } from 'nanoid'

// TODO: Define your item interface
interface ${layerPascalCase}${pascalCasePlural}${fieldPascalCase}Item {
  id: string
  label?: string
  value?: string
  // Add your fields here
}

const model = defineModel<${layerPascalCase}${pascalCasePlural}${fieldPascalCase}Item>()

// Ensure stable ID on first creation
if (model.value && !model.value.id) {
  model.value = { ...model.value, id: nanoid() }
}
</script>

<template>
  <UFormField>
    <UInput
      v-model="model.label"
      class="w-full"
      size="xl"
      placeholder="Enter label"
    />
  </UFormField>
</template>
`
}

/**
 * Generate Select.vue - for selecting from options in dependent forms
 * Supports both single and multiple selection with array-based values
 * Uses CroutonFormDependentSelectOption for card-based rendering
 */
function generateSelectComponent(fieldName, fieldPascalCase, collectionData) {
  const { layerPascalCase, pascalCasePlural } = collectionData
  // Build the dependent collection name for component resolution
  const dependentCollection = `${layerPascalCase.toLowerCase()}${pascalCasePlural}`

  return `<template>
  <div>
    <div v-if="pending" class="flex items-center gap-2 text-sm text-gray-500">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
      Loading options...
    </div>

    <div v-else-if="error" class="text-sm text-red-500">
      Failed to load options
    </div>

    <div v-else-if="!dependentValue" class="text-sm text-gray-500">
      {{ dependentLabel }} required
    </div>

    <div v-else-if="!options || options.length === 0" class="text-sm text-gray-500">
      No options available
    </div>

    <CroutonFormDependentSelectOption
      v-else
      v-model="localValue"
      :options="options"
      :multiple="multiple"
      dependent-collection="${dependentCollection}"
      dependent-field="${fieldName}"
      :card-variant="cardVariant"
    />
  </div>
</template>

<script setup lang="ts">
interface Option {
  id: string
  label: string
  value?: string
}

interface Props {
  modelValue?: string[] | null     // Array for consistent handling
  options?: Option[]
  pending?: boolean
  error?: any
  dependentValue?: string | null
  dependentLabel?: string
  multiple?: boolean               // Support multiple selection
  cardVariant?: string             // Card size: 'Mini', 'Medium', 'Huge', etc.
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  pending: false,
  error: null,
  dependentValue: null,
  dependentLabel: 'Selection',
  multiple: false,
  cardVariant: 'Mini'
})

const emit = defineEmits<{
  'update:modelValue': [value: string[] | null]
}>()

// Local model for v-model binding
const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>
`
}

/**
 * Generate CardMini.vue - for displaying the field in tables/lists
 * Handles both source collection (array of objects) and target collection (resolved objects)
 */
function generateCardMiniComponent(fieldName, fieldPascalCase, collectionData) {
  return `<template>
  <div class="text-sm">
    <template v-if="normalizedValue.length > 0">
      <div class="flex flex-wrap gap-1">
        <UBadge
          v-for="(item, index) in normalizedValue.slice(0, 3)"
          :key="index"
          color="gray"
          variant="subtle"
        >
          {{ item.label || item.value || item }}
        </UBadge>
        <UBadge v-if="normalizedValue.length > 3" color="gray" variant="subtle">
          +{{ normalizedValue.length - 3 }} more
        </UBadge>
      </div>
    </template>
    <span v-else class="text-gray-400">—</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  value?: any[] | any | null  // Can be array of objects OR single object OR null
}

const props = defineProps<Props>()

// Normalize to array for consistent handling
// Handles both source (repeater with array) and target (dependent field with resolved objects)
const normalizedValue = computed(() => {
  if (!props.value) return []
  return Array.isArray(props.value) ? props.value : [props.value]
})
</script>
`
}
