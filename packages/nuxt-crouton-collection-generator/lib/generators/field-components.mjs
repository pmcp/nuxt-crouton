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
 */
function generateSelectComponent(fieldName, fieldPascalCase, collectionData) {
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

    <UButtonGroup v-else :ui="{ wrapper: 'flex flex-wrap gap-2' }">
      <UButton
        v-for="option in options"
        :key="option.id"
        :variant="modelValue === option.id ? 'solid' : 'outline'"
        :color="modelValue === option.id ? 'primary' : 'gray'"
        @click="handleSelect(option.id)"
      >
        {{ option.label }}
      </UButton>
    </UButtonGroup>
  </div>
</template>

<script setup lang="ts">
interface Option {
  id: string
  label: string
  value?: string
}

interface Props {
  modelValue?: string | null
  options?: Option[]
  pending?: boolean
  error?: any
  dependentValue?: string | null
  dependentLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  pending: false,
  error: null,
  dependentValue: null,
  dependentLabel: 'Selection'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const handleSelect = (id: string) => {
  emit('update:modelValue', id)
}
</script>
`
}

/**
 * Generate CardMini.vue - for displaying the field in tables/lists
 */
function generateCardMiniComponent(fieldName, fieldPascalCase, collectionData) {
  return `<template>
  <div class="text-sm">
    <template v-if="value && Array.isArray(value) && value.length > 0">
      <div class="flex flex-wrap gap-1">
        <UBadge
          v-for="(item, index) in value.slice(0, 3)"
          :key="index"
          color="gray"
          variant="subtle"
        >
          {{ item.label || item }}
        </UBadge>
        <UBadge v-if="value.length > 3" color="gray" variant="subtle">
          +{{ value.length - 3 }} more
        </UBadge>
      </div>
    </template>
    <span v-else class="text-gray-400">—</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  value?: any[] | string | null
}

defineProps<Props>()
</script>
`
}
