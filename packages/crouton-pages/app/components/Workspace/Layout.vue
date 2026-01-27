<script setup lang="ts">
/**
 * Workspace Layout - Split Panel Container
 *
 * A Finder-style split-view layout with a sidebar and main content area.
 * The sidebar shows the page tree; the main area shows the editor.
 *
 * @example
 * <CroutonPagesWorkspaceLayout>
 *   <template #sidebar>Page tree here</template>
 *   <template #default>Editor here</template>
 * </CroutonPagesWorkspaceLayout>
 */

interface Props {
  /** Width of the sidebar in pixels */
  sidebarWidth?: number
  /** Whether to show the sidebar border */
  showBorder?: boolean
}

withDefaults(defineProps<Props>(), {
  sidebarWidth: 280,
  showBorder: true
})
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- Sidebar -->
    <aside
      :style="{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }"
      :class="[
        'flex flex-col h-full overflow-hidden bg-elevated/50',
        showBorder && 'border-r border-default'
      ]"
    >
      <slot name="sidebar" />
    </aside>

    <!-- Main Content -->
    <main class="flex-1 h-full overflow-hidden flex flex-col">
      <slot />
    </main>
  </div>
</template>