<script setup lang="ts">
/** SpikeListBlock (#956) — a recognizable LIST block for the demo palette. Distinct from the other
 *  demo blocks so you can SEE which block landed where in a composition/preview.
 *
 *  Display variants (#970) — the same data, three bounded layouts: `rows` (list), `cards` (grid),
 *  `table`. The variant is a BOUNDED ENUM declared on the block registry (`artists-list` configSchema)
 *  and serialised on the leaf's `config.variant`, so an agent could pick it just as a human does in the
 *  edit view. The renderer merges `config.variant` into props; we read it here. Unknown → `rows`. */
const props = defineProps<{ variant?: string }>()
const variant = computed<'rows' | 'cards' | 'table'>(() =>
  props.variant === 'cards' || props.variant === 'table' ? props.variant : 'rows')

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

    <!-- ROWS — a stacked list (the default). -->
    <template v-if="variant === 'rows'">
      <div v-for="a in items" :key="a.initials" class="flex items-center gap-2.5 rounded-lg border border-default bg-elevated/40 px-2.5 py-2">
        <div class="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{{ a.initials }}</div>
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-highlighted">{{ a.name }}</div>
          <div class="truncate text-xs text-muted">{{ a.role }}</div>
        </div>
        <UIcon name="i-lucide-chevron-right" class="ml-auto size-4 text-dimmed" />
      </div>
    </template>

    <!-- CARDS — a responsive grid of avatar cards. -->
    <div v-else-if="variant === 'cards'" class="grid grid-cols-2 gap-2 @sm:grid-cols-3">
      <div v-for="a in items" :key="a.initials" class="flex flex-col items-center gap-1.5 rounded-xl border border-default bg-elevated/40 p-3 text-center">
        <div class="grid size-10 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{{ a.initials }}</div>
        <div class="truncate text-sm font-medium text-highlighted">{{ a.name }}</div>
        <div class="truncate text-xs text-muted">{{ a.role }}</div>
      </div>
    </div>

    <!-- TABLE — a compact rows/columns grid. -->
    <table v-else class="w-full border-separate border-spacing-0 text-left text-sm">
      <thead>
        <tr class="text-[11px] uppercase tracking-wide text-muted">
          <th class="border-b border-default px-2 py-1.5 font-medium">Artist</th>
          <th class="border-b border-default px-2 py-1.5 font-medium">Role</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in items" :key="a.initials" class="hover:bg-elevated/40">
          <td class="border-b border-default/60 px-2 py-1.5">
            <div class="flex items-center gap-2">
              <div class="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{{ a.initials }}</div>
              <span class="truncate text-highlighted">{{ a.name }}</span>
            </div>
          </td>
          <td class="border-b border-default/60 px-2 py-1.5 text-muted">{{ a.role }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
