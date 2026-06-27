<script setup lang="ts">
/**
 * Spike (#903 → #906 → #908 → #907) — "everything in Vue Flow": build an app by dragging
 * a collection's blocks from a DRAWER onto a canvas, then turn the placement into a real
 * layout. Three non-exclusive paths (a menu, not a mode war):
 *   - ✨ **Magic arrange** (#908) — deterministic composer + viability gate pick a strong
 *     layout and offer 2–3 archetype proposals to flip between (no API cost).
 *   - **Snap** (#907) — the WS4 magnetic compose canvas: drag a card beside another and
 *     they click into a bound split; resize from the corner. The canvas IS the layout.
 *   - **As placed** — the dumb positional infer (the original spike's "Compile").
 *
 *   drawer (Artists' blocks) ──drag──▶ Free (Vue Flow) ⇄ Snap (compose canvas) ──▶ LayoutTree
 *
 * Reuses what already exists: CroutonFlow's drag-drop (`@node-drop`); the layout engine's
 * `composeDefault`/`checkViability` (via `useSpikeMagic`); and for snapping the WS4
 * `CroutonLayoutComposeCanvas` + `piecesToTree` bridge (#873/#899) — so the snapped
 * arrangement yields the SAME `LayoutTree` as the magic/compile paths (one shared model).
 * No backend — the Artists blocks are demo blocks.
 *
 * Responsive shell: the palette is a persistent slim sidebar on desktop (so HTML5
 * drag-drop onto the canvas stays usable) and a toggled `UDrawer` bottom sheet on a
 * phone (out of the way — #906). The result rides in a `USlideover`. The palette markup
 * is defined once with VueUse's `createReusableTemplate` and reused in both places.
 */
import { markRaw, computed, shallowRef, provide } from 'vue'
import { createReusableTemplate } from '@vueuse/core'
import type { LayoutNode, LayoutTree, LayoutBreakpoint } from '@fyit/crouton-core/app/types/layout'
import { piecesToTree } from '@fyit/crouton-layout/app/utils/layout-compose-bridge'
import { closestSnap, type Rect, type SnapTarget } from '@fyit/crouton-layout/app/utils/layout-snap'
import { detachNode, applySizes } from '@fyit/crouton-layout/app/utils/layout-edit'
import type { ComposePiece } from '@fyit/crouton-layout/app/composables/useCroutonComposeGestures'
import SpikeBlockNode from '~/components/SpikeBlockNode.vue'

useHead({ title: 'Spike · app on Vue Flow' })
const BUILD = 'spike-detach-6 · #907 · add a block → camera re-frames to an overview (no more hard zoom on the first block, esp. mobile)'

const blockNode = markRaw(SpikeBlockNode)

const { magicArrange, magicArrangeAI } = useSpikeMagic()
const { checkViability } = useCroutonLayoutBlocks()

// ✨ Magic v2 is an optional add-on: the AI button only shows when the crouton-ai package
// is installed (same hasApp() stub pattern crouton-pages uses). No AI package → no button.
const { hasApp } = useCroutonApps()
const hasAI = hasApp('ai')
const aiIntent = ref('')
const aiLoading = ref(false)
const resultSource = ref<'deterministic' | 'ai' | 'fallback'>('deterministic')

// Free (Vue Flow free placement) ⇄ Snap (magnetic compose canvas). Non-exclusive: you can
// drop in Free, switch to Snap to bind by hand, and either feeds the same compile/magic.
type CanvasMode = 'free' | 'snap'
const mode = ref<CanvasMode>('free')
const pieces = ref<ComposePiece[]>([])

/** A layout the result slideover can render + let you flip between (magic or positional). */
interface CanvasProposal { id: string, label: string, icon: string, note: string, tree: LayoutTree, viable: boolean }

// Define the palette markup once; render it in the desktop sidebar AND the mobile drawer.
const [DefinePalette, ReusePalette] = createReusableTemplate()

// The drawer = the blocks a collection ("Artists") offers. In the real thing this list
// is derived from the collection; here it's the registered demo blocks.
const drawer = [
  { blockId: 'artists-list', label: 'Artists · List', icon: 'i-lucide-list' },
  { blockId: 'artists-form', label: 'Artists · New', icon: 'i-lucide-square-pen' },
  { blockId: 'artists-stats', label: 'Artists · Stats', icon: 'i-lucide-bar-chart-3' },
]

// Pre-built Vue Flow nodes (CroutonFlow ephemeral mode renders these directly). A node's
// `data.node` is a single leaf when freshly dropped, or a bound SPLIT once blocks snap
// together (#907) — the merged unit then drags as one node.
// `bp` = authored responsive breakpoints for this node's layout (#907 layer 2), set in the
// breakpoint slider you zoom into. Structural edits (snap/detach) create nodes WITHOUT bp, so
// authored breakpoints reset when the structure they targeted changes — which is the right thing.
interface FlowNode { id: string, type: string, position: { x: number, y: number }, data: { node: LayoutNode, label?: string, bp?: LayoutBreakpoint[] } }
const nodes = ref<FlowNode[]>([])
let seq = 0

// Camera: re-frame the whole board to an overview after adding a block. CroutonFlow only
// fits-to-view on mount (when the board is empty), so without this a freshly-added block sits at
// the default zoom — which on a narrow phone fills the screen. fitView with maxZoom:1 keeps a
// single block at a comfortable size and shows everything you've added. Survey/focus own the
// camera, so skip then.
const flowRef = ref<{ fitView?: (o?: Record<string, unknown>) => void } | null>(null)
function fitOverview() {
  if (viewport.value || focus.value) return
  const fit = () => flowRef.value?.fitView?.({ duration: 350, padding: 0.3, maxZoom: 1 })
  // Fit on nextTick, then once more after the new node's dimensions settle (Vue Flow measures
  // node size async, so a single immediate fit can frame a stale/zero-width box and miscenter).
  nextTick(fit)
  window.setTimeout(fit, 180)
}

// Live snap preview (#907): while a block is dragged, the target node it will snap to lights
// up the joining edge. Provided here; SpikeBlockNode injects it and matches by object identity.
const snapPreview = shallowRef<SpikeSnapPreview | null>(null)
provide(SPIKE_SNAP_KEY, snapPreview)

// Pull-apart-to-detach (#907) — the inverse of snap-merge. A SpikeBlockNode pops a pane out of
// a merged group and reports it here (via SPIKE_DETACH_KEY — it can't emit up through CroutonFlow).
// We split the group's `data.node`, shrink it to the remainder, and place the freed pane WHERE you
// dropped it (payload.dropPos, flow coords) — falling back to the pulled side if it's unavailable.
const DETACH_GAP = 40
function onDetach(group: LayoutNode, payload: SpikeDetachPayload) {
  const idx = nodes.value.findIndex(n => n.data.node === group)
  if (idx === -1) return
  const host = nodes.value[idx]!
  const { root, detached } = detachNode(group, [payload.index])
  if (!detached || !root) return

  // Primary: land it where the pulled pane was released (WYSIWYG) — the node reports the pane's
  // flow-space offset from the group's top-left, we add it to the group's known position. Fallback
  // (no offset): place it on the side the drag pointed, just past the group's old extent.
  const gSize = sizeOf(group) // group's extent BEFORE it shrinks
  const dSize = sizeOf(detached)
  const horizontal = Math.abs(payload.dir.x) >= Math.abs(payload.dir.y)
  const pos = payload.dropOffset
    ? { x: host.position.x + payload.dropOffset.x, y: host.position.y + payload.dropOffset.y }
    : (horizontal
        ? { x: payload.dir.x >= 0 ? host.position.x + gSize.width + DETACH_GAP : host.position.x - dSize.width - DETACH_GAP, y: host.position.y }
        : { x: host.position.x, y: payload.dir.y >= 0 ? host.position.y + gSize.height + DETACH_GAP : host.position.y - dSize.height - DETACH_GAP })

  const label = flattenLeaves(detached)[0]?.label
  const freed: FlowNode = { id: `detached-${++seq}`, type: 'default', position: { x: Math.round(pos.x), y: Math.round(pos.y) }, data: { node: detached, label } }
  // Shrink the host to the remainder (keeps its position) and add the freed pane beside it.
  nodes.value = nodes.value.map((n, i) => i === idx ? { ...n, data: { ...n.data, node: root } } : n).concat(freed)
}
provide(SPIKE_DETACH_KEY, onDetach)

// Global viewport survey (#907 layer 3) — flip the whole board to a device width to see what every
// page looks like at that viewport. Read-only: snapping/detach off, nodes tiled & non-draggable.
const viewport = ref<SpikeViewport | null>(null)
provide(SPIKE_VIEWPORT_KEY, viewport)

// While surveying, tile the nodes in a row at device size — non-destructive (the real topology
// positions in `nodes` are untouched, so flipping back to Fit restores your arrangement).
const flowRows = computed<FlowNode[]>(() => {
  // Focus edit: SOLO the focused node — the others step aside so growing it to a wide device
  // doesn't collide with its neighbours on the board. They reappear on Done (#907).
  if (focus.value && zoomNodeId.value) {
    const n = nodes.value.find(nd => nd.id === zoomNodeId.value)
    if (n) return [n]
  }
  if (!viewport.value) return nodes.value
  const vw = viewport.value
  const GAP = 80
  return nodes.value.map((n, i) => ({ ...n, position: { x: i * (vw.width + GAP), y: 0 } }))
})

// Layer 2 (#907) — double-click a node to ZOOM into its layout's breakpoint slider and author
// responsiveness (collapse/variants/sizes per width). Edits persist back onto that node (root +
// breakpoints), so the survey (layer 3) then reflects them. Size on the flow is unchanged — the
// slider is a simulation, exactly the "drag bigger/smaller while staying the same size" model.
const PHONE_VP = SPIKE_VIEWPORTS.find(v => v.label === 'Phone')!
const DESKTOP_VP = SPIKE_VIEWPORTS.find(v => v.label === 'Desktop')!
// Default the focus device to the screen we're on: Phone width on a narrow screen (so the zoomed
// layout renders ~1:1 and stays editable), Desktop on a wide one. You can still flip in the bar.
function defaultFocusVp(): SpikeViewport {
  return (import.meta.client && window.innerWidth < 700) ? PHONE_VP : DESKTOP_VP
}

// In-flow zoom edit: double-click a node → camera zooms in (zoomNodeId drives CroutonFlow's
// focus-node-id) AND that node becomes the live edit surface (focus). A slim bar picks the device
// (= which keypoint you author); dragging a pane on the node saves sizes to that keypoint.
const zoomNodeId = ref<string | null>(null)
const focus = shallowRef<SpikeFocus | null>(null)
provide(SPIKE_FOCUS_KEY, focus)

// The exact rect (flow coords) the focused node occupies — its board position + the device size we
// render it at. CroutonFlow frames this deterministically (fitBounds), so switching device just
// recomputes the rect and the camera re-frames; no re-measure/timing hack needed.
const focusBounds = computed(() => {
  if (!focus.value || !zoomNodeId.value) return null
  const n = nodes.value.find(nd => nd.id === zoomNodeId.value)
  return n ? { x: n.position.x, y: n.position.y, width: focus.value.vp.width, height: focus.value.vp.height } : null
})

function onNodeDblClick(id: string) {
  if (mode.value !== 'free') return
  const n = nodes.value.find(nd => nd.id === id)
  if (!n) return
  viewport.value = null // focus is a single-node view; leave the board-wide survey
  zoomNodeId.value = id
  focus.value = { node: n.data.node, vp: defaultFocusVp() }
}
function setFocusVp(vp: SpikeViewport) {
  if (!focus.value) return
  focus.value = { ...focus.value, vp } // resize the focused node → focusBounds recomputes → camera re-frames
}
// The width slider: scrub the previewed width freely (keeps the last preset's height). The camera
// keeps it ~the same on-screen size (CroutonFlow), so the layout reflows in place as you drag.
const focusWidth = computed({
  get: () => focus.value?.vp.width ?? 0,
  set: (w: number) => {
    if (focus.value) focus.value = { ...focus.value, vp: { ...focus.value.vp, width: w, label: `${w}px`, icon: 'i-lucide-ruler' } }
  },
})
function closeFocus() {
  focus.value = null
  zoomNodeId.value = null // CroutonFlow fits back out (capped, won't over-zoom)
  authorOpen.value = false
}

// A splitter drag on the focused node → save the new sizes to that device's keypoint. Applies onto
// the base root and stores it as a per-width breakpoint override (data.node itself is untouched, so
// the node keeps its identity and stays focused).
function upsertBp(bp: LayoutBreakpoint[] | undefined, width: number, root: LayoutNode): LayoutBreakpoint[] {
  const arr = [...(bp ?? [])]
  const i = arr.findIndex(b => b.minWidth === width)
  if (i >= 0) arr[i] = { ...arr[i]!, root }
  else arr.push({ minWidth: width, root })
  return arr.sort((a, b) => a.minWidth - b.minWidth)
}
function onFocusResize(group: LayoutNode, path: number[], sizes: number[], width: number) {
  const idx = nodes.value.findIndex(n => n.data.node === group)
  if (idx === -1) return
  const newRoot = applySizes(group, path, sizes)
  const bp = upsertBp(nodes.value[idx]!.data.bp, width, newRoot)
  nodes.value = nodes.value.map((n, i) => i === idx ? { ...n, data: { ...n.data, bp } } : n)
}
provide(SPIKE_RESIZE_KEY, onFocusResize)

// Advanced author (collapse motion / widget variants / per-breakpoint structure) — opt-in via the
// focus bar's "More", not auto-opened. Edits the focused node's full tree (root + breakpoints).
const authorOpen = ref(false)
const zoomNode = computed(() => zoomNodeId.value ? nodes.value.find(n => n.id === zoomNodeId.value) ?? null : null)
const zoomLabel = computed(() => zoomNode.value?.data.label ?? 'Layout')
const EMPTY_TREE: LayoutTree = { renderer: 'panes', root: { type: 'leaf', blockId: '', config: {} } }
const zoomTree = computed<LayoutTree>({
  get: () => {
    const n = zoomNode.value
    return n ? { renderer: 'panes' as const, root: n.data.node, breakpoints: n.data.bp } : EMPTY_TREE
  },
  set: (t: LayoutTree) => {
    const id = zoomNodeId.value
    if (!id) return
    nodes.value = nodes.value.map(n => n.id === id ? { ...n, data: { ...n.data, node: t.root, bp: t.breakpoints } } : n)
    if (focus.value) focus.value = { ...focus.value, node: t.root } // keep focus identity after a base edit
  },
})

// Mobile palette (bottom sheet) + the compiled-layout slideover open state.
const paletteOpen = ref(false)
const resultOpen = ref(false)

/** HTML5 drag source: stamp the crouton-item payload CroutonFlow's drop handler reads. */
function onDragStart(e: DragEvent, item: { blockId: string, label: string }) {
  e.dataTransfer?.setData('application/json', JSON.stringify({
    type: 'crouton-item',
    collection: 'artists',
    item: { id: `${item.blockId}-${++seq}`, ...item },
  }))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

/** CroutonFlow emits this on drop with the flow-space position — add a fresh leaf node. */
function onNodeDrop(item: Record<string, unknown>, position: { x: number, y: number }) {
  const label = String(item.label ?? item.blockId)
  const leaf: LayoutNode = { type: 'leaf', blockId: String(item.blockId), config: { collection: 'artists', heading: label } }
  nodes.value = [...nodes.value, { id: String(item.id), type: 'default', position, data: { node: leaf, label } }]
  fitOverview() // re-frame so you see everything that's been added (esp. the first block on mobile)
}

/** Combine two nodes into a split, flattening same-direction nesting so a third block joins
 *  the existing group as a sibling (and so spans the group's full cross-size, not just one). */
function combineNodes(a: LayoutNode, b: LayoutNode, direction: 'horizontal' | 'vertical', aFirst: boolean): LayoutNode {
  const ordered = aFirst ? [a, b] : [b, a]
  const children = ordered.flatMap(n => (n.type === 'split' && n.direction === direction) ? n.children : [n])
  return { type: 'split', direction, children }
}

// Snap tuning — shared by the live preview and the on-release merge so the glowing edge
// you saw is exactly the edge it clicks onto.
const SNAP_OPTS = { gap: 160, align: 0.2 } as const

/** Geometry-only: which other node (and its edge) a block dragged to `pos` snaps to, or null.
 *  `others` are the candidate nodes; the dragged block's footprint comes from `movedNode`. */
function snapAt(movedNode: LayoutNode, pos: { x: number, y: number }, others: FlowNode[]) {
  const md = sizeOf(movedNode)
  const drag: Rect = { x: pos.x, y: pos.y, width: md.width, height: md.height }
  const targets: SnapTarget[] = others.map((o, idx) => {
    const s = sizeOf(o.data.node)
    return { path: [idx], rect: { x: o.position.x, y: o.position.y, width: s.width, height: s.height } }
  })
  const snap = closestSnap(drag, targets, SNAP_OPTS)
  if (!snap) return null
  return { target: others[snap.path[0]!]!, edge: snap.edge, tRect: targets[snap.path[0]!]!.rect, md }
}

// Live snap guide (#907): CroutonFlow streams the dragged node's position via `@node-drag`
// (its collab sync already broadcasts it continuously). On each frame we recompute the snap
// candidate and light up the target's joining edge — so "the side that's gonna snap lines up"
// is visible BEFORE you let go, not just after the merge.
function onNodeDragLive(id: string, pos: { x: number, y: number }) {
  if (viewport.value) { snapPreview.value = null; return } // survey mode is read-only
  const moved = nodes.value.find(n => n.id === id)
  if (!moved) { snapPreview.value = null; return }
  const s = snapAt(moved.data.node, pos, nodes.value.filter(n => n.id !== id))
  snapPreview.value = s ? { node: s.target.data.node, edge: s.edge } : null
}

// In-flow snap + MERGE (#907) — snapping happens ON the Vue Flow canvas, no separate mode.
// CroutonFlow re-emits the moved rows on drag stop; we OWN that update (not v-model) so our
// write is the last one (a plain v-model would clobber it with the drop point). If the dropped
// node lands near another's edge, the two MERGE into one node whose `data.node` is a bound
// split — so the unit drags as one piece and the renderer stretches each pane to the group's
// full size (a block snapped to a 2-high stack spans its full height).
function onRowsUpdate(rowsRaw: Record<string, unknown>[]) {
  snapPreview.value = null // drag has ended — clear the live guide
  if (viewport.value) return // survey mode is read-only — don't merge or persist tiled positions
  const rows = rowsRaw as unknown as FlowNode[]
  const prev = new Map(nodes.value.map(n => [n.id, n.position]))
  const moved = rows.find((r) => {
    const p = prev.get(r.id)
    return p && (p.x !== r.position.x || p.y !== r.position.y)
  })
  if (!moved) { nodes.value = rows; return }

  const others = rows.filter(r => r.id !== moved.id)
  const s = snapAt(moved.data.node, moved.position, others)
  if (!s) { nodes.value = rows; return }

  const { target, edge, tRect, md } = s
  const horizontal = edge === 'left' || edge === 'right'
  const targetFirst = edge === 'right' || edge === 'bottom'
  const combined = combineNodes(target.data.node, moved.data.node, horizontal ? 'horizontal' : 'vertical', targetFirst)
  // Group origin: a left/top snap places the group to the left/above the target's old spot.
  const gx = edge === 'left' ? tRect.x - md.width : tRect.x
  const gy = edge === 'top' ? tRect.y - md.height : tRect.y
  const groupNode: FlowNode = { ...target, position: { x: Math.round(gx), y: Math.round(gy) }, data: { node: combined } }
  // Replace the target with the merged group; drop the moved node — they're now one unit.
  nodes.value = rows.filter(r => r.id !== moved.id && r.id !== target.id).concat(groupNode)
}

// Tap-to-add (#906 mobile fix): HTML5 drag doesn't fire on touch, and the bottom-sheet
// covers the canvas — so on a phone you can't drag a block onto the flow. Tapping a block
// adds it directly (drag still works on desktop). New nodes stagger left-to-right so the
// positional "As placed" reads in add order; the drawer stays open so you can add several.
const toast = useToast()
function addBlock(item: { blockId: string, label: string }) {
  onNodeDrop(
    { id: `${item.blockId}-${++seq}`, blockId: item.blockId, label: item.label },
    { x: nodes.value.length * 300 + 60, y: 140 },
  )
  toast.add({ title: `Added ${item.label}`, icon: 'i-lucide-plus', duration: 1200 })
}

/** Collect every placed block (blockId + heading) under a layout node. */
function flattenLeaves(node: LayoutNode): { blockId: string, label?: string }[] {
  if (node.type === 'leaf') {
    const heading = node.config?.heading
    return [{ blockId: node.blockId, label: typeof heading === 'string' ? heading : undefined }]
  }
  if (node.type === 'split') return node.children.flatMap(flattenLeaves)
  if (node.type === 'nested') return flattenLeaves(node.layout.root)
  return []
}

/** The dropped blocks, from whichever surface is active (Free nodes / Snap pieces may
 *  each already be a merged group, so flatten their leaves). */
function currentBlocks(): { blockId: string, label?: string }[] {
  return mode.value === 'snap'
    ? pieces.value.flatMap(p => flattenLeaves(p.node))
    : nodes.value.flatMap(n => flattenLeaves(n.data.node))
}
const blockCount = computed(() => currentBlocks().length)

/** Enter Snap mode — seed the compose canvas from the free nodes (each node's layout + size). */
function enterSnap() {
  if (mode.value === 'snap') return
  viewport.value = null // survey is a Free-mode overlay; leave it when switching to Snap
  const ns = nodes.value
  if (ns.length) {
    const minX = Math.min(...ns.map(n => n.position.x))
    const minY = Math.min(...ns.map(n => n.position.y))
    pieces.value = ns.map((n) => {
      const s = sizeOf(n.data.node)
      return {
        id: n.id,
        node: n.data.node,
        x: Math.round(n.position.x - minX) + 24,
        y: Math.round(n.position.y - minY) + 24,
        width: s.width,
        height: s.height,
        label: n.data.label,
      }
    })
  }
  mode.value = 'snap'
}
function enterFree() {
  mode.value = 'free'
}

// The proposals the result slideover shows; you flip between them by id.
const proposals = ref<CanvasProposal[]>([])
const selectedId = ref<string>('')
const resultTitle = ref('Layout')
const selected = computed<CanvasProposal | null>(
  () => proposals.value.find(p => p.id === selectedId.value) ?? proposals.value[0] ?? null,
)

/** ✨ Magic v1 (#908) — deterministic arrange + viability-gated archetype proposals. */
function magic() {
  const { proposals: ps, defaultId } = magicArrange(currentBlocks())
  proposals.value = ps
  selectedId.value = defaultId ?? ps[0]?.id ?? ''
  resultSource.value = 'deterministic'
  resultTitle.value = '✨ Magic layout'
  paletteOpen.value = false
  resultOpen.value = ps.length > 0
}

/** ✨ Magic v2 (#909) — AI proposes + ranks; deterministic composer is the viability guardrail. */
async function magicAI() {
  if (aiLoading.value) return
  aiLoading.value = true
  try {
    const { proposals: ps, defaultId, source } = await magicArrangeAI(currentBlocks(), aiIntent.value)
    proposals.value = ps
    selectedId.value = defaultId ?? ps[0]?.id ?? ''
    resultSource.value = source === 'ai' ? 'ai' : 'fallback'
    resultTitle.value = source === 'ai' ? '✨ Magic layout · AI' : '✨ Magic layout'
    paletteOpen.value = false
    resultOpen.value = ps.length > 0
  }
  finally {
    aiLoading.value = false
  }
}

// "As placed" — positional infer over the canvas nodes. Each node carries its own
// `data.node` (a leaf, or a snapped split): 1 node → its node IS the root; many → a split
// whose axis is inferred from the spread, ordered along it, each node's layout preserved.
function inferPositional(ns: FlowNode[]): LayoutTree | null {
  if (!ns.length) return null
  if (ns.length === 1) return { renderer: 'panes', root: ns[0]!.data.node }
  const spread = (a: number[]) => Math.max(...a) - Math.min(...a)
  const horizontal = spread(ns.map(n => n.position.x)) >= spread(ns.map(n => n.position.y))
  const ordered = [...ns].sort((a, b) => (horizontal ? a.position.x - b.position.x : a.position.y - b.position.y))
  return {
    renderer: 'panes',
    root: {
      type: 'split',
      direction: horizontal ? 'horizontal' : 'vertical',
      children: ordered.map(n => ({ ...n.data.node, defaultSize: Math.round((100 / ordered.length) * 10) / 10 })),
    },
  }
}
// Compile the current surface into a LayoutTree. Snap → the bound `piecesToTree` (#899);
// Free → the positional infer. Both flow into the SAME slideover (one shared model).
const compileLabel = computed(() => (mode.value === 'snap' ? 'Compile snapped' : 'As placed'))
function compile() {
  const snap = mode.value === 'snap'
  const tree = snap
    ? (pieces.value.length ? piecesToTree(pieces.value) : null)
    : inferPositional(nodes.value)
  if (!tree) { proposals.value = []; return }
  proposals.value = [{
    id: 'positional',
    label: snap ? 'Snapped' : 'As placed',
    icon: snap ? 'i-lucide-magnet' : 'i-lucide-move',
    note: snap ? 'Your snapped arrangement' : 'Exactly where you dropped them',
    tree,
    viable: checkViability(tree, [1280, 768]).viable,
  }]
  selectedId.value = 'positional'
  resultTitle.value = snap ? 'Snapped layout' : 'Compiled layout'
  paletteOpen.value = false
  resultOpen.value = true
}
function reset() {
  nodes.value = []
  pieces.value = []
  proposals.value = []
  selectedId.value = ''
  resultOpen.value = false
}
</script>

<template>
  <div class="flex h-screen flex-col bg-default text-default">
    <!-- Palette markup, defined once and reused in the desktop sidebar + mobile drawer -->
    <DefinePalette>
      <div class="flex flex-col gap-2">
        <UCard
          v-for="b in drawer"
          :key="b.blockId"
          draggable="true"
          :ui="{ root: 'cursor-pointer transition-colors hover:ring-primary active:scale-[0.99]', body: 'flex items-center gap-2 p-3 sm:p-3' }"
          @dragstart="onDragStart($event, b)"
          @click="addBlock(b)"
        >
          <UIcon :name="b.icon" class="size-4 text-primary" />
          <span class="text-sm">{{ b.label }}</span>
          <UIcon name="i-lucide-plus" class="ml-auto size-4 text-muted" />
        </UCard>
      </div>
      <div class="mt-4 flex flex-col gap-2">
        <UButton size="sm" color="primary" icon="i-lucide-wand-2" :disabled="!blockCount" block @click="magic">✨ Magic arrange</UButton>
        <!-- AI tier — only shown when the crouton-ai add-on is installed (hasApp('ai'), #909) -->
        <template v-if="hasAI">
          <UInput
            v-model="aiIntent"
            size="sm"
            icon="i-lucide-message-square-text"
            placeholder="Describe the app (optional)"
            :disabled="!blockCount"
          />
          <UButton size="sm" color="primary" variant="soft" icon="i-lucide-sparkles" :loading="aiLoading" :disabled="!blockCount" block @click="magicAI">✨ Magic (AI)</UButton>
        </template>
        <UButton size="sm" color="neutral" variant="soft" :icon="mode === 'snap' ? 'i-lucide-magnet' : 'i-lucide-move'" :disabled="!blockCount" block @click="compile">{{ compileLabel }}</UButton>
        <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-rotate-ccw" block @click="reset">Reset</UButton>
      </div>
    </DefinePalette>

    <header class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-default px-5 py-3">
      <h1 class="text-base font-semibold">Spike · build an app on Vue Flow</h1>
      <p class="hidden text-xs text-muted lg:block">Drop blocks → arrange (Free / Snap) → ✨ Magic or compile. #905</p>
      <div class="ml-auto flex items-center gap-2">
        <!-- Viewport survey (#907 layer 3) — flip the whole board to a device width (Free mode only).
             Visible on mobile too (survey is especially handy on a phone); the header wraps if tight. -->
        <div v-if="mode === 'free'" class="flex items-center gap-0.5 rounded-lg border border-default p-0.5">
          <UButton
            size="xs"
            icon="i-lucide-frame"
            label="Fit"
            :color="viewport === null ? 'primary' : 'neutral'"
            :variant="viewport === null ? 'soft' : 'ghost'"
            @click="viewport = null"
          />
          <UButton
            v-for="v in SPIKE_VIEWPORTS"
            :key="v.label"
            size="xs"
            :icon="v.icon"
            :title="`${v.label} · ${v.width}px`"
            :aria-label="v.label"
            :color="viewport?.label === v.label ? 'primary' : 'neutral'"
            :variant="viewport?.label === v.label ? 'soft' : 'ghost'"
            @click="viewport = v"
          />
        </div>
        <!-- Free placement ⇄ magnetic Snap — non-exclusive surfaces over the same blocks (#907) -->
        <div class="flex items-center gap-0.5 rounded-lg border border-default p-0.5">
          <UButton
            size="xs"
            icon="i-lucide-move"
            label="Free"
            :color="mode === 'free' ? 'primary' : 'neutral'"
            :variant="mode === 'free' ? 'soft' : 'ghost'"
            @click="enterFree"
          />
          <UButton
            size="xs"
            icon="i-lucide-magnet"
            label="Snap"
            :color="mode === 'snap' ? 'primary' : 'neutral'"
            :variant="mode === 'snap' ? 'soft' : 'ghost'"
            @click="enterSnap"
          />
        </div>
        <!-- Mobile: open the palette as a bottom sheet (desktop has the persistent sidebar) -->
        <UButton
          class="md:hidden"
          size="xs"
          icon="i-lucide-layout-grid"
          label="Blocks"
          color="neutral"
          variant="soft"
          @click="paletteOpen = true"
        />
        <UButton
          v-if="proposals.length"
          size="xs"
          icon="i-lucide-panel-right-open"
          label="Layout"
          color="neutral"
          variant="soft"
          @click="resultOpen = true"
        />
      </div>
      <!-- Version stamp — a DIRECT child of the wrapping header so on mobile it drops to its own
           full-width line (inside the non-wrapping cluster above it collapsed to a vertical sliver). -->
      <span class="order-last w-full break-words rounded-full border border-default bg-elevated px-2 py-0.5 text-center font-mono text-[10px] text-muted sm:order-none sm:w-auto sm:basis-auto">{{ BUILD }}</span>
    </header>

    <div class="flex min-h-0 flex-1">
      <!-- Desktop drawer — the collection's blocks, draggable onto the canvas -->
      <aside class="hidden w-56 shrink-0 overflow-y-auto border-r border-default bg-elevated/40 p-3 md:block">
        <p class="mb-2 text-xs uppercase tracking-widest text-muted">Artists · blocks</p>
        <ReusePalette />
      </aside>

      <!-- The canvas — Free (Vue Flow) or Snap (magnetic compose canvas) -->
      <div class="relative min-w-0 flex-1">
        <ClientOnly>
          <!-- Free placement: drag blocks from the drawer, position freely -->
          <CroutonFlow
            v-if="mode === 'free'"
            ref="flowRef"
            :rows="flowRows"
            collection="artists"
            :fit-view-on-mount="false"
            data-mode="ephemeral"
            :default-node-component="blockNode"
            :draggable="viewport === null && !focus"
            :focus-bounds="focusBounds"
            allow-drop
            :minimap="false"
            @node-drop="onNodeDrop"
            @node-drag="onNodeDragLive"
            @node-dbl-click="onNodeDblClick"
            @update:rows="onRowsUpdate"
          />
          <!-- Snap: the WS4 magnetic compose canvas — drag cards together → bound split (#907) -->
          <div v-else class="absolute inset-0 p-3">
            <CroutonLayoutComposeCanvas v-model="pieces" class="h-full w-full" />
          </div>
        </ClientOnly>

        <!-- In-flow zoom edit bar (#907): pick the device (= which keypoint you're authoring); drag a
             pane on the zoomed node to lock its size at that keypoint. "More" opens the full author. -->
        <div
          v-if="focus"
          class="pointer-events-auto absolute inset-x-0 top-2 z-20 mx-auto flex w-fit items-center gap-1 rounded-full border border-primary/40 bg-elevated/95 px-2 py-1 shadow-lg backdrop-blur"
        >
          <UIcon name="i-lucide-ruler" class="ml-1 size-3.5 text-primary" />
          <span class="w-12 text-[11px] font-medium tabular-nums text-primary">{{ focus.vp.width }}px</span>
          <!-- Continuous width slider — scrub the previewed screen width; the camera zooms to keep
               the layout ~the same on-screen size, so you watch it reflow (#907). -->
          <USlider v-model="focusWidth" :min="320" :max="1600" :step="10" size="xs" class="w-28" />
          <div class="mx-1 flex items-center gap-0.5">
            <UButton
              v-for="v in SPIKE_VIEWPORTS"
              :key="v.label"
              size="xs"
              :icon="v.icon"
              :aria-label="v.label"
              :title="`${v.label} · ${v.width}px`"
              :color="focus.vp.label === v.label ? 'primary' : 'neutral'"
              :variant="focus.vp.label === v.label ? 'soft' : 'ghost'"
              @click="setFocusVp(v)"
            />
          </div>
          <UButton size="xs" icon="i-lucide-sliders-horizontal" color="neutral" variant="ghost" label="More" @click="authorOpen = true" />
          <UButton size="xs" icon="i-lucide-check" color="primary" variant="soft" label="Done" @click="closeFocus" />
        </div>

        <!-- Snap hints (when there's something to arrange) -->
        <p
          v-if="mode === 'free' && !focus && viewport && nodes.length"
          class="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full border border-primary/40 bg-elevated/90 px-3 py-1 text-[11px] text-primary backdrop-blur"
        >
          Surveying at {{ viewport.label }} · {{ viewport.width }}px — read-only · hit ⛶ to fit · pick <strong>Fit</strong> to edit
        </p>
        <p
          v-else-if="mode === 'free' && !focus && nodes.length >= 2"
          class="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full border border-default bg-elevated/90 px-3 py-1 text-[11px] text-muted backdrop-blur"
        >
          Drag a block next to another → they snap together · then ✨ Magic or compile · double-click to zoom in
        </p>
        <p
          v-else-if="mode === 'snap' && pieces.length"
          class="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full border border-default bg-elevated/90 px-3 py-1 text-[11px] text-muted backdrop-blur"
        >
          Drag a card beside another → they snap into a split · resize from the corner
        </p>

        <!-- Empty states -->
        <p
          v-if="mode === 'free' && !nodes.length"
          class="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted"
        >
          <span class="hidden md:inline">Tap (or drag) a block from the drawer onto the canvas →</span>
          <span class="md:hidden">Tap <strong>Blocks</strong>, then tap a block to add it.</span>
        </p>
        <p
          v-else-if="mode === 'snap' && !pieces.length"
          class="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted"
        >
          Drop blocks in <strong>Free</strong> mode, then switch back here to snap them together.
        </p>
      </div>
    </div>

    <!-- Mobile palette — a bottom sheet, out of the way until summoned (#906) -->
    <UDrawer v-model:open="paletteOpen" :handle="true" title="Artists · blocks">
      <template #body>
        <div class="p-1 pb-4">
          <p class="px-1 pb-2 text-xs text-muted">Tap a block to add it to the canvas — then ✨ Magic or compile.</p>
          <ReusePalette />
        </div>
      </template>
    </UDrawer>

    <!-- Result — magic proposals (or the positional compile), in a contextual slideover -->
    <USlideover v-model:open="resultOpen" :title="resultTitle" :ui="{ content: 'sm:max-w-lg' }">
      <template #body>
        <div class="flex h-full flex-col gap-3">
          <!-- Source badge — AI-ranked (#909) or the deterministic fallback when AI is off/unavailable -->
          <div v-if="resultSource !== 'deterministic'" class="flex items-center gap-2">
            <UBadge
              v-if="resultSource === 'ai'"
              color="primary"
              variant="subtle"
              size="sm"
              icon="i-lucide-sparkles"
            >AI ranked</UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="subtle"
              size="sm"
              icon="i-lucide-cpu"
            >deterministic fallback</UBadge>
            <span v-if="resultSource === 'fallback'" class="text-xs text-muted">AI unavailable — used the viability composer</span>
          </div>
          <!-- Flip between archetype proposals (#908) -->
          <div v-if="proposals.length > 1" class="flex flex-wrap gap-1.5">
            <UButton
              v-for="p in proposals"
              :key="p.id"
              :icon="p.icon"
              :label="p.label"
              size="xs"
              :color="p.id === selectedId ? 'primary' : 'neutral'"
              :variant="p.id === selectedId ? 'soft' : 'ghost'"
              @click="selectedId = p.id"
            />
          </div>
          <div v-if="selected" class="flex items-center gap-2 text-xs text-muted">
            <span>{{ selected.note }}</span>
            <UBadge
              v-if="selected.viable"
              color="success"
              variant="subtle"
              size="sm"
              icon="i-lucide-check"
            >viable</UBadge>
            <UBadge
              v-else
              color="warning"
              variant="subtle"
              size="sm"
              icon="i-lucide-alert-triangle"
            >tight fit</UBadge>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-default">
            <CroutonLayoutRenderer
              v-if="selected"
              :key="selected.id"
              :node="selected.tree.root"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Layer 2 + in-flow zoom (#907): double-click zooms the CANVAS into the node (focus-node-id),
         and the responsiveness author docks on the right WITHOUT a backdrop — so the zoomed layout
         stays visible on the flow beside it (not a fullscreen takeover). Edits persist via zoomTree. -->
    <USlideover
      v-model:open="authorOpen"
      :title="`Responsiveness · ${zoomLabel}`"
      :overlay="false"
      :dismissible="false"
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body>
        <div class="flex h-full flex-col">
          <p class="mb-3 text-xs text-muted">Advanced: collapse motion, per-block widget variants and per-breakpoint structure. (Sizes are quicker to set by dragging panes right on the zoomed node.)</p>
          <div class="min-h-0 flex-1 overflow-auto">
            <CroutonLayoutBreakpointAuthor v-model="zoomTree" />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
