<script setup lang="ts">
/**
 * KrPad - Drum pad button component
 * Styled after the KR-11's tactile pads
 */
interface Props {
  label?: string | number
  color?: 'cream' | 'coral' | 'gold' | 'mint'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'cream',
  size: 'md',
  disabled: false
})

const emit = defineEmits<{
  click: []
}>()

const colorClass = computed(() => {
  const map: Record<string, string> = {
    cream: '',
    coral: 'kr-pad--coral',
    gold: 'kr-pad--gold',
    mint: 'kr-pad--mint'
  }
  return map[props.color] || ''
})

const sizeClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-20 h-14 text-sm'
  }
  return map[props.size]
})
</script>

<template>
  <button
    class="kr-pad"
    :class="[colorClass, sizeClass]"
    :disabled="disabled"
    @click="emit('click')"
  >
    <slot>{{ label }}</slot>
  </button>
</template>
