<script setup lang="ts">
const showCatalog = ref(true)
</script>

<template>
  <div class="h-screen flex">
    <!-- Sidebar: Component Catalog -->
    <ComponentCatalog
      v-if="showCatalog"
      class="w-64 flex-shrink-0 border-r border-[var(--ui-border)]"
    />

    <!-- Main Canvas Area -->
    <div class="flex-1 relative">
      <!-- Toggle Catalog Button -->
      <UButton
        class="absolute top-4 left-4 z-10"
        :icon="showCatalog ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
        variant="ghost"
        size="sm"
        @click="showCatalog = !showCatalog"
      />

      <Canvas class="w-full h-full" />
    </div>
  </div>
</template>
