<template>
  <div class="flex items-center gap-1.5">
    <UInput
      :model-value="modelValue"
      @update:model-value="handleSearch"
      icon="i-lucide-search"
      :placeholder="placeholder"
      class="max-w-sm"
    />
  </div>
</template>

<script lang="ts" setup>
import { useDebounceFn } from '@vueuse/core'
import type { TableSearchProps } from '../types/table'

const props = withDefaults(defineProps<TableSearchProps>(), {
  placeholder: 'Search...',
  debounceMs: 300
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Debounced search handler
const handleSearch = useDebounceFn((value: string) => {
  emit('update:modelValue', value)
}, props.debounceMs)
</script>