<script setup lang="ts">
/** SpikeFormBlock (#956) — a recognizable FORM block for the demo palette (labelled fields + a save
 *  button). Display-only faux inputs; distinct from the list/stats/chart blocks. */
const fields = [
  { label: 'Name', value: 'Aria Delgado' },
  { label: 'Role', value: 'Vocalist' },
  { label: 'Email', value: 'aria@band.fm' },
]
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-auto p-3">
    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      <UIcon name="i-lucide-square-pen" class="size-3.5" /> New artist
    </div>
    <div v-for="f in fields" :key="f.label" class="flex flex-col gap-1">
      <span class="text-xs text-muted">{{ f.label }}</span>
      <div class="truncate rounded-md border border-default bg-default px-2.5 py-1.5 text-sm text-dimmed">{{ f.value }}</div>
    </div>
    <div class="mt-auto flex justify-end pt-1">
      <span class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-inverted">Save</span>
    </div>
  </div>
</template>
