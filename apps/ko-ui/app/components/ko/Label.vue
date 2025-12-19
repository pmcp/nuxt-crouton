<script setup lang="ts">
type LabelVariant = 'default' | 'dark' | 'orange'

interface Props {
  variant?: LabelVariant
  position?: 'above' | 'below'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  position: 'above'
})
</script>

<template>
  <div
    class="ko-label"
    :class="[
      `ko-label--${variant}`,
      `ko-label--${position}`
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.ko-label {
  font-family: 'ko-tech', sans-serif;
  font-size: 0.65em;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ko-text-dark);
}

.ko-label--above {
  padding-bottom: 0.5em;
}

.ko-label--below {
  padding-top: 0.5em;
}

.ko-label--default {
  color: var(--ko-text-dark);
}

.ko-label--dark {
  color: var(--ko-text-label);
}

.ko-label--orange {
  color: var(--ko-accent-orange);
}
</style>
