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
import type { LayoutNode, LayoutSplit, LayoutTree, LayoutBreakpoint } from '@fyit/crouton-core/app/types/layout'
import { piecesToTree } from '@fyit/crouton-layout/app/utils/layout-compose-bridge'
import { closestSnap, type Rect, type SnapTarget } from '@fyit/crouton-layout/app/utils/layout-snap'
import { detachNode } from '@fyit/crouton-layout/app/utils/layout-edit'
import type { ComposePiece } from '@fyit/crouton-layout/app/composables/useCroutonComposeGestures'
import SpikeBlockNode from '~/components/SpikeBlockNode.vue'

useHead({ title: 'Spike · app on Vue Flow' })
const BUILD = 'page-compose-10 · #941 · drag a block between a combined layout’s panes (insert)'

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
interface FlowNode { id: string, type: string, position: { x: number, y: number }, data: { node: LayoutNode, label?: string, bp?: LayoutBreakpoint[], isPage?: boolean } }
const nodes = ref<FlowNode[]>([])
let seq = 0

// Camera: re-frame the whole board to an overview after adding a block. CroutonFlow only
// fits-to-view on mount (when the board is empty), so without this a freshly-added block sits at
// the default zoom — which on a narrow phone fills the screen. fitView with maxZoom:1 keeps a
// single block at a comfortable size and shows everything you've added. Survey/focus own the
// camera, so skip then.
const flowRef = ref<{
  fitView?: (o?: Record<string, unknown>) => void
  fitBounds?: (b: { x: number, y: number, width: number, height: number }, o?: Record<string, unknown>) => void
} | null>(null)
function fitOverview() {
  if (viewport.value || zoomNodeId.value) return // survey / edit-view own the screen
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

// Pull-the-pane-to-detach (#907) — the inverse of snap-merge, a BOARD gesture. A SpikeBlockNode pops
// a pane out of a merged group and reports it here (via SPIKE_DETACH_KEY — it can't emit up through
// CroutonFlow). We split the group's `data.node`, shrink it to the remainder, and place the freed pane
// WHERE you dropped it (payload.dropOffset, flow coords) — falling back to the pulled side if it's
// unavailable. (Editing a node is the separate full-screen edit view — double-click; this is detach.)
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
  if (!viewport.value) return nodes.value
  const vw = viewport.value
  const GAP = 80
  return nodes.value.map((n, i) => ({ ...n, position: { x: i * (vw.width + GAP), y: 0 } }))
})

// Focus EDIT (#907 v2) — double-click a node and its layout ZOOMS UP in place: SpikeFocusShell
// animates the card from the node's real on-screen rect to centre (a shared-element transition, NOT
// the Vue Flow camera — so no re-measure/framing fight), the board falls away behind a blurred scrim,
// and a minimal control shell hugs the layout (key-points pop, device + width on a floating pill;
// collapse motion / variants behind a "⋯"). `zoomNodeId` ≠ null means the shell is open; `originRect`
// is the node's rect captured at click so the zoom flies from exactly there.
const zoomNodeId = ref<string | null>(null)
const originRect = ref<{ x: number, y: number, width: number, height: number } | null>(null)
const zoomNode = computed(() => zoomNodeId.value ? nodes.value.find(n => n.id === zoomNodeId.value) ?? null : null)
const zoomLabel = computed(() => zoomNode.value?.data.label ?? 'Layout')
const editing = computed(() => zoomNode.value !== null)

function onNodeDblClick(id: string) {
  if (mode.value !== 'free') return
  if (!nodes.value.some(nd => nd.id === id)) return
  // Capture the node's current on-screen rect so the shell can fly the zoom from exactly there.
  const el = import.meta.client ? document.querySelector(`.vue-flow__node[data-id="${id}"]`) : null
  const r = el?.getBoundingClientRect()
  originRect.value = r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
  viewport.value = null // editing one node; leave the board-wide survey
  zoomNodeId.value = id
}
function closeEdit() {
  zoomNodeId.value = null
  originRect.value = null
}

// The focused node's layout as a v-model'd LayoutTree (root + authored breakpoints). The author
// edits this directly — collapse/variant/sizes-per-keypoint all flow through `update:modelValue`,
// so resize→keypoint is the author's own job (no separate SPIKE_RESIZE wiring). Persists back onto
// the node by id, so the survey then reflects the authored responsiveness.
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
  },
})

// Detach is the BOARD pull-pane gesture (onDetach above), not an in-view affordance — so the edit
// view stays focused purely on responsiveness. To split a merged node, pull a pane out on the board.

// Mobile palette (bottom sheet) + the compiled-layout slideover open state.
const paletteOpen = ref(false)
const resultOpen = ref(false)

// Bottom command pill (#907) — the board chrome lives in a floating bottom pill (Fit · Responsive ·
// Blocks · Magic), iOS-toolbar style. Tapping "Responsive" lets the pill TAKE OVER → device chips;
// "← " returns to the main set. (Survey is Free-mode only; leaving Responsive resets to Fit.)
const pillMode = ref<'main' | 'responsive'>('main')
function openResponsive() { pillMode.value = 'responsive' }
// Leaving the Responsive picker drops the survey (it only exists while you're choosing a width).
function closeResponsive() { pillMode.value = 'main'; viewport.value = null }
// Top-level Fit = zoom the camera to show every node (and ensure we're not surveying). A real
// "fit to view". ONE fitView call (not fitOverview's double-call, which is for async-measured fresh
// drops — on a settled board two competing zoom animations look janky/blurry). Single clean fit.
function fitBoard() {
  viewport.value = null
  pillMode.value = 'main'
  nextTick(() => flowRef.value?.fitView?.({ duration: 250, padding: 0.18, maxZoom: 1 }))
}

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

// Where a dragged node wants to land (#941 Phase A): INSERT between the panes of a combined (split)
// target it's dragged OVER, or EDGE-merge onto a side of a target it's near (the original snap).
type SnapIntent =
  | { kind: 'insert', target: FlowNode, index: number, frac: number, axis: 'horizontal' | 'vertical' }
  | { kind: 'edge', target: FlowNode, edge: SnapEdge }
function snapIntent(movedNode: LayoutNode, pos: { x: number, y: number }, others: FlowNode[]): SnapIntent | null {
  const md = sizeOf(movedNode)
  const cx = pos.x + md.width / 2
  const cy = pos.y + md.height / 2
  // 1) INSERT: the drag's centre is over a split target → drop between its panes. Pick the nearest
  // seam (incl. the two ends) along the split axis from the children's size proportions.
  for (const o of others) {
    const node = o.data.node
    if (node.type !== 'split') continue
    const ts = sizeOf(node)
    const tx = o.position.x, ty = o.position.y
    if (cx < tx || cx > tx + ts.width || cy < ty || cy > ty + ts.height) continue
    const horizontal = node.direction === 'horizontal'
    const sizes = node.children.map(c => c.defaultSize ?? (100 / node.children.length))
    const total = sizes.reduce((a, b) => a + b, 0) || node.children.length
    const bounds = [0]
    let acc = 0
    for (const s of sizes) { acc += s / total; bounds.push(acc) } // [0, f1, …, 1] — children+1 seams
    const rel = horizontal ? (cx - tx) / ts.width : (cy - ty) / ts.height
    let index = 0, bestD = Infinity
    bounds.forEach((b, i) => { const d = Math.abs(b - rel); if (d < bestD) { bestD = d; index = i } })
    return { kind: 'insert', target: o, index, frac: bounds[index]!, axis: horizontal ? 'horizontal' : 'vertical' }
  }
  // 2) EDGE: original side-snap (merge onto a target's outer edge).
  const s = snapAt(movedNode, pos, others)
  return s ? { kind: 'edge', target: s.target, edge: s.edge } : null
}

/** Insert a node into a split at `index`, redistributing sizes evenly (keeps it simple + legible). */
function insertIntoSplit(split: LayoutSplit, index: number, node: LayoutNode): LayoutSplit {
  const children = [...split.children]
  children.splice(index, 0, node)
  const size = Math.round((100 / children.length) * 10) / 10
  return { ...split, children: children.map(c => ({ ...c, defaultSize: size })) }
}

// Live snap guide (#907): CroutonFlow streams the dragged node's position via `@node-drag`
// (its collab sync already broadcasts it continuously). On each frame we recompute the snap
// candidate and light up the target's joining edge — so "the side that's gonna snap lines up"
// is visible BEFORE you let go, not just after the merge.
// Dwell-to-snap (#941): a snap takes intent, not a brush-past. The moment you're near a snap
// point it shows SOFT (blue, "snap point here"); hold there ~0.6s and it ARMS (green, "release to
// snap"). A timer (not frame-based) so it still arms while the finger holds perfectly still (no
// drag events fire then). Moving away / to a different edge resets it.
const SNAP_DWELL_MS = 600
let snapKey: string | null = null
let snapTimer: number | null = null
function clearSnapTimer() { if (snapTimer != null) { window.clearTimeout(snapTimer); snapTimer = null } }
function resetSnap() { snapPreview.value = null; snapKey = null; clearSnapTimer() }

function onNodeDragLive(id: string, pos: { x: number, y: number }) {
  if (viewport.value) { resetSnap(); return } // survey mode is read-only
  const moved = nodes.value.find(n => n.id === id)
  if (!moved) { resetSnap(); return }
  const intent = snapIntent(moved.data.node, pos, nodes.value.filter(n => n.id !== id))
  if (!intent) { resetSnap(); return } // out of range → no candidate, dwell resets
  const key = intent.kind === 'insert' ? `ins-${intent.target.id}-${intent.index}` : `edge-${intent.target.id}-${intent.edge}`
  const base: SpikeSnapPreview = intent.kind === 'insert'
    ? { node: intent.target.data.node, insert: { axis: intent.axis, frac: intent.frac, index: intent.index } }
    : { node: intent.target.data.node, edge: intent.edge }
  if (key === snapKey) {
    // Same candidate as last frame — keep the (possibly already-armed) state; don't restart dwell.
    snapPreview.value = { ...base, armed: snapPreview.value?.armed === true }
    return
  }
  // New candidate → soft state + (re)start the dwell-to-arm timer.
  snapKey = key
  clearSnapTimer()
  snapPreview.value = { ...base, armed: false }
  snapTimer = window.setTimeout(() => {
    if (snapKey === key && snapPreview.value) snapPreview.value = { ...snapPreview.value, armed: true }
  }, SNAP_DWELL_MS)
}

// In-flow snap + MERGE (#907) — snapping happens ON the Vue Flow canvas, no separate mode.
// CroutonFlow re-emits the moved rows on drag stop; we OWN that update (not v-model) so our
// write is the last one (a plain v-model would clobber it with the drop point). If the dropped
// node lands near another's edge, the two MERGE into one node whose `data.node` is a bound
// split — so the unit drags as one piece and the renderer stretches each pane to the group's
// full size (a block snapped to a 2-high stack spans its full height).
function onRowsUpdate(rowsRaw: Record<string, unknown>[]) {
  const armed = snapPreview.value?.armed === true ? snapPreview.value : null // the green candidate at release
  resetSnap() // drag has ended — clear the live guide + dwell timer
  if (viewport.value) return // survey mode is read-only — don't merge or persist tiled positions
  const rows = rowsRaw as unknown as FlowNode[]
  const prev = new Map(nodes.value.map(n => [n.id, n.position]))
  const moved = rows.find((r) => {
    const p = prev.get(r.id)
    return p && (p.x !== r.position.x || p.y !== r.position.y)
  })
  if (!moved) { nodes.value = rows; return }
  // Released while only SOFT (not held long enough) → just place it; snapping requires the dwell.
  if (!armed) { nodes.value = rows; return }

  // The target FlowNode is the one whose layout node is the armed candidate (node identity is stable
  // across a drag — only positions change — so this matches what the green guide pointed at).
  const target = rows.find(r => r.id !== moved.id && r.data.node === armed.node)
  if (!target) { nodes.value = rows; return }
  const md = sizeOf(moved.data.node)
  // Page (favorited) ALWAYS consumes (#942): if either side is the page, the result stays the page.
  const keepPage = (target.data.isPage || moved.data.isPage) ? { isPage: true } : {}

  // INSERT between the panes of the combined target (#941 Phase A).
  if (armed.insert && target.data.node.type === 'split') {
    const newNode = insertIntoSplit(target.data.node, armed.insert.index, moved.data.node)
    const groupNode: FlowNode = { ...target, data: { node: newNode, ...keepPage } }
    nodes.value = rows.filter(r => r.id !== moved.id && r.id !== target.id).concat(groupNode)
    return
  }

  // EDGE merge onto a side of the target (the original snap).
  if (armed.edge) {
    const edge = armed.edge
    const horizontal = edge === 'left' || edge === 'right'
    const targetFirst = edge === 'right' || edge === 'bottom'
    const combined = combineNodes(target.data.node, moved.data.node, horizontal ? 'horizontal' : 'vertical', targetFirst)
    const gx = edge === 'left' ? target.position.x - md.width : target.position.x
    const gy = edge === 'top' ? target.position.y - md.height : target.position.y
    const groupNode: FlowNode = { ...target, position: { x: Math.round(gx), y: Math.round(gy) }, data: { node: combined, ...keepPage } }
    nodes.value = rows.filter(r => r.id !== moved.id && r.id !== target.id).concat(groupNode)
    return
  }

  nodes.value = rows
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

// ── Site level (#940, approach B) — a page-flow ON TOP of the spike board ──────
// Pick a page on the flow → its layout seeds the board → arrange/edit (incl. the
// focus editor) → "← Pages" stores it back. One board (= one layout) per page,
// persisted in-session so zooming out to Site and back keeps your edits exactly.
interface BuilderPage { id: string, label: string, icon?: string, tree: LayoutTree }
const pageSplit = (a: string, b: string, dir: 'horizontal' | 'vertical' = 'horizontal'): LayoutTree['root'] => ({
  type: 'split', direction: dir,
  children: [{ type: 'leaf', blockId: a, defaultSize: 50 }, { type: 'leaf', blockId: b, defaultSize: 50 }],
})
const PAGES: BuilderPage[] = [
  {
    id: 'dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard',
    tree: { renderer: 'panes', root: { type: 'split', direction: 'horizontal', children: [
      { type: 'leaf', blockId: 'artists-list', defaultSize: 34 },
      { type: 'leaf', blockId: 'artists-stats', defaultSize: 33 },
      { type: 'leaf', blockId: 'artists-form', defaultSize: 33 },
    ] } },
  },
  { id: 'reports', label: 'Reports', icon: 'i-lucide-bar-chart-3', tree: { renderer: 'panes', root: pageSplit('artists-stats', 'artists-list') } },
  { id: 'settings', label: 'Settings', icon: 'i-lucide-settings', tree: { renderer: 'panes', root: { type: 'leaf', blockId: 'artists-form' } } },
]
// The same pages as crouton-flow rows (Dashboard is root; others hang off it).
const pageRows = [
  { id: 'dashboard', label: 'Dashboard', parentId: null },
  { id: 'reports', label: 'Reports', parentId: 'dashboard' },
  { id: 'settings', label: 'Settings', parentId: 'dashboard' },
]
const pageById = (id: unknown) => PAGES.find(p => p.id === String(id))

// Per-page board state — persist the FlowNode[] verbatim so positions, merges, and
// per-node breakpoints all survive a round-trip out to Site and back (no lossy recompile).
const pageBoards = new Map<string, FlowNode[]>()
const selectedPageId = ref<string | null>(null)
const currentPageLabel = computed(() => (selectedPageId.value ? pageById(selectedPageId.value)?.label ?? 'Page' : ''))

function labelFor(node: LayoutNode): string {
  if (node.type === 'leaf') { const h = node.config?.heading; return typeof h === 'string' ? h : node.blockId }
  if (node.type === 'nested') return node.label || 'App'
  return 'Group'
}
/** Seed an existing page as ONE composed node — the whole layout, badged as THE page (#942), so
 *  zooming in shows what the page actually looks like (WYSIWYG), not loose exploded cards. Drafts
 *  you add later coexist beside it. (An empty page just starts with a blank board.) */
function treeToBoardNodes(tree: LayoutTree): FlowNode[] {
  return [{
    id: `page-${selectedPageId.value}-${++seq}`,
    type: 'default',
    position: { x: 80, y: 120 },
    data: { node: tree.root, label: pageById(selectedPageId.value)?.label ?? 'Page', bp: tree.breakpoints, isPage: true },
  }]
}

// ── Page promotion (#942) — the board is a sandbox; one node is "the page" (data.isPage). ──
function JSONclone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T }
/** Promote a node to BE the page — the badge moves to it; all others become drafts. */
function setAsPage(node: LayoutNode) {
  nodes.value = nodes.value.map(n => ({ ...n, data: { ...n.data, isPage: n.data.node === node } }))
}
/** Duplicate a node as a free draft (deep-cloned) so you can rearrange the copy, then promote it. */
function duplicateNode(node: LayoutNode) {
  const src = nodes.value.find(n => n.data.node === node)
  if (!src) return
  nodes.value = [...nodes.value, {
    id: `copy-${++seq}`,
    type: 'default',
    position: { x: src.position.x + 48, y: src.position.y + 48 },
    data: {
      node: JSONclone(src.data.node),
      label: src.data.label ? `${src.data.label} copy` : undefined,
      bp: src.data.bp ? JSONclone(src.data.bp) : undefined,
      isPage: false,
    },
  }]
}
provide(SPIKE_SET_PAGE_KEY, setAsPage)
provide(SPIKE_DUPLICATE_KEY, duplicateNode)
/** Stash the current board onto the open page so it can be restored on return. */
function stashCurrentBoard() {
  if (selectedPageId.value) pageBoards.set(selectedPageId.value, nodes.value)
}
/** Centre + fit the page's layout on entry. The flow is freshly mounted (v-if) and Vue Flow
 *  measures node size async, so a single early fit frames a stale (zero/partial) box and the
 *  layout falls off-screen — retry across a few frames until the node is measured. */
function fitPage() {
  if (viewport.value || zoomNodeId.value) return
  const fit = () => {
    const page = nodes.value.find(n => n.data.isPage)
    if (page) {
      // Frame the page node by its KNOWN geometry (position + footprint size), NOT Vue Flow's
      // measured dimensions — those are stale on a fresh mount. duration:0 = snap to fitted on
      // arrival (no visible zoom-out animation); the early retries just make sure the snap lands
      // once flowRef is mounted.
      const s = sizeOf(page.data.node)
      flowRef.value?.fitBounds?.({ x: page.position.x, y: page.position.y, width: s.width, height: s.height }, { duration: 0, padding: 0.18 })
    }
    else {
      flowRef.value?.fitView?.({ duration: 0, padding: 0.2, maxZoom: 1 })
    }
  }
  nextTick(fit)
  for (const d of [40, 120, 300]) window.setTimeout(fit, d)
}
/** Site → page: load (or first-seed) that page's board and show the editor. */
function enterPage(id: string) {
  const page = pageById(id)
  if (!page) return
  stashCurrentBoard()
  // clean transient board state for a fresh entry
  mode.value = 'free'; viewport.value = null; zoomNodeId.value = null; originRect.value = null
  proposals.value = []; resultOpen.value = false; paletteOpen.value = false
  selectedPageId.value = id
  nodes.value = pageBoards.get(id) ?? treeToBoardNodes(page.tree)
  fitPage()
}
/** Page → Site: persist the board and go back to the page flow. */
function exitToPages() {
  stashCurrentBoard()
  zoomNodeId.value = null; originRect.value = null; viewport.value = null
  selectedPageId.value = null
}
</script>

<template>
  <!-- h-dvh (dynamic viewport height), NOT h-screen/100vh — so the bottom command pill sits above the
       mobile browser toolbar instead of behind it (iOS Safari occludes 100vh's bottom). -->
  <div class="flex h-dvh flex-col bg-default text-default">
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
      <UButton
        v-if="selectedPageId"
        icon="i-lucide-arrow-left"
        label="Pages"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="exitToPages"
      />
      <h1 class="text-base font-semibold">
        <template v-if="selectedPageId"><span class="text-muted">builder.demo ›</span> {{ currentPageLabel }}</template>
        <template v-else>Crouton Builder · pages</template>
      </h1>
      <p class="ml-auto hidden text-xs text-muted lg:block">Pages → zoom a page → arrange → ✨ Magic. #940</p>
      <!-- All board controls live in the bottom command pill (Fit · Responsive · Blocks · Magic). -->
      <!-- Version stamp — a DIRECT child of the wrapping header so on mobile it drops to its own
           full-width line (inside the non-wrapping cluster above it collapsed to a vertical sliver). -->
      <span class="order-last w-full break-words rounded-full border border-default bg-elevated px-2 py-0.5 text-center font-mono text-[10px] text-muted sm:order-none sm:w-auto sm:basis-auto">{{ BUILD }}</span>
    </header>

    <div v-if="selectedPageId" class="flex min-h-0 flex-1">
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
            :draggable="viewport === null && !editing"
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

        <!-- Bottom command pill (#907) — the board's primary controls, iOS-toolbar style. Free mode
             only; hidden while the edit shell is up. "Responsive" takes the pill over with device chips. -->
        <div
          v-if="mode === 'free' && !editing"
          class="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <Transition name="pill-swap" mode="out-in">
            <!-- main set -->
            <div
              v-if="pillMode === 'main'"
              key="main"
              class="pointer-events-auto flex items-center gap-1 rounded-full border border-default/60 bg-elevated/85 p-1.5 shadow-xl backdrop-blur-xl"
            >
              <UButton
                icon="i-lucide-scan"
                label="Fit"
                size="sm"
                color="neutral"
                variant="ghost"
                title="Zoom to fit all blocks"
                @click="fitBoard"
              />
              <UButton
                icon="i-lucide-ruler"
                label="Responsive"
                size="sm"
                :color="viewport !== null ? 'primary' : 'neutral'"
                :variant="viewport !== null ? 'soft' : 'ghost'"
                @click="openResponsive"
              />
              <UButton
                icon="i-lucide-layout-grid"
                label="Blocks"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="paletteOpen = true"
              />
              <UButton
                :icon="hasAI ? 'i-lucide-sparkles' : 'i-lucide-wand-2'"
                label="Magic"
                size="sm"
                color="primary"
                variant="solid"
                :disabled="!blockCount"
                @click="magic"
              />
              <UButton
                v-if="proposals.length"
                icon="i-lucide-panel-top-open"
                size="sm"
                color="neutral"
                variant="ghost"
                aria-label="Show layout result"
                @click="resultOpen = true"
              />
            </div>
            <!-- "Responsive" took over → device chips -->
            <div
              v-else
              key="responsive"
              class="pointer-events-auto flex items-center gap-1 rounded-full border border-primary/40 bg-elevated/90 p-1.5 shadow-xl backdrop-blur-xl"
            >
              <UButton icon="i-lucide-chevron-left" size="sm" color="neutral" variant="ghost" aria-label="Back" @click="closeResponsive" />
              <span class="ml-1 mr-0.5 text-[11px] uppercase tracking-widest text-muted">Preview</span>
              <UButton
                v-for="v in SPIKE_VIEWPORTS"
                :key="v.label"
                :icon="v.icon"
                :label="v.label"
                size="sm"
                :title="`${v.label} · ${v.width}px`"
                :color="viewport?.label === v.label ? 'primary' : 'neutral'"
                :variant="viewport?.label === v.label ? 'soft' : 'ghost'"
                @click="viewport = v"
              />
            </div>
          </Transition>
        </div>

        <!-- Snap hints (when there's something to arrange) -->
        <p
          v-if="mode === 'free' && viewport && nodes.length"
          class="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full border border-primary/40 bg-elevated/90 px-3 py-1 text-[11px] text-primary backdrop-blur"
        >
          Surveying at {{ viewport.label }} · {{ viewport.width }}px — read-only · hit ⛶ to fit · pick <strong>Fit</strong> to edit
        </p>
        <p
          v-else-if="mode === 'free' && nodes.length >= 2"
          class="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full border border-default bg-elevated/90 px-3 py-1 text-[11px] text-muted backdrop-blur"
        >
          Drag a block next to another → they snap together · then ✨ Magic or compile · double-click to edit
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

    <!-- Site level (#940) — the page flow. Cards = pages (lines = parentId); double-click /
         ⤡ a card → enterPage() loads that page's layout into the spike board above. -->
    <div v-else class="min-h-0 flex-1">
      <ClientOnly>
        <CroutonFlowSiteFlow
          :pages="pageRows"
          collection="pagesPages"
          label-field="label"
          parent-field="parentId"
          @zoom-into-page="(row: Record<string, unknown>) => enterPage(String(row.id))"
        />
      </ClientOnly>
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

    <!-- Focus EDIT (#907 v2) — the layout ZOOMS UP in place via SpikeFocusShell: a shared-element
         transition from the node's rect to centre (no Vue Flow camera), the board falls away behind a
         blurred scrim, and a minimal control shell hugs the layout (key-points pop · device + width
         pill · collapse motion / variants behind "⋯"). Persists via the same `zoomTree` v-model. -->
    <SpikeFocusShell
      v-if="editing"
      v-model="zoomTree"
      :label="zoomLabel"
      :origin-rect="originRect"
      @close="closeEdit"
    />
  </div>
</template>

<style scoped>
/* the command pill swaps between its main set and the "Responsive" device set */
.pill-swap-enter-active,
.pill-swap-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.pill-swap-enter-from { opacity: 0; transform: translateY(6px) scale(0.97); }
.pill-swap-leave-to { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
