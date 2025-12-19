<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: number
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'orange'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  size: 'md',
  color: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const isDragging = ref(false)
const startY = ref(0)
const startValue = ref(0)

const rotation = computed(() => {
  const range = props.max - props.min
  const normalized = (props.modelValue - props.min) / range
  // Rotate from -135deg to 135deg (270deg total range)
  return -135 + (normalized * 270)
})

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
}

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  startY.value = e.clientY
  startValue.value = props.modelValue
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return

  const deltaY = startY.value - e.clientY
  const range = props.max - props.min
  const sensitivity = range / 100 // 100px drag = full range
  const newValue = Math.min(props.max, Math.max(props.min, startValue.value + deltaY * sensitivity))

  emit('update:modelValue', Math.round(newValue))
}

const handleMouseUp = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
}
</script>

<template>
  <div
    class="ko-knob"
    :class="[sizeClasses[props.size], `ko-knob--${props.color}`]"
    @mousedown="handleMouseDown"
  >
    <div
      class="ko-knob__dial"
      :style="{ transform: `rotate(${rotation}deg)` }"
    >
      <div class="ko-knob__indicator" />
    </div>
  </div>
</template>

<style scoped>
.ko-knob {
  position: relative;
  border-radius: 50%;
  cursor: grab;
  user-select: none;
}

.ko-knob:active {
  cursor: grabbing;
}

.ko-knob--default {
  background: radial-gradient(circle at 30% 30%,
    var(--ko-surface-light) 0%,
    var(--ko-surface-mid) 100%
  );
  box-shadow:
    var(--ko-shadow-drop),
    inset 2px 2px 4px rgba(255, 255, 255, 0.3),
    inset -2px -2px 4px rgba(0, 0, 0, 0.2);
}

.ko-knob--orange {
  background: radial-gradient(circle at 30% 30%,
    var(--ko-accent-orange) 0%,
    var(--ko-accent-orange-dark) 100%
  );
  box-shadow:
    var(--ko-shadow-drop),
    inset 2px 2px 4px rgba(255, 200, 150, 0.4),
    inset -2px -2px 4px rgba(0, 0, 0, 0.3);
}

.ko-knob__dial {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.05s ease-out;
}

.ko-knob__indicator {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 20%;
  background-color: var(--ko-text-light);
  border-radius: 2px;
}

.ko-knob--default .ko-knob__indicator {
  background-color: var(--ko-text-dark);
}
</style>
