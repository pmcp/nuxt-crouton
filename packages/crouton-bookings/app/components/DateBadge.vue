<script setup lang="ts">
interface Props {
  date: Date | string
  size?: 'sm' | 'md'
  variant?: 'primary' | 'error' | 'muted' | 'elevated'
  highlighted?: boolean
  highlightColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  highlighted: false,
  highlightColor: undefined,
})

const parsed = computed(() => {
  const d = typeof props.date === 'string' ? new Date(props.date) : props.date
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
  }
})

// Compute highlight style for custom color
const highlightStyle = computed(() => {
  if (props.highlighted && props.highlightColor) {
    return { backgroundColor: props.highlightColor }
  }
  return undefined
})
</script>

<template>
  <div
    class="shrink-0 flex flex-col items-center justify-center transition-colors duration-200"
    :class="[
      props.size === 'sm' ? 'rounded p-1' : 'rounded-lg p-2 px-4',
      {
        'bg-error/10 text-error': props.variant === 'error',
        'bg-muted text-muted': props.variant === 'muted',
        'bg-elevated': props.variant === 'elevated',
        'bg-primary text-neutral-900': props.highlighted && !props.highlightColor,
        'text-neutral-900': props.highlighted && props.highlightColor,
        'bg-elevated text-muted': props.variant === 'primary' && !props.highlighted
      }
    ]"
    :style="highlightStyle"
  >
    <span class="text-[9px] font-medium uppercase tracking-wide">{{ parsed.weekday }}</span>
    <span class="text-2xl font-bold leading-tight">{{ parsed.day }}</span>
    <span class="text-[9px] font-medium uppercase tracking-wide">{{ parsed.month }}</span>
  </div>
</template>
