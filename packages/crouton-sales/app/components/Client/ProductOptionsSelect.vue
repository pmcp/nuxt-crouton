<template>
  <div class="grid grid-cols-2 gap-2">
    <UCard
      v-for="option in options"
      :key="option.id"
      :class="[
        'cursor-pointer transition-all',
        isSelected(option.id)
          ? 'ring-2 ring-primary bg-primary/5'
          : 'hover:bg-muted/50'
      ]"
      :ui="{ body: 'p-3' }"
      @click="toggleOption(option.id)"
    >
      <div class="flex items-center justify-between">
        <span>{{ option.label }}</span>
        <span v-if="option.priceModifier && option.priceModifier > 0" class="text-sm text-muted">
          +${{ option.priceModifier.toFixed(2) }}
        </span>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ProductOption } from '../../types'

interface Props {
  modelValue: string | string[] | null
  options: ProductOption[]
  multipleAllowed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  multipleAllowed: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

function isSelected(optionId: string): boolean {
  if (!props.modelValue) return false
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.includes(optionId)
  }
  return props.modelValue === optionId
}

function toggleOption(optionId: string) {
  if (props.multipleAllowed) {
    const current = Array.isArray(props.modelValue) ? props.modelValue : []
    const newValue = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId]
    emit('update:modelValue', newValue.length > 0 ? newValue : null)
  }
  else {
    // Single select - toggle off if already selected, otherwise select
    emit('update:modelValue', props.modelValue === optionId ? null : optionId)
  }
}
</script>
