<script setup lang="ts">
/** SpikeListBlock (#956) — a recognizable LIST block for the demo palette (rows of artists). Distinct
 *  from the other demo blocks so you can SEE which block landed where in a composition/preview. */
const items = [
  { initials: 'AD', name: 'Aria Delgado', role: 'Vocalist' },
  { initials: 'MK', name: 'Milo Kane', role: 'Producer' },
  { initials: 'JS', name: 'June Soto', role: 'Guitarist' },
  { initials: 'RN', name: 'Remy Noor', role: 'Drummer' },
]
</script>

<template>
  <div class="flex h-full flex-col gap-2 overflow-auto p-3">
    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      <UIcon name="i-lucide-list" class="size-3.5" /> Artists
    </div>
    <div v-for="a in items" :key="a.initials" class="flex items-center gap-2.5 rounded-lg border border-default bg-elevated/40 px-2.5 py-2">
      <div class="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{{ a.initials }}</div>
      <div class="min-w-0">
        <div class="truncate text-sm font-medium text-highlighted">{{ a.name }}</div>
        <div class="truncate text-xs text-muted">{{ a.role }}</div>
      </div>
      <UIcon name="i-lucide-chevron-right" class="ml-auto size-4 text-dimmed" />
    </div>
  </div>
</template>
