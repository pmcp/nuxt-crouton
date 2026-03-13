<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const shortcuts = [
  { key: 'S', description: 'Star / unstar selected node' },
  { key: 'P', description: 'Park / unpark selected node' },
  { key: 'N', description: 'New child node' },
  { key: 'Q', description: 'Quick add (paste)' },
  { key: 'E', description: 'Expand with AI' },
  { key: 'C', description: 'Chat about node' },
  { key: 'G', description: 'Global chat' },
  { key: '/', description: 'Search & filter' },
  { key: '?', description: 'Show shortcuts' },
  { key: 'Esc', description: 'Clear selection' },
  { key: 'Del', description: 'Delete selected' },
]
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="s in shortcuts" :key="s.key" class="flex items-center gap-3 py-1.5">
            <kbd class="px-2 py-1 text-xs font-mono bg-elevated border border-default rounded min-w-[32px] text-center">
              {{ s.key }}
            </kbd>
            <span class="text-sm text-muted">{{ s.description }}</span>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-default">
          <p class="text-xs text-muted">Shortcuts are disabled while typing in inputs</p>
        </div>
      </div>
    </template>
  </UModal>
</template>
