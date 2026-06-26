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
 * Pull-apart-to-detach (#907): hovering/selecting a MERGED node eases its panes apart (shows
 * the seams) and reveals a grip per top-level pane. Dragging a grip OUT (with a little
 * resistance — the grip lags behind the cursor) past a threshold pops that pane back into its
 * own flow node; under the threshold it springs back. The grips are `.nodrag` so Vue Flow
 * doesn't move the whole node while you pull a pane out. Detach is reported via the injected
 * SPIKE_DETACH_KEY callback (a default node component can't emit up through CroutonFlow).
 *
 * No `@vue-flow/core` import (connection handles aren't needed here). `footprint` / `SPIKE_*`
 * / `SPIKE_SNAP_KEY` / `SPIKE_DETACH_KEY` are auto-imported from app/utils/spike-layout.
 */
import { ref, inject, computed } from 'vue'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

const props = defineProps<{
  data: { node: LayoutNode, label?: string }
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

// A LayoutTree wrapper for the responsive renderer (data.node is a bare node).
const tree = computed(() => ({ renderer: 'panes' as const, root: props.data.node }))

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

// --- pull-apart-to-detach -------------------------------------------------------------
const DETACH_THRESHOLD = 56 // px the grip must travel before a pane pops out
const detach = inject(SPIKE_DETACH_KEY, null)
const hovered = ref(false)
const isGroup = computed(() => props.data.node.type === 'split')
const armed = computed(() => !surveying.value && isGroup.value && (hovered.value || !!props.selected))

// Top-level pane regions (as % of the card), laid out along the split's axis by footprint.
const regions = computed(() => {
  const n = props.data.node
  if (n.type !== 'split') return []
  const horizontal = n.direction === 'horizontal'
  const fps = n.children.map(footprint)
  const total = fps.reduce((s, f) => s + (horizontal ? f.cols : f.rows), 0) || 1
  let acc = 0
  return n.children.map((_, i) => {
    const span = horizontal ? fps[i]!.cols : fps[i]!.rows
    const start = (acc / total) * 100
    const sizePct = (span / total) * 100
    acc += span
    return horizontal
      ? { left: start, top: 0, width: sizePct, height: 100 }
      : { left: 0, top: start, width: 100, height: sizePct }
  })
})

// Active grip drag state.
const activeIndex = ref<number | null>(null)
const delta = ref({ x: 0, y: 0 })
const past = ref(false)
let start = { x: 0, y: 0 }
let moveHandler: ((e: PointerEvent) => void) | null = null
let upHandler: ((e: PointerEvent) => void) | null = null

function cellStyle(r: { left: number, top: number, width: number, height: number }, i: number) {
  const t = activeIndex.value === i ? `translate(${delta.value.x}px, ${delta.value.y}px)` : undefined
  return { left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%`, transform: t }
}

function onGripDown(i: number, e: PointerEvent) {
  e.stopPropagation()
  e.preventDefault()
  activeIndex.value = i
  delta.value = { x: 0, y: 0 }
  past.value = false
  start = { x: e.clientX, y: e.clientY }
  moveHandler = (ev: PointerEvent) => {
    delta.value = { x: ev.clientX - start.x, y: ev.clientY - start.y }
    past.value = Math.hypot(delta.value.x, delta.value.y) > DETACH_THRESHOLD
  }
  upHandler = () => {
    const dir = { ...delta.value }
    const i2 = activeIndex.value
    cleanup()
    if (past.value && i2 != null) {
      detach?.(props.data.node, { index: i2, dir }) // page removes this pane → card re-renders
    }
    else {
      delta.value = { x: 0, y: 0 } // spring back (CSS transition)
      window.setTimeout(() => { activeIndex.value = null }, 180)
    }
    past.value = false
  }
  window.addEventListener('pointermove', moveHandler)
  window.addEventListener('pointerup', upHandler, { once: true })
}

function cleanup() {
  if (moveHandler) window.removeEventListener('pointermove', moveHandler)
  moveHandler = null
  upHandler = null
}
</script>

<template>
  <UCard
    class="spike-block-node transition-shadow"
    :class="guideEdge ? 'ring-2 ring-primary shadow-lg' : selected ? 'ring-primary shadow-lg' : ''"
    :style="size"
    :ui="{ root: 'relative overflow-visible', body: 'h-full overflow-hidden rounded-[inherit] p-0 sm:p-0' }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
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

    <!-- Detach overlay: armed merged node → grip per pane; drag a grip out past the threshold to pop it free -->
    <div v-if="armed" class="nodrag pointer-events-none absolute inset-0 z-20">
      <div
        v-for="(r, i) in regions"
        :key="i"
        class="absolute transition-transform duration-150 ease-out"
        :style="cellStyle(r, i)"
      >
        <div
          class="absolute inset-1 rounded-lg ring-1 transition-colors"
          :class="activeIndex === i && past ? 'ring-2 ring-primary bg-primary/5 shadow-xl' : 'ring-default/60 bg-elevated/10'"
        />
        <!-- the grip you pull -->
        <button
          type="button"
          class="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center gap-1 rounded-full border border-default bg-default/90 px-2 py-1 text-[10px] font-medium text-muted shadow-sm backdrop-blur transition-colors hover:border-primary hover:text-primary active:cursor-grabbing"
          :class="activeIndex === i ? 'border-primary text-primary' : ''"
          @pointerdown="onGripDown(i, $event)"
        >
          <UIcon name="i-lucide-grip-vertical" class="size-3" />
          {{ activeIndex === i && past ? 'Release' : 'Detach' }}
        </button>
      </div>
    </div>
  </UCard>
</template>
