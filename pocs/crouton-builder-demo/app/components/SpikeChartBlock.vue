<script setup lang="ts">
/** SpikeChartBlock (#956) — a recognizable CHART block for the demo palette (CSS bar chart). */
const bars = [40, 65, 50, 80, 60, 95, 70]
const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-3">
    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      <UIcon name="i-lucide-bar-chart-3" class="size-3.5" /> Bookings / week
    </div>
    <!-- Each column is FULL height (default items-stretch); the bar lives in a flex-1 track with a
         definite height, so the bar's `height: X%` resolves reliably. Anchoring the column to
         `items-end` collapsed the track to content height → % heights rounded to nothing (#975). -->
    <div class="flex min-h-0 flex-1 gap-1.5">
      <div v-for="(b, i) in bars" :key="i" class="flex min-w-0 flex-1 flex-col items-center gap-1">
        <div class="flex min-h-0 w-full flex-1 items-end">
          <div class="w-full rounded-t bg-primary/70" :style="{ height: `${b}%` }" />
        </div>
        <span class="text-[10px] text-dimmed">{{ days[i] }}</span>
      </div>
    </div>
  </div>
</template>
