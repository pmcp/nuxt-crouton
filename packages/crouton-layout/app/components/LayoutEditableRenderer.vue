<script setup lang="ts">
/**
 * CroutonLayoutEditableRenderer — the editable layout surface that OWNS its pane
 * handles (graduation WS2, #985).
 *
 * The builder POC painted a *separate overlay layer* of grab-faces over a composed
 * card and kept it aligned by measuring the rendered panes (`[data-panel]`) and
 * clamping rects every frame — the whole v49/v51 measure-and-clamp machinery existed
 * only because the faces were a duplicated layer that DRIFTS (a reflow / min-width
 * clamp / responsive resize moved the panes but not the faces). This renderer instead
 * lays out its own panes and draws each handle INSIDE its pane, tagging the pane with
 * a stable `data-pane-id`. The handle can't drift — it reflows, moves, and resizes
 * WITH its pane — so the overlay-drift bug class is gone, not ported.
 *
 * Scope: gestures act on the direct children of a `split` root (the POC's top-level
 * wiggle / reorder / detach). Pane CONTENT renders read-only through
 * `CroutonLayoutRenderer` (block resolution, intrinsic `@container` responsiveness,
 * nested recursion all reused). Reorder is applied in place via the pure `moveChild`
 * and bubbled as `update:node`; detach (popping a pane OUT to a free card) is board
 * placement the host owns, so it's emitted as a `detach` intent (path + node). A lone
 * leaf / nested root is a single pane (nothing to reorder or detach out of).
 */
import { computed, ref } from 'vue'
import type { LayoutNode, LayoutSplit } from '@fyit/crouton-core/app/types/layout'
import { moveChild, type NodePath } from '../utils/layout-edit'

const props = withDefaults(
  defineProps<{
    /** The layout tree this card renders + edits. */
    node: LayoutNode
    /** Off → renders identically to the read-only renderer (no grips, no gestures). */
    editable?: boolean
    /** Finger travel (px) past the card edge that tips a reorder into a detach. */
    detachMargin?: number
  }>(),
  { editable: true, detachMargin: 64 },
)

const emit = defineEmits<{
  /** A reorder was applied in place — the host persists the new tree. */
  'update:node': [node: LayoutNode]
  /** A pane was pulled OUT of the card; the host places it as a free node. */
  detach: [payload: { path: NodePath, node: LayoutNode }]
}>()

const isSplit = computed(() => props.node.type === 'split')
const children = computed<LayoutNode[]>(() => (props.node.type === 'split' ? props.node.children : []))
const horizontal = computed(() => props.node.type === 'split' && props.node.direction === 'horizontal')

/** Stable id per pane = its NodePath, so a test / agent / the host can address a pane
 *  by id without measuring an overlay. The root split's own id is `root`. */
function paneId(index: number): string {
  return String(index)
}

// --- gesture state ---------------------------------------------------------
const groupRef = ref<HTMLElement | null>(null)
const armed = ref(false) // pointer is over the group → panes wiggle as the grab affordance
const activeIndex = ref<number | null>(null) // the pane being pulled
const pull = ref({ x: 0, y: 0 }) // live translate on the grabbed pane (the throwaway proxy)
const past = ref(false) // finger left the card past the margin → releasing now detaches
const reorderTo = ref<number | null>(null) // finger over a different sibling slot → reorder there
let origin = { x: 0, y: 0 }

function paneStyle(index: number, child: LayoutNode) {
  const basis = `${child.defaultSize ?? 100 / children.value.length}%`
  const active = activeIndex.value === index
  return {
    flexBasis: basis,
    transform: active ? `translate(${pull.value.x}px, ${pull.value.y}px)` : undefined,
    zIndex: active ? 30 : undefined,
  }
}

/** Which sibling slot the pointer sits over — read from the REAL rendered panes (no
 *  overlay, no clamp), so it can't drift. Along the split axis; clamps to the nearest. */
function slotAt(clientX: number, clientY: number): number | null {
  const group = groupRef.value
  if (!group) return null
  // The pane elements are this group's children (content rendered by CroutonLayoutRenderer
  // carries no data-pane-id), so querying the group yields exactly the sibling panes — the
  // REAL rendered elements, measured fresh, so the slot test can't drift.
  const els = Array.from(group.querySelectorAll<HTMLElement>('[data-pane-id]'))
  for (let i = 0; i < els.length; i++) {
    const r = els[i]!.getBoundingClientRect()
    const over = horizontal.value
      ? clientX >= r.left && clientX < r.right
      : clientY >= r.top && clientY < r.bottom
    if (over) return i
  }
  return els.length ? els.length - 1 : null
}

function onGripDown(index: number, e: PointerEvent) {
  if (!props.editable || e.button !== 0 || props.node.type !== 'split') return
  e.preventDefault()
  e.stopPropagation()
  activeIndex.value = index
  past.value = false
  reorderTo.value = null
  pull.value = { x: 0, y: 0 }
  origin = { x: e.clientX, y: e.clientY }
  // Capture the pointer on the grip so a pull that leaves the card (→ detach) still
  // streams its moves here — no window listeners, no missed pointerup. Guarded: a
  // headless DOM may not implement it (the gesture still works element-locally).
  try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) }
  catch { /* not supported — fall back to element-local events */ }
}

function onGripMove(e: PointerEvent) {
  if (activeIndex.value === null) return
  pull.value = { x: e.clientX - origin.x, y: e.clientY - origin.y }
  const card = groupRef.value?.getBoundingClientRect()
  const outsideBy = card
    ? Math.max(card.left - e.clientX, e.clientX - card.right, card.top - e.clientY, e.clientY - card.bottom, 0)
    : Number.POSITIVE_INFINITY
  past.value = outsideBy > props.detachMargin
  if (past.value) { reorderTo.value = null; return }
  const target = slotAt(e.clientX, e.clientY)
  reorderTo.value = target !== null && target !== activeIndex.value ? target : null
}

function onGripUp() {
  const from = activeIndex.value
  const to = reorderTo.value
  const detached = past.value
  if (detached && from !== null) {
    const node = children.value[from]
    if (node) emit('detach', { path: [from], node })
  }
  else if (from !== null && to !== null && to !== from) {
    emit('update:node', moveChild(props.node, [], from, to))
  }
  reset()
}

function reset() {
  activeIndex.value = null
  pull.value = { x: 0, y: 0 }
  past.value = false
  reorderTo.value = null
}
</script>

<template>
  <!-- Split root — lay out the panes ourselves so each grip rides its own pane. -->
  <div
    v-if="isSplit"
    ref="groupRef"
    class="cl-edit-group"
    :class="horizontal ? 'is-row' : 'is-col'"
    data-pane-id="root"
    @pointerenter="armed = editable"
    @pointerleave="armed = false"
  >
    <div
      v-for="(child, i) in children"
      :key="i"
      class="croutonpane cl-edit-pane"
      :data-pane-id="paneId(i)"
      :data-wiggle="armed && activeIndex === null ? 'true' : undefined"
      :class="{
        'is-pulling': activeIndex === i,
        'is-detaching': activeIndex === i && past,
        'is-drop-target': reorderTo === i,
      }"
      :style="paneStyle(i, child)"
    >
      <button
        v-if="editable"
        type="button"
        class="cl-grip"
        aria-label="Drag to reorder or detach this pane"
        @pointerdown="onGripDown(i, $event)"
        @pointermove="onGripMove($event)"
        @pointerup="onGripUp()"
        @pointercancel="onGripUp()"
      >
        <svg viewBox="0 0 24 24" class="cl-grip-ic" aria-hidden="true">
          <circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" />
          <circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" />
        </svg>
      </button>

      <CroutonLayoutRenderer
        :node="child"
        :interactive="false"
      />

      <div
        v-if="reorderTo === i"
        class="cl-move-hint"
      >
        Move here
      </div>
    </div>
  </div>

  <!-- Lone leaf / nested root — one pane, nothing to reorder or detach out of. -->
  <div
    v-else
    class="croutonpane cl-edit-pane is-single"
    data-pane-id="root"
  >
    <CroutonLayoutRenderer
      :node="node"
      :interactive="false"
    />
  </div>
</template>

<style scoped>
.cl-edit-group {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 6px;
}
.cl-edit-group.is-row { flex-direction: row; }
.cl-edit-group.is-col { flex-direction: column; }

.cl-edit-pane {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 10px;
  /* container-type comes from .croutonpane (intrinsic responsiveness) */
  transition: transform .18s ease, box-shadow .18s ease;
}
.cl-edit-pane.is-single { flex: 1 1 100%; }

/* Wiggle is the grab affordance — panes shiver subtly while the group is armed. */
.cl-edit-pane[data-wiggle='true'] {
  animation: cl-wiggle .42s ease-in-out infinite;
}
@keyframes cl-wiggle {
  0%, 100% { transform: rotate(-.35deg); }
  50% { transform: rotate(.35deg); }
}

/* The grabbed pane = a throwaway floating proxy that follows the finger 1:1. */
.cl-edit-pane.is-pulling {
  animation: none;
  box-shadow: 0 12px 34px rgba(0, 0, 0, .45);
  cursor: grabbing;
}
.cl-edit-pane.is-detaching {
  outline: 2px dashed var(--color-primary-400, #34d399);
  outline-offset: -2px;
}

/* The slot a reorder will drop into — green, matching the snap/reorder signal. */
.cl-edit-pane.is-drop-target {
  box-shadow: inset 0 0 0 2px var(--color-primary-500, #10b981);
}

.cl-grip {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 5;
  display: inline-flex;
  padding: 3px 5px;
  border-radius: 7px;
  color: var(--ui-text-muted, #8b97ad);
  background: color-mix(in oklab, var(--ui-bg, #0b0f1a) 80%, transparent);
  border: 1px solid var(--ui-border, #222b3a);
  cursor: grab;
  opacity: 0;
  transition: opacity .15s ease;
  touch-action: none;
}
.cl-edit-pane:hover .cl-grip,
.cl-edit-pane[data-wiggle='true'] .cl-grip,
.cl-edit-pane.is-pulling .cl-grip { opacity: 1; }
.cl-grip-ic { width: 14px; height: 14px; fill: currentColor; }

.cl-move-hint {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary-400, #34d399);
  background: color-mix(in oklab, var(--color-primary-500, #10b981) 12%, transparent);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .cl-edit-pane[data-wiggle='true'] { animation: none; }
}
</style>
