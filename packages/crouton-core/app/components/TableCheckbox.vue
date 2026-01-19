<script setup lang="ts">
interface Props {
  modelValue?: boolean | 'indeterminate'
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean | 'indeterminate']
}>()

const handleUpdate = (value: boolean | 'indeterminate') => {
  emit('update:modelValue', value)
}
</script>

<template>
  <UCheckbox
    :model-value="modelValue"
    @update:model-value="handleUpdate"
  />
</template>
