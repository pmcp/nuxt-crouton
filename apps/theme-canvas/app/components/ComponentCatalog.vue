<script setup lang="ts">
const { categories, getComponentsByCategory } = useComponentRegistry()
const { addNode } = useCanvasNodes()

function onDragStart(event: DragEvent, componentName: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('component', componentName)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function onDoubleClick(componentName: string) {
  // Add at center-ish position
  addNode(componentName, { x: 300, y: 200 })
}
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--ui-bg-elevated)]">
    <!-- Header -->
    <div class="p-4 border-b border-[var(--ui-border)]">
      <h2 class="font-semibold text-sm">Components</h2>
      <p class="text-xs opacity-60 mt-1">Drag to canvas or double-click</p>
    </div>

    <!-- Categories -->
    <div class="flex-1 overflow-y-auto p-2">
      <UAccordion
        :items="categories.map(c => ({ label: c.label, value: c.key, defaultOpen: true }))"
        multiple
      >
        <template #body="{ item }">
          <div class="grid grid-cols-2 gap-1 p-1">
            <div
              v-for="component in getComponentsByCategory(item.value)"
              :key="component.name"
              class="p-2 text-xs rounded cursor-grab hover:bg-[var(--ui-bg-accented)] transition-colors border border-transparent hover:border-[var(--ui-border)]"
              draggable="true"
              @dragstart="onDragStart($event, component.name)"
              @dblclick="onDoubleClick(component.name)"
            >
              {{ component.name }}
            </div>
          </div>
        </template>
      </UAccordion>
    </div>

    <!-- Quick add section -->
    <div class="p-3 border-t border-[var(--ui-border)]">
      <p class="text-xs opacity-60 mb-2">Quick Add</p>
      <div class="flex flex-wrap gap-1">
        <UButton
          v-for="name in ['UButton', 'UInput', 'UCard']"
          :key="name"
          :label="name.replace('U', '')"
          size="xs"
          variant="soft"
          @click="onDoubleClick(name)"
        />
      </div>
    </div>
  </div>
</template>
