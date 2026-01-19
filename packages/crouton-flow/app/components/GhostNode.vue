<script setup lang="ts">
/**
 * GhostNode - Subtle shadow placeholder during drag-and-drop
 */

interface Props {
  data: Record<string, unknown>
}

defineProps<Props>()
</script>

<template>
  <div class="ghost-node" />
</template>

<style scoped>
.ghost-node {
  width: 140px;
  height: 48px;
  background: rgba(0, 0, 0, 0.06);
  border: 2px dashed rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  pointer-events: none;
}

.dark .ghost-node {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}
</style>
