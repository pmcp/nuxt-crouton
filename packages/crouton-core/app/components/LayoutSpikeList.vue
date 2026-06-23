<script setup lang="ts">
/**
 * CroutonLayoutSpikeList — a throwaway, self-contained "list block" for the
 * layout spike (#713/#704). Demonstrates a registered block that takes a
 * user-editable `heading` (validated via the block's configSchema). Real
 * data-bound list blocks (CroutonCollection bound to a collection) get wired
 * when the registry meets real collections in Sprint 4.
 */
withDefaults(defineProps<{ heading?: string }>(), { heading: 'Items' })

const rows = [
  { title: 'Court A — Morning', subtitle: 'Tennis' },
  { title: 'Court B — Noon', subtitle: 'Padel' },
  { title: 'Studio — Evening', subtitle: 'Yoga' },
]
</script>

<template>
  <div class="@container h-full overflow-auto">
    <div class="px-4 py-2 border-b border-default text-sm font-semibold">
      {{ heading }}
    </div>
    <ul class="divide-y divide-default">
      <li
        v-for="(r, i) in rows"
        :key="i"
        class="px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <p class="text-sm font-medium">{{ r.title }}</p>
        <p class="text-xs text-muted">{{ r.subtitle }}</p>
      </li>
    </ul>
  </div>
</template>
