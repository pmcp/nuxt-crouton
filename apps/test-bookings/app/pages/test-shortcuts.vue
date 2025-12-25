<script setup lang="ts">
/**
 * Test page for useCroutonShortcuts
 * Navigate to /test-shortcuts to test keyboard shortcuts
 */

const searchRef = ref<HTMLInputElement | null>(null)
const selected = ref<string[]>([])
const logs = ref<string[]>([])

const log = (msg: string) => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
  if (logs.value.length > 20) logs.value.pop()
}

const { formatShortcut, isActive, pause, resume } = useCroutonShortcuts({
  collection: 'bookingsBookings',
  selected,
  searchRef,
  handlers: {
    onCreate: () => log('CREATE triggered - would open new form'),
    onSave: () => log('SAVE triggered - would submit form'),
    onDelete: (ids) => log(`DELETE triggered for ${ids.length} items: ${ids.join(', ')}`),
  }
})

// Mock some selected items for delete testing
const toggleSelection = () => {
  if (selected.value.length) {
    selected.value = []
  } else {
    selected.value = ['item-1', 'item-2', 'item-3']
  }
}
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-2">Keyboard Shortcuts Test</h1>
    <p class="text-neutral-500 mb-6">Test the useCroutonShortcuts composable</p>

    <!-- Shortcut Reference -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="font-semibold">Available Shortcuts</h2>
      </template>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="flex items-center gap-2">
          <CroutonShortcutHint :shortcut="formatShortcut('create')" />
          <span>Create new</span>
        </div>
        <div class="flex items-center gap-2">
          <CroutonShortcutHint :shortcut="formatShortcut('save')" />
          <span>Save (in form)</span>
        </div>
        <div class="flex items-center gap-2">
          <CroutonShortcutHint :shortcut="formatShortcut('close')" />
          <span>Close form</span>
        </div>
        <div class="flex items-center gap-2">
          <CroutonShortcutHint :shortcut="formatShortcut('delete')" />
          <span>Delete selected</span>
        </div>
        <div class="flex items-center gap-2">
          <CroutonShortcutHint :shortcut="formatShortcut('search')" />
          <span>Focus search</span>
        </div>
        <div class="flex items-center gap-2">
          <kbd class="inline-flex items-center justify-center min-w-5 h-5 px-1 font-mono text-[11px] font-medium bg-(--ui-bg-muted) border border-(--ui-border) rounded">/</kbd>
          <span>Focus search (alt)</span>
        </div>
      </div>
    </UCard>

    <!-- Controls -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Test Controls</h2>
          <UBadge :color="isActive ? 'green' : 'red'">
            {{ isActive ? 'Shortcuts Active' : 'Shortcuts Paused' }}
          </UBadge>
        </div>
      </template>

      <div class="flex flex-wrap gap-4">
        <UInput
          ref="searchRef"
          placeholder="Search input (focus with ⌘K or /)"
          class="flex-1 min-w-[200px]"
        />

        <UButton @click="toggleSelection" variant="outline">
          {{ selected.length ? `Clear selection (${selected.length})` : 'Select 3 items' }}
        </UButton>

        <UButton @click="isActive ? pause() : resume()" :color="isActive ? 'yellow' : 'green'">
          {{ isActive ? 'Pause' : 'Resume' }}
        </UButton>
      </div>

      <p class="text-sm text-neutral-500 mt-4">
        <strong>Tip:</strong> Shortcuts are disabled when typing in the search input.
        Try pressing <CroutonShortcutHint :shortcut="formatShortcut('create')" /> while focused in the input vs outside.
      </p>
    </UCard>

    <!-- Event Log -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Event Log</h2>
          <UButton size="xs" variant="ghost" @click="logs = []">Clear</UButton>
        </div>
      </template>

      <div v-if="logs.length" class="font-mono text-sm space-y-1">
        <div v-for="(entry, i) in logs" :key="i" class="text-neutral-600">
          {{ entry }}
        </div>
      </div>
      <p v-else class="text-neutral-400 italic">
        Press keyboard shortcuts to see events here...
      </p>
    </UCard>
  </div>
</template>
