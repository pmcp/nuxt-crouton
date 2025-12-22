<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { VARIANTS, type VariantName } from '~/composables/useCanvasNodes'

const { nodes, addNode, populateAllComponents, clearCanvas, setAllVariants } = useCanvasNodes()
const { fitView } = useVueFlow()

// Global theme from useThemeSwitcher (sets variant mappings via updateAppConfig)
const { currentTheme, themes, setTheme } = useThemeSwitcher()

// View mode: 'canvas' or 'page'
type ViewMode = 'canvas' | 'page'
const viewMode = ref<ViewMode>('canvas')

// Global variant state for "Apply to All"
const globalVariant = ref<VariantName>('')

// Watch for variant changes and apply to all nodes
watch(globalVariant, (variant) => {
  setAllVariants(variant)
})

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

function handlePopulateAll() {
  populateAllComponents()
  // Fit view after populating (with a small delay for nodes to render)
  setTimeout(() => {
    fitView({ padding: 0.2 })
  }, 100)
}
</script>

<template>
  <div class="relative h-full">
    <!-- Toolbar -->
    <div class="absolute top-4 left-4 z-10 flex items-center gap-4 bg-[var(--ui-bg)]/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-[var(--ui-border)]">
      <!-- View Mode Toggle -->
      <UButtonGroup size="sm">
        <UButton
          icon="i-lucide-layout-dashboard"
          :variant="viewMode === 'canvas' ? 'solid' : 'ghost'"
          :color="viewMode === 'canvas' ? 'primary' : 'neutral'"
          @click="viewMode = 'canvas'"
        >
          Canvas
        </UButton>
        <UButton
          icon="i-lucide-scroll-text"
          :variant="viewMode === 'page' ? 'solid' : 'ghost'"
          :color="viewMode === 'page' ? 'primary' : 'neutral'"
          @click="viewMode = 'page'"
        >
          Page
        </UButton>
      </UButtonGroup>

      <USeparator orientation="vertical" class="h-6" />

      <!-- Canvas-only actions -->
      <template v-if="viewMode === 'canvas'">
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-layout-grid"
            label="Show All"
            size="sm"
            variant="soft"
            @click="handlePopulateAll"
          />
          <UButton
            icon="i-lucide-trash-2"
            label="Clear"
            size="sm"
            variant="soft"
            color="neutral"
            @click="clearCanvas"
          />
        </div>

        <USeparator orientation="vertical" class="h-6" />
      </template>

      <!-- Global theme/variant controls (shared) -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-[var(--ui-text-muted)]">Theme:</span>
        <USelectMenu
          :model-value="currentTheme"
          :items="themes.map(t => ({ value: t.name, label: t.label }))"
          value-key="value"
          size="sm"
          class="w-28"
          @update:model-value="setTheme($event)"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs text-[var(--ui-text-muted)]">Variant:</span>
        <USelectMenu
          v-model="globalVariant"
          :items="VARIANTS"
          value-key="value"
          size="sm"
          class="w-28"
        />
      </div>
    </div>

    <!-- Canvas View -->
    <VueFlow
      v-if="viewMode === 'canvas'"
      :nodes="nodes"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :min-zoom="0.1"
      :max-zoom="4"
      fit-view-on-init
      @drop="onDrop"
      @dragover="onDragOver"
    >
      <!-- Custom node types -->
      <template #node-component="nodeProps">
        <ComponentNode v-bind="nodeProps" />
      </template>

      <template #node-group-label="nodeProps">
        <GroupLabelNode v-bind="nodeProps" />
      </template>

      <!-- Background grid -->
      <Background pattern-color="var(--ui-border)" :gap="20" />

      <!-- Zoom/pan controls -->
      <Controls position="bottom-left" />

      <!-- Navigation minimap -->
      <MiniMap position="bottom-right" />
    </VueFlow>

    <!-- Page View -->
    <PageView
      v-else
      :variant="globalVariant || undefined"
      class="pt-16"
    />
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>
