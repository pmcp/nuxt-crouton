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

    <UFieldGroup v-else :ui="{ wrapper: 'flex flex-wrap gap-2' }">
      <UButton
        v-for="option in options"
        :key="option.id"
        :variant="modelValue === option.id ? 'solid' : 'outline'"
        :color="modelValue === option.id ? 'primary' : 'gray'"
        @click="handleSelect(option.id)"
      >
        {{ option.label }}
      </UButton>
    </UFieldGroup>
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