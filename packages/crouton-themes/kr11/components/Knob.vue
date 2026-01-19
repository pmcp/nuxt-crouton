<script setup lang="ts">
/**
 * KrKnob - Rotary knob component
 * Styled after the KR-11's genre selector knob
 */
interface Props {
  modelValue?: number
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const rotation = computed(() => {
  const range = props.max - props.min
  const normalized = (props.modelValue - props.min) / range
  // Map to -135 to +135 degrees (270 degree range)
  return -135 + (normalized * 270)
})

const sizeClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }
  return map[props.size]
})

// Drag handling
const knobRef = ref<HTMLElement>()
const isDragging = ref(false)
const startY = ref(0)
const startValue = ref(0)

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  startY.value = e.clientY
  startValue.value = props.modelValue
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return

  const delta = startY.value - e.clientY
  const range = props.max - props.min
  const sensitivity = range / 100 // 100px for full range

  let newValue = startValue.value + (delta * sensitivity)
  newValue = Math.max(props.min, Math.min(props.max, newValue))

  emit('update:modelValue', Math.round(newValue))
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}
</script>

<template>
  <div
    ref="knobRef"
    class="kr-knob cursor-grab select-none"
    :class="[sizeClass, { 'cursor-grabbing': isDragging }]"
    :style="{ transform: `rotate(${rotation}deg)` }"
    @mousedown="handleMouseDown"
  />
</template>

<style scoped>
.kr-knob {
  transition: box-shadow 0.1s ease;
}

.kr-knob:active,
.cursor-grabbing {
  box-shadow:
    0 1px 2px var(--kr-knob-shadow),
    0 2px 4px var(--kr-knob-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
</style>
