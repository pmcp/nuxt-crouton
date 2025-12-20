<script setup lang="ts">
interface Props {
  dark?: boolean
  glass?: boolean
}

withDefaults(defineProps<Props>(), {
  dark: true,
  glass: true
})
</script>

<template>
  <div
    class="ko-panel"
    :class="{ 'ko-panel--dark': dark }"
  >
    <div class="ko-panel__content">
      <slot />
    </div>
    <div v-if="glass" class="ko-panel__glass" />
  </div>
</template>

<style scoped>
.ko-panel {
  width: 100%;
  height: auto;
  background-color: var(--ko-surface-light);
  color: var(--ko-text-dark);
  position: relative;
  overflow: hidden;
  font-family: 'ko-tech', sans-serif;
}

.ko-panel--dark {
  background-color: var(--ko-surface-panel);
  color: var(--ko-text-light);
}

.ko-panel__content {
  width: 100%;
  min-height: 4em;
  border-color: #323232;
  padding: var(--ko-spacing);
  border-style: solid;
  border-width: 0 var(--ko-spacing) 0 var(--ko-spacing);
  display: flex;
  align-items: center;
  font-size: 1em;
  padding-left: 1em;
  position: relative;
  z-index: 2;
}

/* Glass overlay effect - creates that glossy screen look */
.ko-panel__glass {
  position: absolute;
  z-index: 1;
  top: 0;
  left: -1em;
  width: 61%;
  height: 400%;
  opacity: 0.4;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(0, 0, 0, 0) 13%
  );
  clip-path: polygon(100% 0, 0 0, 0 100%);
  pointer-events: none;
}
</style>
