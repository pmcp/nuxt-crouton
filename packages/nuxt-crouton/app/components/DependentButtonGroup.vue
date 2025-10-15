<template>
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
interface Props {
  modelValue?: string | null
  dependentValue?: string | null
  dependentCollection: string
  dependentField: string
  dependentLabel?: string
  idKey?: string
  labelKey?: string
  valueKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  dependentValue: null,
  dependentLabel: 'Selection',
  idKey: 'id',
  labelKey: 'label',
  valueKey: 'value'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

// Reactive fetch of the dependent item when dependentValue changes
const { item, pending, error } = await useCollectionItem(
  props.dependentCollection,
  () => props.dependentValue || ''
)

// Extract options from the dependent field
const options = computed(() => {
  if (!item.value || !props.dependentField) return []

  const fieldData = item.value[props.dependentField]

  if (!Array.isArray(fieldData)) return []

  // Map the field data to a consistent format
  return fieldData.map((option: any) => ({
    id: option[props.idKey],
    label: option[props.labelKey],
    value: option[props.valueKey]
  }))
})

// Watch for dependent value changes and clear selection if it changes
watch(() => props.dependentValue, (newValue, oldValue) => {
  // If the dependent value changes and we have a selection, clear it
  if (oldValue && newValue !== oldValue && props.modelValue) {
    emit('update:modelValue', null)
  }
})

// Watch for options changes and clear selection if current value is not in options
watch(options, (newOptions) => {
  if (props.modelValue && newOptions.length > 0) {
    const isValid = newOptions.some(opt => opt.id === props.modelValue)
    if (!isValid) {
      emit('update:modelValue', null)
    }
  }
})

const handleSelect = (id: string) => {
  emit('update:modelValue', id)
}
</script>