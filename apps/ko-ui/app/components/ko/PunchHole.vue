<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-5 h-5',
  lg: 'w-7 h-7'
}
</script>

<template>
  <div class="ko-punch-hole" :class="sizeClasses[size]">
    <slot />
  </div>
</template>

<style scoped>
.ko-punch-hole {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid currentColor;
  box-shadow:
    inset 2px 2px 4px currentColor,
    inset -1px -1px 2px currentColor;
  color: var(--ko-surface-dark);
}
</style>
