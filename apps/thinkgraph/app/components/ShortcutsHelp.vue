<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const sections = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Esc', description: 'Close panel / clear selection' },
      { key: '/', description: 'Search & filter nodes' },
      { key: '?', description: 'Show this help' },
    ],
  },
  {
    title: 'Node Actions',
    shortcuts: [
      { key: 'N', description: 'New node' },
      { key: 'Q', description: 'Quick add (paste AI output)' },
      { key: 'P', description: 'Path type selector' },
      { key: 'D', description: 'Mark selected as done' },
      { key: 'W', description: 'Mark selected as working' },
      { key: 'Del', description: 'Delete selected node' },
    ],
  },
  {
    title: 'Multi-select',
    shortcuts: [
      { keys: ['Shift', 'Click'], description: 'Toggle node in multi-selection' },
      { key: 'Esc', description: 'Clear multi-selection' },
    ],
  },
]
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
        <div class="space-y-4">
          <div v-for="section in sections" :key="section.title">
            <p class="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">{{ section.title }}</p>
            <div class="space-y-1.5">
              <div v-for="s in section.shortcuts" :key="s.description" class="flex items-center gap-3 py-1">
                <div class="flex items-center gap-1 min-w-[60px]">
                  <template v-if="'keys' in s && s.keys">
                    <kbd
                      v-for="(k, i) in s.keys"
                      :key="i"
                      class="px-1.5 py-0.5 text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded"
                    >
                      {{ k }}
                    </kbd>
                  </template>
                  <kbd
                    v-else
                    class="px-2 py-0.5 text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded min-w-[28px] text-center"
                  >
                    {{ s.key }}
                  </kbd>
                </div>
                <span class="text-sm text-muted">{{ s.description }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-default">
          <p class="text-xs text-muted">Shortcuts are disabled while typing in inputs</p>
        </div>
      </div>
    </template>
  </UModal>
</template>
