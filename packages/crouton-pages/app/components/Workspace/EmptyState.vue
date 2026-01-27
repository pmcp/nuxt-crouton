<script setup lang="ts">
/**
 * Workspace Empty State - No Page Selected
 *
 * Shows a placeholder when no page is selected in the workspace.
 */

const { t } = useT()

const emit = defineEmits<{
  create: []
}>()
</script>

<template>
  <div class="h-full flex items-center justify-center bg-elevated/30">
    <div class="text-center max-w-md px-6">
      <div class="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-lucide-file-text" class="size-8 text-muted" />
      </div>

      <h3 class="text-lg font-semibold mb-2">
        {{ t('pages.workspace.emptyTitle') || 'Select a page' }}
      </h3>

      <p class="text-sm text-muted mb-6">
        {{ t('pages.workspace.emptyDescription') || 'Choose a page from the sidebar to edit, or create a new one.' }}
      </p>

      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="emit('create')"
      >
        {{ t('pages.create') || 'Create new page' }}
      </UButton>

      <div class="mt-8 pt-6 border-t border-default">
        <div class="text-xs text-muted space-y-2">
          <p class="font-medium">Keyboard shortcuts</p>
          <div class="flex items-center justify-center gap-4">
            <span><kbd class="px-1.5 py-0.5 bg-muted rounded text-xs">N</kbd> New page</span>
            <span><kbd class="px-1.5 py-0.5 bg-muted rounded text-xs">/</kbd> Search</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
