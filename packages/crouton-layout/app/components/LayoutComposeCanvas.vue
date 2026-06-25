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

const props = defineProps<{ modelValue: ComposePiece[] }>()
const emit = defineEmits<{ 'update:modelValue': [ComposePiece[]] }>()

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

function onPointerMove(e: PointerEvent) {
  if (!draggingId.value || !canvasRef.value) return
  const r = canvasRef.value.getBoundingClientRect()
  const d = dragging.value
  const raw = { x: e.clientX - r.left - grabDX, y: e.clientY - r.top - grabDY }
  // Clamp to the canvas so a piece can never be dragged off the clipped edge and lost.
  const c = d ? fit(d.width, d.height, raw.x, raw.y) : raw
  move(c.x, c.y)
}

function onPointerUp() {
  if (draggingId.value) end()
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
    @pointerleave="cancel"
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
    >
      <div
        v-if="piece.label"
        class="absolute -top-2.5 left-3 z-10 rounded-full border border-default bg-default px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted"
      >
        {{ piece.label }}
      </div>
      <div class="h-full w-full overflow-hidden rounded-xl">
        <CroutonLayoutRenderer :node="piece.node" />
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
