<script setup lang="ts">
/**
 * SpikeBlockNode (spike #903 → #907) — a Vue Flow node that renders a layout NODE on the
 * canvas. A freshly-dropped block is a single leaf; when two block-nodes snap together they
 * MERGE into one node whose `data.node` is a bound split (#907) — so the merged unit drags
 * as one piece and the renderer stretches each pane to the group's full size. The card sizes
 * itself to the node's footprint (a 2-high stack is twice as tall, etc.).
 *
 * No `@vue-flow/core` import (connection handles aren't needed here) — it's just a card
 * Vue Flow positions. `footprint` is auto-imported from app/utils/spike-layout.
 */
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

const props = defineProps<{
  data: { node: LayoutNode, label?: string }
  selected?: boolean
}>()

const size = computed(() => {
  const f = footprint(props.data.node)
  return { width: `${f.cols * SPIKE_BASE_W}px`, height: `${f.rows * SPIKE_BASE_H}px` }
})
</script>

<template>
  <UCard
    class="spike-block-node transition-shadow"
    :class="selected ? 'ring-primary shadow-lg' : ''"
    :style="size"
    :ui="{ root: 'overflow-hidden', body: 'h-full p-0 sm:p-0' }"
  >
    <CroutonLayoutRenderer :node="data.node" />
  </UCard>
</template>
