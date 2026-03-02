<script setup lang="ts">
/**
 * NumberTicker Effect Component
 *
 * Animated number counter that ticks up/down when scrolled into view.
 * Adapted from Inspira UI (https://inspira-ui.com)
 */
import { TransitionPresets, useElementVisibility, useTransition } from '@vueuse/core'

type TransitionsPresetsKeys = keyof typeof TransitionPresets

interface Props {
  value?: number
  direction?: 'up' | 'down'
  duration?: number
  delay?: number
  decimalPlaces?: number
  class?: string
  transition?: TransitionsPresetsKeys
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  direction: 'up',
  delay: 0,
  duration: 1000,
  decimalPlaces: 0,
  transition: 'easeOutCubic',
})

const spanRef = ref<HTMLSpanElement>()

const transitionValue = ref(props.direction === 'down' ? props.value : 0)

const transitionOutput = useTransition(transitionValue, {
  delay: props.delay,
  duration: props.duration,
  transition: TransitionPresets[props.transition],
})

const output = computed(() => {
  const val = typeof transitionOutput.value === 'number'
    ? transitionOutput.value
    : (transitionOutput.value as unknown as number)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: props.decimalPlaces,
    maximumFractionDigits: props.decimalPlaces,
  }).format(Number(val.toFixed(props.decimalPlaces)))
})

const isInView = useElementVisibility(spanRef, {
  threshold: 0,
})

const hasBeenInView = ref(false)

const stopIsInViewWatcher = watch(
  isInView,
  (isVisible: boolean) => {
    if (isVisible && !hasBeenInView.value) {
      hasBeenInView.value = true
      transitionValue.value = props.direction === 'down' ? 0 : props.value
      stopIsInViewWatcher()
    }
  },
  { immediate: true },
)

watch(
  () => props.value,
  (newVal: number) => {
    if (hasBeenInView.value) {
      transitionValue.value = props.direction === 'down' ? 0 : newVal
    }
  },
)
</script>

<template>
  <span
    ref="spanRef"
    class="inline-block tabular-nums tracking-wider"
    :class="[props.class]"
  >
    {{ output }}
  </span>
</template>
