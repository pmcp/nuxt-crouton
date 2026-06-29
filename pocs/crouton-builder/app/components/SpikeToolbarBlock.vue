<script setup lang="ts">
/** SpikeToolbarBlock (#956) — a recognizable TOP BAR / toolbar block (title + search + actions). The
 *  natural thing to PIN to the top: short, full-width, clearly a header. */
</script>

<template>
  <!-- Intrinsic sizing (#954, "the component decides"): a toolbar is a BAR — a fixed ~56px height,
       full width. So wherever it's dropped (and especially pinned to an edge) it's a short bar, not a
       tall panel. -->
  <div class="flex h-14 w-full items-center gap-2 px-3">
    <UIcon name="i-lucide-layout-dashboard" class="size-5 shrink-0 text-primary" />
    <span class="text-sm font-semibold text-highlighted">Dashboard</span>
    <div class="ml-2 hidden min-w-0 flex-1 items-center gap-1.5 rounded-full border border-default bg-default px-2.5 py-1 text-xs text-dimmed sm:flex">
      <UIcon name="i-lucide-search" class="size-3.5" /> Search…
    </div>
    <div class="ml-auto flex items-center gap-1.5">
      <UIcon name="i-lucide-bell" class="size-4 text-muted" />
      <div class="grid size-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">AD</div>
    </div>
  </div>
</template>
