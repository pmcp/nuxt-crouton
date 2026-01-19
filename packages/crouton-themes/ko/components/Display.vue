<script setup lang="ts">
interface Props {
  value?: string | number
  label?: string
  segments?: boolean
}

withDefaults(defineProps<Props>(), {
  value: '',
  label: '',
  segments: true
})
</script>

<template>
  <div class="ko-display">
    <div
      v-if="label"
      class="ko-display__label"
    >
      {{ label }}
    </div>
    <div class="ko-display__screen">
      <span :class="{ 'ko-display__segments': segments }">
        {{ value }}
      </span>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ko-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ko-display__label {
  font-family: 'ko-tech', sans-serif;
  font-size: 0.6em;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ko-accent-orange);
  background-color: var(--ko-surface-panel);
  padding: 2px 8px;
  border-radius: 2px;
  display: inline-block;
  width: fit-content;
}

.ko-display__screen {
  background-color: var(--ko-surface-panel);
  color: var(--ko-accent-orange);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'ko-tech', monospace;
  font-size: 1.5em;
  letter-spacing: 0.1em;
  min-width: 80px;
  text-align: right;
  box-shadow:
    inset 2px 2px 8px rgba(0, 0, 0, 0.5),
    inset -1px -1px 4px rgba(0, 0, 0, 0.3);
}

.ko-display__segments {
  /* Simulate 7-segment display look */
  text-shadow:
    0 0 10px var(--ko-accent-orange),
    0 0 20px rgba(250, 95, 40, 0.5);
}
</style>
