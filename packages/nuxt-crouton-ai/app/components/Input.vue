<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  loading?: boolean
  placeholder?: string
  disabled?: boolean
  maxRows?: number
}>(), {
  modelValue: '',
  placeholder: 'Type a message...',
  maxRows: 6
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const canSubmit = computed(() => {
  return !props.loading && !props.disabled && inputValue.value.trim().length > 0
})

function handleKeydown(e: KeyboardEvent) {
  // Enter to send, Shift+Enter for newline
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (canSubmit.value) {
      emit('submit')
    }
  }
}

function handleSubmit() {
  if (canSubmit.value) {
    emit('submit')
  }
}
</script>

<template>
  <div class="flex gap-2 items-end p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    <UTextarea
      v-model="inputValue"
      :placeholder="placeholder"
      :disabled="disabled || loading"
      :rows="1"
      :maxrows="maxRows"
      autoresize
      class="flex-1"
      @keydown="handleKeydown"
    />
    <UButton
      icon="i-lucide-send"
      :loading="loading"
      :disabled="!canSubmit"
      color="primary"
      size="md"
      class="shrink-0"
      aria-label="Send message"
      @click="handleSubmit"
    />
  </div>
</template>
