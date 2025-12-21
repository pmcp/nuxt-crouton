<script setup lang="ts">
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

const { nodes, addNode } = useCanvasNodes()

// Handle drop from catalog
function onDrop(event: DragEvent) {
  const componentName = event.dataTransfer?.getData('component')
  if (!componentName) return

  // Get drop position relative to flow
  const bounds = (event.target as HTMLElement)?.closest('.vue-flow')?.getBoundingClientRect()
  if (!bounds) return

  const position = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top
  }

  addNode(componentName, position)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}
</script>

<template>
  <VueFlow
    :nodes="nodes"
    :default-viewport="{ x: 0, y: 0, zoom: 1 }"
    :min-zoom="0.1"
    :max-zoom="4"
    fit-view-on-init
    @drop="onDrop"
    @dragover="onDragOver"
  >
    <!-- Custom node type -->
    <template #node-component="nodeProps">
      <ComponentNode v-bind="nodeProps" />
    </template>

    <!-- Background grid -->
    <Background pattern-color="var(--ui-border)" :gap="20" />

    <!-- Zoom/pan controls -->
    <Controls position="bottom-left" />

    <!-- Navigation minimap -->
    <MiniMap position="bottom-right" />
  </VueFlow>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>
