<script setup lang="ts">
import type { ColorName } from '~/composables/useTheme'

interface Props {
  label: string
  colorName: ColorName
  modelValue: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { tailwindColors } = usePresets()

const items = tailwindColors.map(color => ({
  label: color.charAt(0).toUpperCase() + color.slice(1),
  click: () => emit('update:modelValue', color)
}))

// Get color preview class
const colorClass = computed(() => {
  return `bg-${props.modelValue}-500`
})
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <label class="text-sm font-medium">{{ label }}</label>
    <div class="flex items-center gap-2">
      <div
        :class="colorClass"
        class="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700"
      />
      <UDropdownMenu :items="[items]">
        <UButton
          :label="modelValue"
          color="white"
          trailing-icon="i-heroicons-chevron-down"
          size="sm"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>