<script setup lang="ts">
/**
 * SpikeBlockNode (spike #903 → #907) — a Vue Flow node that renders a layout NODE on the
 * canvas. A freshly-dropped block is a single leaf; when two block-nodes snap together they
 * MERGE into one node whose `data.node` is a bound split (#907) — so the merged unit drags
 * as one piece and the renderer stretches each pane to the group's full size. The card sizes
 * itself to the node's footprint (a 2-high stack is twice as tall, etc.).
 *
 * Live snap guide (#907): while ANOTHER block is dragged toward this one, the page's
 * `snapPreview` (injected) names this node + the joining edge — we light that edge up so
 * "the side that's gonna snap lines up" is visible before release. Matched by object identity
 * of `data.node` (Vue Flow doesn't forward the node id to a default node component).
 *
 * No `@vue-flow/core` import (connection handles aren't needed here) — it's just a card
 * Vue Flow positions. `footprint` / `SPIKE_*` / `SPIKE_SNAP_KEY` are auto-imported from
 * app/utils/spike-layout.
 */
import { inject } from 'vue'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

const props = defineProps<{
  data: { node: LayoutNode, label?: string }
  selected?: boolean
}>()

const size = computed(() => {
  const f = footprint(props.data.node)
  return { width: `${f.cols * SPIKE_BASE_W}px`, height: `${f.rows * SPIKE_BASE_H}px` }
})

// The live snap preview, if this node is the current target (object identity).
const snapPreview = inject(SPIKE_SNAP_KEY, null)
const guideEdge = computed<SnapEdge | null>(() =>
  snapPreview?.value && snapPreview.value.node === props.data.node ? snapPreview.value.edge : null,
)
// Position the guide bar along the joining edge (a thin glowing primary rail just outside it).
const guideStyle = computed(() => {
  switch (guideEdge.value) {
    case 'left': return { left: '-3px', top: '0', bottom: '0', width: '4px' }
    case 'right': return { right: '-3px', top: '0', bottom: '0', width: '4px' }
    case 'top': return { top: '-3px', left: '0', right: '0', height: '4px' }
    case 'bottom': return { bottom: '-3px', left: '0', right: '0', height: '4px' }
    default: return {}
  }
})
</script>

<template>
  <UCard
    class="spike-block-node transition-shadow"
    :class="guideEdge ? 'ring-2 ring-primary shadow-lg' : selected ? 'ring-primary shadow-lg' : ''"
    :style="size"
    :ui="{ root: 'relative overflow-visible', body: 'h-full overflow-hidden rounded-[inherit] p-0 sm:p-0' }"
  >
    <CroutonLayoutRenderer :node="data.node" />
    <!-- Live snap guide: the edge this block will be joined on lights up while a peer is dragged -->
    <div
      v-if="guideEdge"
      class="pointer-events-none absolute z-10 animate-pulse rounded-full bg-primary shadow-[0_0_10px_2px_var(--ui-primary)]"
      :style="guideStyle"
    />
  </UCard>
</template>
