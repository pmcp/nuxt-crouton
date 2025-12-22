<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { ComponentNodeData } from '~/composables/useCanvasNodes'

const props = defineProps<NodeProps<ComponentNodeData>>()
</script>

<template>
  <div class="group-label-node">
    <span class="text-lg font-bold">{{ data.props.label }}</span>
    <UBadge variant="subtle" color="neutral" size="sm">
      {{ data.props.count }} components
    </UBadge>
  </div>
</template>

<style scoped>
.group-label-node {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--ui-bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--ui-border);
  min-width: 200px;
}
</style>
