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
 * Pull-the-pane-to-detach (#907): hovering/selecting a MERGED node arms it — each top-level
 * pane becomes a grabbable face. Grab the pane itself (no pill) and the group EASES APART to
 * reveal its seams; the pane tracks your finger 1:1 and, dragged past a THRESHOLD, pops out into
 * its own flow node exactly where you let go. Under the threshold it SPRINGS back. The pane faces
 * are `.nodrag` so Vue Flow pulls the pane instead of moving the whole node; the seams/frame
 * between them stay node-draggable (so a merged group can still be repositioned). Detach is
 * reported via the injected SPIKE_DETACH_KEY callback (a default node component can't emit up
 * through CroutonFlow).
 *
 * Editing moved OFF the canvas (#907 focus-view redesign): double-clicking a node opens a dedicated
 * full-screen edit view (no Vue Flow camera, so framing is deterministic) — so this node carries NO
 * in-flow editable surface. It stays a read-only card: footprint render, survey render, the snap
 * guide, and the board-level pull-pane detach gesture.
 *
 * No `@vue-flow/core` import (connection handles aren't needed here). `footprint` / `SPIKE_*`
 * / `SPIKE_SNAP_KEY` / `SPIKE_DETACH_KEY` are auto-imported from app/utils/spike-layout.
 */
import { ref, inject, computed, watch } from 'vue'
import { onKeyStroke, onClickOutside } from '@vueuse/core'
import type { LayoutNode, LayoutBreakpoint } from '@fyit/crouton-core/app/types/layout'

const props = defineProps<{
  data: { node: LayoutNode, label?: string, bp?: LayoutBreakpoint[], isPage?: boolean, justAdded?: boolean }
  selected?: boolean
  // Vue Flow sets this true while the node is being dragged across the board, false on drop —
  // drives the light-green drag glow. It fades out via `transition-shadow` after release.
  dragging?: boolean
}>()

// Global viewport survey (#907 layer 3): when a device is active, size the card to that device
// and render the layout AT that width (so the board becomes a wall of phones/tablets/desktops).
const viewport = inject(SPIKE_VIEWPORT_KEY, null)
const surveying = computed(() => !!viewport?.value)

const size = computed(() => {
  if (viewport?.value) return { width: `${viewport.value.width}px`, height: `${viewport.value.height}px` }
  // `renderNode` (not data.node) so the card GROWS to fit a ghost skeleton spliced in on an armed
  // insert — e.g. dropping a 2-row stack into a row makes the row 2-tall, opening a matching slot.
  const f = footprint(renderNode.value)
  return { width: `${f.cols * SPIKE_BASE_W}px`, height: `${f.rows * SPIKE_BASE_H}px` }
})

// A LayoutTree wrapper for the responsive renderer — carries any breakpoints authored in the
// edit view, so the survey resolves the SAME authored responsiveness at the device width.
const tree = computed(() => ({ renderer: 'panes' as const, root: props.data.node, breakpoints: props.data.bp }))

// --- live snap guide (target edge lights up while a peer is dragged) ------------------
const snapPreview = inject(SPIKE_SNAP_KEY, null)
// This node is the snap target when the injected preview names its layout node.
const guideMatch = computed(() => !surveying.value && !!snapPreview?.value && snapPreview.value.node === props.data.node)
// A preview is EITHER an internal insert seam (Phase A) OR an outer edge.
const guideInsert = computed(() => (guideMatch.value ? snapPreview!.value!.insert ?? null : null))
const guideEdge = computed<SnapEdge | null>(() => (guideMatch.value && !guideInsert.value ? snapPreview!.value!.edge ?? null : null))
// Dwell stages (#941): SOFT = just approached (blue, wide — "snap point here"); ARMED = held long
// enough that releasing now snaps (green, tighter solid line).
const guideArmed = computed(() => guideMatch.value && snapPreview!.value!.armed === true)
const guideBarClass = computed(() => (guideArmed.value
  ? 'bg-emerald-500 shadow-[0_0_14px_3px_rgba(16,185,129,0.85)]'
  : 'animate-pulse bg-sky-400/80 shadow-[0_0_10px_2px_rgba(56,189,248,0.7)]'))
const guideStyle = computed(() => {
  const t = guideArmed.value ? '5px' : '10px' // soft band is wide & obvious; armed is a crisp line
  switch (guideEdge.value) {
    case 'left': return { left: '-4px', top: '0', bottom: '0', width: t }
    case 'right': return { right: '-4px', top: '0', bottom: '0', width: t }
    case 'top': return { top: '-4px', left: '0', right: '0', height: t }
    case 'bottom': return { bottom: '-4px', left: '0', right: '0', height: t }
    default: return {}
  }
})
// Internal insert seam (#950): a line at the seam, positioned by card-fractions and spanning only
// the TARGET split's sub-region — so a seam inside a NESTED split draws in the right place, not
// across the whole card. `pos` is the main-axis position; `cross0..cross1` the cross-axis span.
const guideInsertStyle = computed(() => {
  const ins = guideInsert.value
  if (!ins) return {}
  const t = guideArmed.value ? '5px' : '8px'
  const pos = `${ins.pos * 100}%`
  const c0 = `${ins.cross0 * 100}%`
  const c1 = `${(1 - ins.cross1) * 100}%`
  return ins.axis === 'horizontal'
    ? { left: pos, top: c0, bottom: c1, width: t, transform: 'translateX(-50%)' }
    : { top: pos, left: c0, right: c1, height: t, transform: 'translateY(-50%)' }
})
// Ease-apart preview (#946): once an internal insert ARMS (green), splice a ghost pane into the
// layout at the target index and render THAT — the renderer lays out the extra pane and the #943
// FLIP eases the real panes apart to physically open its slot, the ghost landing in the gap. The
// ghost block (`__dropghost__` → SpikeGhostPane) shows the incoming item's label, which we provide
// (the renderer doesn't thread arbitrary config to a block). Reverts on un-arm → panes close back.
const guideArmedInsert = computed(() => guideArmed.value && !!guideInsert.value)
const ghostLabel = computed(() => snapPreview?.value?.dragLabel ?? 'Drops here')
provide(SPIKE_GHOST_LABEL_KEY, ghostLabel)
// Build a ghost SKELETON with the same shape as the dragged node — every leaf becomes a
// `__dropghost__` placeholder, splits/nested preserved — so its FOOTPRINT matches the dragged item.
// Inserted into a horizontal split, a 2-row stack stays 2 rows, growing the row to fit (so the
// opened slot matches the item's size, not a flat 1×1 sliver). Sizes preserved for inner proportions.
function ghostify(node: LayoutNode): LayoutNode {
  if (node.type === 'leaf') return { type: 'leaf', blockId: '__dropghost__', ...(node.defaultSize !== undefined ? { defaultSize: node.defaultSize } : {}) }
  if (node.type === 'nested') return { type: 'nested', layout: { ...node.layout, root: ghostify(node.layout.root) } }
  return { ...node, children: node.children.map(ghostify) }
}
const renderNode = computed<LayoutNode>(() => {
  const ins = guideInsert.value
  const n = props.data.node
  if (!guideArmedInsert.value || !ins || n.type !== 'split') return n
  // The seam may be in a NESTED split — resolve it by path so the ghost opens the slot at the right
  // depth (#950). Size the ghost to that split's child count, then splice it in via insertAtPath.
  const targetSplit = splitAtPath(n, ins.path)
  if (!targetSplit || targetSplit.type !== 'split') return n
  const dn = snapPreview?.value?.dragNode
  const skeleton = dn ? ghostify(dn) : { type: 'leaf' as const, blockId: '__dropghost__' }
  const ghost: LayoutNode = { ...skeleton, defaultSize: Math.round(100 / (targetSplit.children.length + 1)) }
  return insertAtPath(n, ins.path, ins.index, ghost)
})

// --- pull-the-pane-to-detach ----------------------------------------------------------
const PULL_THRESHOLD = 64 // raw cursor px the pane must travel before it pops free
const RESISTANCE = 1 // pane tracks the cursor/thumb 1:1 (direct manipulation) → it detaches exactly under your finger; the THRESHOLD + ease-apart + spring-back carry the physical feel, not positional lag
const DETACH_MARGIN = 64 // px the finger must travel BEYOND the card edge to detach (#952); inside this margin a pull is read as a reorder, so sliding a pane across to a neighbour slot doesn't tip into detach
const detach = inject(SPIKE_DETACH_KEY, null)
const reorder = inject(SPIKE_REORDER_KEY, null)
// Page promotion (#942): promote this node to BE the page, or duplicate it as a draft.
const setPage = inject(SPIKE_SET_PAGE_KEY, null)
const duplicate = inject(SPIKE_DUPLICATE_KEY, null)
const isGroup = computed(() => props.data.node.type === 'split')

// Long-press → jiggle (#941): detach is gated behind a deliberate HOLD, so a merged group's panes
// only become pullable once they WIGGLE (clearly draggable). A quick drag still moves the whole
// group. Per-node state, so holding another group wiggles it too. Exit on detach / Escape / a tap
// or drag off a face.
const LONG_PRESS_MS = 420
const MOVE_CANCEL_PX = 8
const jiggling = ref(false)
let pressTimer: number | null = null
let pressOrigin = { x: 0, y: 0 }
function clearPress() { if (pressTimer != null) { window.clearTimeout(pressTimer); pressTimer = null } }
function onCardDown(e: PointerEvent) {
  if (surveying.value || !isGroup.value) return
  if (jiggling.value) { jiggling.value = false; return } // already wiggling → a tap/drag off a face exits
  pressOrigin = { x: e.clientX, y: e.clientY }
  clearPress()
  pressTimer = window.setTimeout(() => { jiggling.value = true; pressTimer = null }, LONG_PRESS_MS)
}
function onCardMove(e: PointerEvent) {
  // Moved before the hold completed → it's a node drag, not a long-press. Cancel.
  if (pressTimer != null && Math.hypot(e.clientX - pressOrigin.x, e.clientY - pressOrigin.y) > MOVE_CANCEL_PX) clearPress()
}
function onCardUp() { clearPress() }
onKeyStroke('Escape', () => { if (jiggling.value) jiggling.value = false })

// Pinch-to-zoom over a layout (#948): a 2-finger gesture on the card should zoom the CANVAS, not
// drag/wiggle the node. We listen in the CAPTURE phase so we can stop the event before Vue Flow's
// node-drag (bubble phase) ever sees it, then drive the page's zoom. One finger is untouched —
// normal drag/long-press still work. Provided by the page; no-op if absent.
const pinch = inject(SPIKE_PINCH_KEY, null)
const pinching = ref(false)
let pinchDist = 0
function touchDist(t: TouchList) { return Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY) }
function touchMid(t: TouchList) { return { x: (t[0]!.clientX + t[1]!.clientX) / 2, y: (t[0]!.clientY + t[1]!.clientY) / 2 } }
function onTouchStartCap(e: TouchEvent) {
  if (e.touches.length < 2 || !pinch) return
  pinching.value = true
  jiggling.value = false; clearPress() // a pinch is never a wiggle
  pinchDist = touchDist(e.touches)
  e.stopPropagation(); e.preventDefault() // keep it off the node drag + browser page-zoom
}
function onTouchMoveCap(e: TouchEvent) {
  if (!pinching.value || e.touches.length < 2) return
  const d = touchDist(e.touches)
  if (pinchDist > 0 && d > 0) {
    const mid = touchMid(e.touches)
    pinch?.(d / pinchDist, mid.x, mid.y)
  }
  pinchDist = d
  e.stopPropagation(); e.preventDefault()
}
function onTouchEndCap(e: TouchEvent) {
  if (e.touches.length < 2) { pinching.value = false; pinchDist = 0 }
}
// Exit wiggle by tapping anywhere OUTSIDE this layout (the natural "done" gesture on touch);
// there's also a visible Done button. Tapping a face (inside) still starts a pull.
const cardRef = ref()
onClickOutside(cardRef, () => { if (jiggling.value) jiggling.value = false })

// Show the detach faces only while WIGGLING (or while a pull is mid-flight, so the grabbed pane
// isn't orphaned if the finger leaves the card). Tapping/selecting no longer auto-arms detach —
// that surface is the #942 promote/duplicate toolbar now; pulling apart is the deliberate hold.
const armed = computed(() => !surveying.value && isGroup.value && (jiggling.value || activeIndex.value !== null))

// Top-level pane faces (as % of the card), laid out along the split's axis by footprint — the
// regions you grab to pull a pane out, and the seams revealed between them on ease-apart.
const panes = computed(() => {
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

// Active pull state.
const activeIndex = ref<number | null>(null) // the pane being pulled
const pulling = ref(false) // a pull is in progress → the group eases apart
const springing = ref(false) // released under the threshold → animate the pane back
const pull = ref({ x: 0, y: 0 }) // resisted (lagging) translate on the grabbed pane
const past = ref(false) // cursor LEFT the card → releasing now will detach
const reorderTo = ref<number | null>(null) // cursor over a different sibling slot → releasing reorders to it (#952)
let origin = { x: 0, y: 0 }
let faceEl: HTMLElement | null = null // the grabbed pane face — its rect at release = the drop spot
let moveHandler: ((e: PointerEvent) => void) | null = null
let upHandler: ((e: PointerEvent) => void) | null = null

// Gap each pane insets by: a resting seam (so the seams/frame stay node-draggable) that widens
// when a pull starts, so the group visibly eases apart the moment you grab a pane.
// On hold (wiggle), ease the panes APART so the separate layouts read clearly (no blur, just a
// real gap); widen further during an active pull. Resting (not armed) stays a thin seam.
const gap = computed(() => (pulling.value ? 18 : jiggling.value ? 16 : 6))

function paneRect(p: { left: number, top: number, width: number, height: number }) {
  return { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` }
}
function faceStyle(i: number) {
  return {
    inset: `${gap.value}px`,
    transform: activeIndex.value === i ? `translate(${pull.value.x}px, ${pull.value.y}px)` : undefined,
  }
}

// The grabbed pane's top-left at release, as a FLOW-space offset from the group's top-left. The
// card renders at `sizeOf(node)` flow px scaled by the canvas zoom, so zoom = cardScreenWidth /
// flowWidth; the pane's screen offset from the card top-left ÷ zoom is its flow offset. The page
// adds this to the group's known flow position (CroutonFlow doesn't forward the node's position
// to a default node component, so we report an offset, not an absolute, and let the page resolve it).
// The live canvas zoom, read straight off Vue Flow's transformationpane `scale(z)` — exact, and
// independent of the node's content-driven render size (which is why a footprint-derived zoom was wrong).
function currentZoom(): number {
  const pane = (faceEl?.ownerDocument ?? document).querySelector('.vue-flow__transformationpane') as HTMLElement | null
  const m = pane ? /scale\(([-\d.]+)\)/.exec(pane.style.transform || '') : null
  const z = m ? Number.parseFloat(m[1]!) : 1
  return z && isFinite(z) ? z : 1
}

function computeDropOffset(): { x: number, y: number } | undefined {
  if (!faceEl) return undefined
  // The node wrapper's screen top-left is the group's origin; divide the pane's screen offset from it
  // by the real zoom to get the flow-space offset the page adds to the group's known position.
  const card = faceEl.closest('.vue-flow__node') as HTMLElement | null
  if (!card) return undefined
  const faceR = faceEl.getBoundingClientRect()
  const cardR = card.getBoundingClientRect()
  const zoom = currentZoom()
  return { x: (faceR.left - cardR.left) / zoom, y: (faceR.top - cardR.top) / zoom }
}

function onPaneDown(i: number, e: PointerEvent) {
  if (e.button !== 0) return // left-button only; `.nodrag` already keeps Vue Flow from moving the node
  if (!jiggling.value) return // HARD GATE (#941): a pane only pulls in wiggle mode — long-press first
  activeIndex.value = i
  pulling.value = true // ease the group apart on grab
  springing.value = false
  past.value = false
  pull.value = { x: 0, y: 0 }
  origin = { x: e.clientX, y: e.clientY }
  faceEl = e.currentTarget as HTMLElement
  // The face lives inside Vue Flow's `transformationpane`, which is `scale(zoom)`. A CSS translate
  // here is applied in that scaled space, so it moves `translate × zoom` on screen. To track the
  // finger 1:1 on screen (so the pane is under your finger and detaches exactly there), pre-divide
  // the finger delta by the live zoom (read straight off the transformationpane scale).
  const zoom = currentZoom()
  moveHandler = (ev: PointerEvent) => {
    const rawX = ev.clientX - origin.x
    const rawY = ev.clientY - origin.y
    pull.value = { x: (rawX / zoom) * RESISTANCE, y: (rawY / zoom) * RESISTANCE } // → on-screen = rawΔ × RESISTANCE
    // Drag ACROSS to reorder, drag OUT to detach (#952). REORDER is the default for any drag that
    // stays in (or near) the card — detach only when the finger clearly LEAVES it (past a margin).
    // The old test flipped to detach the instant the finger crossed the edge by a pixel, so a reorder
    // drag toward a neighbour slot kept tipping into detach. The margin gives the gesture hysteresis:
    // small overshoots while sliding a pane across still reorder.
    const cardR = (faceEl?.closest('.vue-flow__node') as HTMLElement | null)?.getBoundingClientRect()
    const outsideBy = cardR
      ? Math.max(cardR.left - ev.clientX, ev.clientX - cardR.right, cardR.top - ev.clientY, ev.clientY - cardR.bottom, 0)
      : Infinity
    const willDetach = outsideBy > DETACH_MARGIN
    past.value = willDetach
    let target: number | null = null
    if (!willDetach && cardR && props.data.node.type === 'split') {
      const horizontal = props.data.node.direction === 'horizontal'
      // Clamp the finger into the card so a slight overshoot still maps to the nearest edge slot.
      const cx = Math.min(Math.max(ev.clientX, cardR.left), cardR.right)
      const cy = Math.min(Math.max(ev.clientY, cardR.top), cardR.bottom)
      const frac = horizontal ? (cx - cardR.left) / cardR.width : (cy - cardR.top) / cardR.height
      const ps = panes.value
      for (let k = 0; k < ps.length; k++) {
        const lo = (horizontal ? ps[k]!.left : ps[k]!.top) / 100
        const hi = lo + (horizontal ? ps[k]!.width : ps[k]!.height) / 100
        if (frac >= lo && frac < hi) { target = k; break }
      }
      if (target === null) target = ps.length - 1
    }
    reorderTo.value = (!willDetach && target !== null && target !== activeIndex.value) ? target : null
  }
  upHandler = (ev: PointerEvent) => {
    const dir = { x: ev.clientX - origin.x, y: ev.clientY - origin.y } // raw release direction
    // The pulled pane's flow-space offset at release, so the freed node lands where you dropped it
    // (WYSIWYG) instead of adjacent to the group. Read the DOM BEFORE cleanup nulls faceEl.
    const dropOffset = computeDropOffset()
    const i2 = activeIndex.value
    const to = reorderTo.value
    const wantReorder = !past.value && i2 != null && to != null && to !== i2
    const didDetach = past.value && i2 != null
    cleanup()
    if (wantReorder) {
      // Reset pull state FIRST (Vue Flow reuses this instance), then ask the page to reorder; the FLIP
      // reflow animates the rearrange.
      resetPull()
      jiggling.value = false
      reorder?.(props.data.node, { from: i2!, to: to! })
    }
    else if (didDetach) {
      // Reset pull state FIRST: Vue Flow reuses this node's component instance (same id), so a
      // leftover activeIndex/pull would strand the next pull's state. Then ask the page to detach.
      resetPull()
      jiggling.value = false // pulled one out → leave wiggle mode
      detach?.(props.data.node, { index: i2!, dir, dropOffset }) // page removes this pane → card re-renders
    }
    else {
      // Spring the pane back to its socket (CSS transition), then clear once it's home.
      springing.value = true
      pulling.value = false
      pull.value = { x: 0, y: 0 }
      past.value = false
      reorderTo.value = null
      window.setTimeout(() => resetPull(), 220)
    }
  }
  window.addEventListener('pointermove', moveHandler)
  window.addEventListener('pointerup', upHandler, { once: true })
}

function resetPull() {
  activeIndex.value = null
  pulling.value = false
  springing.value = false
  pull.value = { x: 0, y: 0 }
  past.value = false
  reorderTo.value = null
}

function cleanup() {
  if (moveHandler) window.removeEventListener('pointermove', moveHandler)
  moveHandler = null
  upHandler = null
  faceEl = null
}

// Whenever the rendered layout changes under us (detach/insert/merge), clear stale pull state AND
// briefly enable a flex-grow transition so the remaining panes ANIMATE to their new sizes (#941 —
// "see where the blocks go after pulling one out"). Read-only resize doesn't change data.node, so
// the splitter handle stays snappy (not smoothed).
const reflowing = ref(false)
let reflowTimer: number | null = null
watch(() => props.data.node, () => {
  cleanup(); resetPull()
  reflowing.value = true
  if (reflowTimer != null) window.clearTimeout(reflowTimer)
  reflowTimer = window.setTimeout(() => { reflowing.value = false }, 450)
})
</script>

<template>
  <UCard
    ref="cardRef"
    class="spike-block-node transition-[width,height,box-shadow] duration-300 ease-out"
    :class="[guideArmed ? 'ring-2 ring-emerald-500 shadow-lg' : (guideEdge || guideInsert) ? 'ring-2 ring-sky-400/70 shadow-lg' : (dragging || data.justAdded) ? 'spike-drag-glow' : selected ? 'ring-primary shadow-lg' : '', { 'spike-reflowing': reflowing }]"
    :style="size"
    :ui="{ root: 'relative overflow-visible', body: `h-full ${pulling ? 'overflow-visible' : 'overflow-hidden'} rounded-[inherit] p-0 sm:p-0` }"
    @pointerdown="onCardDown"
    @pointermove="onCardMove"
    @pointerup="onCardUp"
    @pointercancel="onCardUp"
    @touchstart.capture="onTouchStartCap"
    @touchmove.capture="onTouchMoveCap"
    @touchend.capture="onTouchEndCap"
    @touchcancel.capture="onTouchEndCap"
  >
    <!-- "Page" badge — this node is the live layout a user sees (#942). -->
    <UBadge
      v-if="data.isPage && !surveying"
      color="primary"
      variant="solid"
      size="sm"
      icon="i-lucide-star"
      class="pointer-events-none absolute left-2 top-2 z-30 shadow"
    >Page</UBadge>

    <!-- Node actions (#942) — promote this layout to BE the page, or duplicate it as a draft.
         Shown when selected; floated ABOVE the card so it clears the detach faces. `.nodrag` +
         `.stop` so tapping a button neither drags the node nor bubbles to the card. -->
    <!-- Done — exit wiggle mode (#941). Shown while wiggling; tapping outside the layout also exits. -->
    <div
      v-if="jiggling && !surveying"
      class="nodrag pointer-events-auto absolute -top-10 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-primary/40 bg-elevated/95 p-1 shadow-xl backdrop-blur"
    >
      <UButton
        icon="i-lucide-check"
        label="Done"
        size="xs"
        color="primary"
        variant="soft"
        @pointerdown.stop
        @click.stop="jiggling = false"
      />
    </div>

    <div
      v-if="selected && !jiggling && !surveying"
      class="nodrag pointer-events-auto absolute -top-10 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-default bg-elevated/95 p-1 shadow-xl backdrop-blur"
    >
      <UButton
        v-if="!data.isPage"
        icon="i-lucide-star"
        label="Set as page"
        size="xs"
        color="primary"
        variant="soft"
        @pointerdown.stop
        @click.stop="setPage?.(data.node)"
      />
      <UButton
        v-else
        icon="i-lucide-star"
        label="Page"
        size="xs"
        color="primary"
        variant="solid"
        disabled
      />
      <UButton
        icon="i-lucide-copy"
        label="Duplicate"
        size="xs"
        color="neutral"
        variant="ghost"
        @pointerdown.stop
        @click.stop="duplicate?.(data.node)"
      />
    </div>

    <!-- Survey mode renders the layout AT the device width (authored breakpoints + intrinsic reflow); -->
    <!-- topology mode renders it plain at its footprint size. -->
    <!-- Survey: scroll the PREVIEW, don't pan the canvas (#940). `nopan`/`nodrag` keep Vue Flow's
         hands off the gesture, `overflow-auto` + `touch-action` let an overflowing layout scroll. -->
    <div
      v-if="surveying"
      class="nopan nodrag h-full w-full overflow-auto"
      style="touch-action: pan-x pan-y; -webkit-overflow-scrolling: touch;"
    >
      <CroutonLayoutResponsiveRenderer :tree="tree" :width="viewport!.width" />
    </div>
    <CroutonLayoutRenderer v-else :node="renderNode" />

    <!-- Live snap guide (#941): an outer EDGE (merge onto a side) or an internal INSERT seam (drop
         between panes). SOFT = blue, wide, pulsing ("snap point here"); ARMED = green, crisp, steady. -->
    <div
      v-if="guideEdge"
      class="pointer-events-none absolute z-10 rounded-full"
      :class="guideBarClass"
      :style="guideStyle"
    />
    <div
      v-if="guideInsert && !guideArmedInsert"
      class="pointer-events-none absolute z-10 rounded-full"
      :class="guideBarClass"
      :style="guideInsertStyle"
    />
    <!-- Detach overlay: armed merged node → grab a pane face and pull it out past the threshold.
         The container is `.nodrag` so Vue Flow pulls the pane, not the node; the seams/frame
         between faces stay uncovered (pointer-events-none) so the merged group is still draggable. -->
    <div v-if="armed" class="nodrag pointer-events-none absolute inset-0 z-20">
      <div
        v-for="(p, i) in panes"
        :key="i"
        class="absolute"
        :style="paneRect(p)"
      >
        <!-- the socket the pane leaves behind while it's pulled out -->
        <div
          v-if="activeIndex === i"
          class="absolute rounded-xl border border-dashed border-primary/50 bg-primary/5"
          :style="{ inset: `${gap}px` }"
        />
        <!-- the grabbable pane face — grab it and pull -->
        <div
          class="group pointer-events-auto absolute flex cursor-grab items-center justify-center rounded-xl ring-1 active:cursor-grabbing"
          :class="[
            activeIndex === i
              ? (past ? 'z-10 ring-2 ring-primary bg-primary/15 shadow-2xl' : reorderTo !== null ? 'z-10 ring-2 ring-emerald-500 bg-emerald-500/15 shadow-2xl' : 'z-10 ring-2 ring-primary/70 bg-elevated/40 shadow-xl')
              : (reorderTo === i ? 'ring-2 ring-emerald-500 bg-emerald-500/15' : 'ring-2 ring-primary/50 bg-elevated/10 hover:bg-primary/10 hover:ring-primary'),
            activeIndex === i && !springing ? '' : 'transition-all duration-200 ease-out',
            jiggling && activeIndex !== i ? 'spike-face-jiggle' : '',
          ]"
          :style="{ ...faceStyle(i), animationDelay: i % 2 ? '0.08s' : '0s' }"
          @pointerdown.stop="onPaneDown(i, $event)"
        >
          <span
            v-if="activeIndex === i"
            class="flex items-center gap-1 rounded-full bg-default/85 px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur"
            :class="reorderTo !== null && !past ? 'text-emerald-500' : 'text-primary'"
          >
            <UIcon :name="past ? 'i-lucide-hand' : reorderTo !== null ? 'i-lucide-arrow-left-right' : 'i-lucide-grip'" class="size-3" />
            {{ past ? 'Release to detach' : reorderTo !== null ? 'Move here' : 'Drag across to reorder · out to detach' }}
          </span>
          <span
            v-else-if="reorderTo === i"
            class="flex items-center gap-1 rounded-full bg-default/85 px-2 py-1 text-[10px] font-medium text-emerald-500 shadow-sm backdrop-blur"
          >
            <UIcon name="i-lucide-corner-down-left" class="size-3" />Drop
          </span>
          <span
            v-else
            class="flex items-center gap-1 rounded-full bg-default/85 px-2 py-1 text-[10px] font-medium text-muted opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100"
          >
            <UIcon name="i-lucide-grip" class="size-3" />Pull
          </span>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
/* Long-press → jiggle (#941): iOS edit-mode wiggle on the detachable pane faces, so it's
   clearly draggable. Disabled under prefers-reduced-motion. The pulled face doesn't wiggle. */
@media (prefers-reduced-motion: no-preference) {
  @keyframes spike-jiggle {
    0%, 100% { transform: rotate(-1.1deg); }
    50% { transform: rotate(1.1deg); }
  }
  .spike-face-jiggle { animation: spike-jiggle 0.25s ease-in-out infinite; }
}

/* Animate the remaining panes when the layout restructures (detach / insert / merge) so you can see
   where the blocks land. Active only briefly (the `spike-reflowing` window) — a manual splitter
   resize doesn't change data.node, so the handle stays snappy. reka-ui sizes panels via inline
   `flex`; transitioning flex-grow tweens the reflow. (#941) */
@media (prefers-reduced-motion: no-preference) {
  .spike-reflowing :deep([data-panel]) {
    transition: flex-grow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* Light-green glow while a card is dragged across the board — a soft emerald halo + a
   thin ring + a lift, so the piece you're moving reads as "live". It's a box-shadow (like
   Tailwind's ring), so the card's `transition-shadow` fades it out the moment you drop. */
.spike-drag-glow {
  box-shadow:
    0 0 0 2px rgb(74 222 128 / 0.7),
    0 0 18px 4px rgb(74 222 128 / 0.5),
    0 10px 28px rgb(0 0 0 / 0.28);
}
</style>
