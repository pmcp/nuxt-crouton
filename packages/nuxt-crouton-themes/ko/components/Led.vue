<script setup lang="ts">
type LedState = 'off' | 'on' | 'blink' | 'fast' | 'pulse' | 'alive'

interface Props {
  state?: LedState
  color?: 'orange' | 'red' | 'blue' | 'green'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  state: 'off',
  color: 'orange',
  size: 'md'
})

const sizeClasses = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3'
}
</script>

<template>
  <div
    class="ko-led rounded-full"
    :class="[
      sizeClasses[props.size],
      `ko-led--${props.state}`,
      `ko-led--${props.color}`
    ]"
  />
</template>

<style scoped>
.ko-led {
  /* Base off state */
  background-color: var(--ko-surface-panel);
  box-shadow: inset #863C22 0 -1px 9px;
  transition: all 0.15s ease;
}

/* === ON STATES === */
.ko-led--on.ko-led--orange {
  background-color: var(--ko-accent-orange);
  box-shadow:
    rgba(0, 0, 0, 0.2) 0 -1px 7px 1px,
    inset #F40 0 -1px 9px,
    #FA3C00 0 2px 12px;
}

.ko-led--on.ko-led--red {
  background-color: var(--ko-accent-red);
  box-shadow:
    rgba(0, 0, 0, 0.2) 0 -1px 7px 1px,
    inset #ff2020 0 -1px 9px,
    #ff0000 0 2px 12px;
}

.ko-led--on.ko-led--blue {
  background-color: var(--ko-accent-blue);
  box-shadow:
    rgba(0, 0, 0, 0.2) 0 -1px 7px 1px,
    inset #2080ff 0 -1px 9px,
    #1060ff 0 2px 12px;
}

.ko-led--on.ko-led--green {
  background-color: #28fa5f;
  box-shadow:
    rgba(0, 0, 0, 0.2) 0 -1px 7px 1px,
    inset #20ff40 0 -1px 9px,
    #00fa3c 0 2px 12px;
}

/* === ANIMATIONS === */
.ko-led--blink {
  animation: ko-led-blink 1s infinite;
}

.ko-led--fast {
  animation: ko-led-blink 150ms infinite;
}

.ko-led--pulse {
  animation: ko-led-blink 80ms infinite;
}

.ko-led--alive {
  animation: ko-led-alive 8s infinite;
}
</style>