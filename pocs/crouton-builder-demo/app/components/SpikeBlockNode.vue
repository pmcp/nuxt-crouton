<script setup lang="ts">
/**
 * SpikeBlockNode (spike #903 → #907) — a Vue Flow node that renders a layout NODE on the
 * canvas. A freshly-dropped block is a single leaf; when two block-nodes snap together they
 * MERGE into one node whose `data.node` is a bound split (#907) — so the merged unit drags
 * as one piece and the renderer stretches each pane to the group's full size. The card sizes
 * itself to the node's footprint (a 2-high stack is twice as tall, etc.).
 *
 * Live snap guide (#907): while ANOTHER block is dragged toward this one, the page's
 * `snapPreview` (injected) names this node + the joining edge — we light that edge up.
 *
 * Editing & detach moved OUT of the canvas (#907 focus-view redesign): double-clicking a node
 * opens a dedicated full-screen edit view (no Vue Flow camera, so framing is deterministic), and
 * detaching a pane is now an affordance INSIDE that view — so this node no longer carries the
 * in-flow editable surface or the pull-apart grips. It stays a clean read-only card: footprint
 * render, survey render, and the snap guide.
 *
 * No `@vue-flow/core` import (connection handles aren't needed here). `footprint` / `SPIKE_*`
 * / `SPIKE_SNAP_KEY` are auto-imported from app/utils/spike-layout.
 */
import { inject, computed } from 'vue'
import type { LayoutNode, LayoutBreakpoint } from '@fyit/crouton-core/app/types/layout'

const props = defineProps<{
  data: { node: LayoutNode, label?: string, bp?: LayoutBreakpoint[] }
  selected?: boolean
}>()

// Global viewport survey (#907 layer 3): when a device is active, size the card to that device
// and render the layout AT that width (so the board becomes a wall of phones/tablets/desktops).
const viewport = inject(SPIKE_VIEWPORT_KEY, null)
const surveying = computed(() => !!viewport?.value)

const size = computed(() => {
  if (viewport?.value) return { width: `${viewport.value.width}px`, height: `${viewport.value.height}px` }
  const f = footprint(props.data.node)
  return { width: `${f.cols * SPIKE_BASE_W}px`, height: `${f.rows * SPIKE_BASE_H}px` }
})

// A LayoutTree wrapper for the responsive renderer — carries any breakpoints authored in the
// edit view, so the survey resolves the SAME authored responsiveness at the device width.
const tree = computed(() => ({ renderer: 'panes' as const, root: props.data.node, breakpoints: props.data.bp }))

// --- live snap guide (target edge lights up while a peer is dragged) ------------------
const snapPreview = inject(SPIKE_SNAP_KEY, null)
const guideEdge = computed<SnapEdge | null>(() =>
  !surveying.value && snapPreview?.value && snapPreview.value.node === props.data.node ? snapPreview.value.edge : null,
)
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
    <!-- Survey mode renders the layout AT the device width (authored breakpoints + intrinsic reflow); -->
    <!-- topology mode renders it plain at its footprint size. -->
    <CroutonLayoutResponsiveRenderer v-if="surveying" :tree="tree" :width="viewport!.width" />
    <CroutonLayoutRenderer v-else :node="data.node" />

    <!-- Live snap guide: the edge this block will be joined on lights up while a peer is dragged -->
    <div
      v-if="guideEdge"
      class="pointer-events-none absolute z-10 animate-pulse rounded-full bg-primary shadow-[0_0_10px_2px_var(--ui-primary)]"
      :style="guideStyle"
    />
  </UCard>
</template>
