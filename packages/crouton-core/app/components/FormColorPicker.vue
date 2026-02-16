<script setup lang="ts">
interface Props {
  modelValue?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '#FFFFFF',
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const color = computed({
  get: () => props.modelValue || '#FFFFFF',
  set: (value: string) => emit('update:modelValue', value)
})

// Editable hex input (syncs with picker, allows manual override)
const hexInput = ref(color.value)

// Sync input when picker changes
watch(color, (val) => {
  hexInput.value = val
})

// Apply manual hex input
const applyHex = () => {
  let val = hexInput.value.trim()
  if (!val.startsWith('#')) val = `#${val}`
  // Validate hex format
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
    color.value = val
  } else {
    // Reset to current valid color
    hexInput.value = color.value
  }
}
</script>

<template>
  <div class="flex gap-4 items-start">
    <UColorPicker v-model="color" :size="size" />
    <div class="flex flex-col gap-2 min-w-[120px]">
      <div
        class="w-full h-12 rounded-md border border-gray-200 dark:border-gray-700"
        :style="{ backgroundColor: color }"
      />
      <UInput
        v-model="hexInput"
        class="w-full font-mono text-sm"
        size="sm"
        placeholder="#000000"
        @blur="applyHex"
        @keydown.enter="applyHex"
      />
    </div>
  </div>
</template>
