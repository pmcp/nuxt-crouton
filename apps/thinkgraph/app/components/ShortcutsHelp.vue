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
  { key: 'I', description: 'Context inspector' },
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
            <kbd class="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded min-w-[32px] text-center">
              {{ s.key }}
            </kbd>
            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ s.description }}</span>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <p class="text-xs text-neutral-400">Shortcuts are disabled while typing in inputs</p>
        </div>
      </div>
    </template>
  </UModal>
</template>
