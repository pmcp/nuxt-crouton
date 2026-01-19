<script setup lang="ts">
/**
 * KrDisplay - 7-segment LED display component
 * Mimics the red LED tempo display on the KR-11
 */
interface Props {
  value?: string | number
  digits?: number
  blink?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: '120',
  digits: 3,
  blink: false
})

const displayValue = computed(() => {
  const val = String(props.value)
  return val.padStart(props.digits, ' ')
})
</script>

<template>
  <div class="kr-display inline-flex items-center gap-1">
    <span
      class="kr-display-text"
      :class="{ 'kr-display-text--blink': blink }"
    >
      {{ displayValue }}
    </span>
  </div>
</template>

<style scoped>
.kr-display-text {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 0.1em;
}
</style>
