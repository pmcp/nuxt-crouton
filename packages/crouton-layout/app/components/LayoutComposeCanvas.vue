<script setup lang="ts">
/**
 * CroutonLayoutComposeCanvas (WS4, #873) — the direct-manipulation playground: free
 * "pieces" (apps) float on a canvas; drag one near another and they magnetically snap
 * into a bound layout; hold one OVER another to drop it inside (nesting). The arranging
 * IS the gesture — no dialog.
 *
 * The brain is `useCroutonComposeGestures` (reactive drag state) over the pure, tested
 * `layout-snap` geometry + `layout-edit` transforms. This component only owns the
 * pointer events, the world↔client coordinate math, and the snap/dwell affordances; each
 * piece's content renders through the normal read-only `CroutonLayoutRenderer`.
 */
import { computed, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useCroutonComposeGestures, type ComposePiece } from '../composables/useCroutonComposeGestures'
import { detachNode, removeNode, getNestedLayout, replaceNestedLayout, type NodePath } from '../utils/layout-edit'

const props = defineProps<{ modelValue: ComposePiece[] }>()
const emit = defineEmits<{
  'update:modelValue': [ComposePiece[]]
  /**
   * A piece that is itself an app (a `nested` node) was activated to zoom into
   * (double-click or the ⤢ affordance) — the host descends a level (#899). Only
   * emitted for nested pieces; plain panes/groups stay composable in place.
   */
  zoom: [ComposePiece]
}>()

/** Zoom into a piece that is an app boundary (a nested sub-layout). */
function zoomInto(piece: ComposePiece) {
  if (piece.node.type === 'nested') emit('zoom', piece)
}

// Own a deeply-reactive copy so in-place drag mutation (piece.x/y) re-renders; the model
// is the source of truth on the way IN and the commit target on the way OUT.
const pieces = ref<ComposePiece[]>(props.modelValue.map(p => ({ ...p })))
// On every model change (incl. a snap that grew a group), keep each piece inside the
// canvas so a freshly-combined group can't spill off the clipped edge.
watch(() => props.modelValue, v => { pieces.value = v.map(p => ({ ...p, ...fit(p.width, p.height, p.x, p.y) })) })

const canvasRef = ref<HTMLElement | null>(null)
const { width: canvasW, height: canvasH } = useElementSize(canvasRef)
const { draggingId, dragging, preview, dwellReady, start, move, end, cancel } = useCroutonComposeGestures(
  pieces,
  { onChange: v => emit('update:modelValue', v) },
)

// Keep every piece inside the (clipped) canvas so a drag can never strand one off-edge
// where it can't be grabbed back. On a narrow/mobile canvas a piece is also capped to the
// available width — otherwise the seed layout (wide cards at fixed x) starts off-screen.
const EDGE = 8
function fit(width: number, height: number, x: number, y: number) {
  const cw = canvasW.value
  const ch = canvasH.value
  const w = cw ? Math.min(width, cw - EDGE * 2) : width
  const h = ch ? Math.min(height, ch - EDGE * 2) : height
  const maxX = cw ? Math.max(EDGE, cw - w - EDGE) : x
  const maxY = ch ? Math.max(EDGE, ch - h - EDGE) : y
  return { width: w, height: h, x: Math.min(Math.max(EDGE, x), maxX), y: Math.min(Math.max(EDGE, y), maxY) }
}

// When the canvas first measures or resizes (e.g. rotate / mobile), pull any out-of-bounds
// piece back into view — fixes the "block stuck as a sliver off the right edge" report.
watch([canvasW, canvasH], ([w, h]) => {
  if (!w || !h || draggingId.value) return
  for (const p of pieces.value) {
    const f = fit(p.width, p.height, p.x, p.y)
    if (f.x !== p.x || f.y !== p.y || f.width !== p.width || f.height !== p.height) Object.assign(p, f)
  }
})

// Drag bookkeeping in client space → translated to the piece's world position.
let grabDX = 0
let grabDY = 0

// Resize bookkeeping (a separate gesture from move, off the corner handle).
const MIN_W = 140
const MIN_H = 96
const resizingId = ref<string | null>(null)
let rStart = { w: 0, h: 0, px: 0, py: 0 }

function onPointerDown(e: PointerEvent, piece: ComposePiece) {
  const canvas = canvasRef.value
  if (!canvas) return
  const r = canvas.getBoundingClientRect()
  grabDX = e.clientX - r.left - piece.x
  grabDY = e.clientY - r.top - piece.y
  start(piece.id)
  // Pointer capture keeps the drag alive if the cursor outruns the piece; best-effort
  // (some environments don't implement it — never let that break the gesture).
  try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }
  catch { /* ignore */ }
  e.preventDefault()
}

function onResizeDown(e: PointerEvent, piece: ComposePiece) {
  resizingId.value = piece.id
  rStart = { w: piece.width, h: piece.height, px: e.clientX, py: e.clientY }
  try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }
  catch { /* ignore */ }
  e.preventDefault()
  e.stopPropagation() // don't also start a move-drag
}

function onPointerMove(e: PointerEvent) {
  // Resize takes precedence — grow/shrink the piece from its top-left, clamped to canvas.
  if (resizingId.value) {
    const p = pieces.value.find(x => x.id === resizingId.value)
    if (!p) return
    let w = Math.max(MIN_W, rStart.w + (e.clientX - rStart.px))
    let h = Math.max(MIN_H, rStart.h + (e.clientY - rStart.py))
    if (canvasW.value) w = Math.min(w, canvasW.value - EDGE - p.x)
    if (canvasH.value) h = Math.min(h, canvasH.value - EDGE - p.y)
    p.width = w
    p.height = h
    return
  }
  if (!draggingId.value || !canvasRef.value) return
  const r = canvasRef.value.getBoundingClientRect()
  const d = dragging.value
  const raw = { x: e.clientX - r.left - grabDX, y: e.clientY - r.top - grabDY }
  // Clamp to the canvas so a piece can never be dragged off the clipped edge and lost.
  const c = d ? fit(d.width, d.height, raw.x, raw.y) : raw
  move(c.x, c.y)
}

function onPointerUp() {
  if (resizingId.value) {
    resizingId.value = null
    emit('update:modelValue', pieces.value)
    return
  }
  if (draggingId.value) end()
}

function onPointerLeave() {
  if (resizingId.value) { resizingId.value = null; emit('update:modelValue', pieces.value) }
  cancel()
}

// --- per-leaf actions from CroutonLayoutComposePane (detach / remove) -------
let detachSeq = 0
function commit(next: ComposePiece[]) {
  pieces.value = next
  emit('update:modelValue', next)
}

interface Addr { inner: NodePath, nestedAt: NodePath | null }
function freedPiece(piece: ComposePiece, node: import('@fyit/crouton-core/app/types/layout').LayoutNode): ComposePiece {
  const f = fit(Math.min(piece.width, 260), Math.min(piece.height, 180), piece.x + 28, piece.y + 28)
  return { id: `detached-${++detachSeq}-${piece.id}`, node, ...f }
}

/** Pull a leaf back out — of a split group OR a nested app — into its own free piece. */
function onDetach(piece: ComposePiece, { inner, nestedAt }: Addr) {
  let nextNode: import('@fyit/crouton-core/app/types/layout').LayoutNode | null
  let detached: import('@fyit/crouton-core/app/types/layout').LayoutNode | null
  if (!nestedAt) {
    const r = detachNode(piece.node, inner)
    detached = r.detached
    if (!detached || !r.root) return
    nextNode = r.root
  }
  else {
    const sub = getNestedLayout(piece.node, nestedAt)
    if (!sub) return
    const r = detachNode(sub.root, inner)
    detached = r.detached
    if (!detached) return
    nextNode = r.root ? replaceNestedLayout(piece.node, nestedAt, { ...sub, root: r.root }) : removeNode(piece.node, nestedAt)
  }
  const freed = freedPiece(piece, detached)
  commit(nextNode
    ? [...pieces.value.map(p => (p.id === piece.id ? { ...p, node: nextNode! } : p)), freed]
    : [...pieces.value.filter(p => p.id !== piece.id), freed])
}

/** Remove a leaf — from a split group OR a nested app — or the whole piece. */
function onRemove(piece: ComposePiece, { inner, nestedAt }: Addr) {
  if (!nestedAt && inner.length === 0) return commit(pieces.value.filter(p => p.id !== piece.id))
  let nextNode: import('@fyit/crouton-core/app/types/layout').LayoutNode | null
  if (!nestedAt) {
    nextNode = removeNode(piece.node, inner)
  }
  else {
    const sub = getNestedLayout(piece.node, nestedAt)
    if (!sub) return
    const newInner = removeNode(sub.root, inner)
    nextNode = newInner ? replaceNestedLayout(piece.node, nestedAt, { ...sub, root: newInner }) : removeNode(piece.node, nestedAt)
  }
  commit(nextNode
    ? pieces.value.map(p => (p.id === piece.id ? { ...p, node: nextNode! } : p))
    : pieces.value.filter(p => p.id !== piece.id))
}

const isLoose = (piece: ComposePiece) => piece.node.type === 'leaf'

// The guide line drawn on the target piece's edge while snapping.
const guide = computed(() => {
  const p = preview.value
  if (!p || p.intent !== 'snap' || !p.targetId) return null
  const t = pieces.value.find(x => x.id === p.targetId)
  if (!t) return null
  const W = 4
  if (p.edge === 'right') return { left: t.x + t.width - W / 2, top: t.y, width: W, height: t.height }
  if (p.edge === 'left') return { left: t.x - W / 2, top: t.y, width: W, height: t.height }
  if (p.edge === 'bottom') return { left: t.x, top: t.y + t.height - W / 2, width: t.width, height: W }
  return { left: t.x, top: t.y - W / 2, width: t.width, height: W } // top
})

// The ring drawn over a piece when a dwell-to-nest is armed.
const nestRing = computed(() => {
  const p = preview.value
  if (!p || p.intent !== 'nest' || !p.targetId) return null
  return pieces.value.find(x => x.id === p.targetId) ?? null
})
</script>

<template>
  <div
    ref="canvasRef"
    class="croutoncompose relative h-full w-full overflow-hidden rounded-lg border border-default bg-elevated/30"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerLeave"
  >
    <!-- snap guide -->
    <div
      v-if="guide"
      class="pointer-events-none absolute z-30 rounded-full bg-primary shadow-[0_0_16px_2px_var(--ui-primary)] transition-all"
      :style="{ left: `${guide.left}px`, top: `${guide.top}px`, width: `${guide.width}px`, height: `${guide.height}px` }"
    />
    <!-- dwell-to-nest ring -->
    <div
      v-if="nestRing"
      class="pointer-events-none absolute z-30 rounded-xl border-2 border-primary transition-all"
      :class="dwellReady ? 'opacity-100' : 'opacity-40'"
      :style="{ left: `${nestRing.x - 4}px`, top: `${nestRing.y - 4}px`, width: `${nestRing.width + 8}px`, height: `${nestRing.height + 8}px` }"
    />

    <!-- pieces -->
    <div
      v-for="piece in pieces"
      :key="piece.id"
      class="absolute touch-none transition-shadow"
      :class="[
        draggingId === piece.id ? 'z-40 cursor-grabbing' : 'z-10 cursor-grab',
        isLoose(piece) ? 'rounded-xl border border-dashed border-muted' : 'rounded-xl border border-default',
      ]"
      :style="{ left: `${piece.x}px`, top: `${piece.y}px`, width: `${piece.width}px`, height: `${piece.height}px` }"
      :data-piece-id="piece.id"
      @pointerdown="onPointerDown($event, piece)"
      @dblclick="zoomInto(piece)"
    >
      <div
        v-if="piece.label"
        class="absolute -top-2.5 left-3 z-10 rounded-full border border-default bg-default px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted"
      >
        {{ piece.label }}
      </div>

      <!-- An app (nested sub-layout) can be zoomed into — the ⤢ affordance. -->
      <button
        v-if="piece.node.type === 'nested'"
        type="button"
        class="absolute -top-2.5 right-3 z-20 flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary transition-colors hover:bg-primary/20"
        title="Zoom into this app"
        @pointerdown.stop
        @click.stop="zoomInto(piece)"
      >
        <UIcon name="i-lucide-maximize-2" class="size-3" />
        Open
      </button>
      <div class="h-full w-full overflow-hidden rounded-xl">
        <CroutonLayoutComposePane
          :node="piece.node"
          @detach="(a: Addr) => onDetach(piece, a)"
          @remove="(a: Addr) => onRemove(piece, a)"
        />
      </div>

      <!-- Resize handle (bottom-right corner). Big touch target; its own gesture. -->
      <div
        class="absolute -bottom-1 -right-1 z-20 flex size-6 cursor-se-resize touch-none items-end justify-end rounded-br-xl p-1 text-muted hover:text-primary"
        title="Drag to resize"
        @pointerdown="onResizeDown($event, piece)"
      >
        <UIcon
          name="i-lucide-move-diagonal-2"
          class="size-3.5"
        />
      </div>
    </div>

    <p
      v-if="!pieces.length"
      class="absolute inset-0 grid place-items-center text-sm text-muted"
    >
      No pieces — add an app to start composing.
    </p>
  </div>
</template>
