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
import { createReusableTemplate, onKeyStroke } from '@vueuse/core'
import type { LayoutNode, LayoutTree, LayoutBreakpoint } from '@fyit/crouton-core/app/types/layout'
import { piecesToTree } from '@fyit/crouton-layout/app/utils/layout-compose-bridge'
import { closestSnap, type Rect, type SnapTarget } from '@fyit/crouton-layout/app/utils/layout-snap'
import { detachNode } from '@fyit/crouton-layout/app/utils/layout-edit'
import type { ComposePiece } from '@fyit/crouton-layout/app/composables/useCroutonComposeGestures'
import type { PageStatus, PageVisibility, PageLayout } from '~/utils/spike-page-meta'
import SpikeBlockNode from '~/components/SpikeBlockNode.vue'
import SpikePageCard from '~/components/SpikePageCard.vue'

useHead({ title: 'Spike · app on Vue Flow' })
// Iteration changelog / decision log (#940) — newest first, externalized to `spike-changelog.json`
// with a commit ref per entry (a chronological record of HOW we got here, complementing the curated
// HANDOFF.md). The floating chip shows the current number; tapping it opens the former changelogs.
// On every iteration: bump the stamp by prepending an entry to that JSON (commit filled on push).
import spikeChangelog from '~/spike-changelog.json'
const BUILD_HISTORY = spikeChangelog as { v: number, note: string, commit?: string }[]
const BUILD_VERSION = BUILD_HISTORY[0]!.v
const BUILD = `page-compose-${BUILD_VERSION} · ${BUILD_HISTORY[0]!.note}`
const versionOpen = ref(false)

const blockNode = markRaw(SpikeBlockNode)
const spikePageCard = markRaw(SpikePageCard)

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
interface FlowNode { id: string, type: string, position: { x: number, y: number }, data: { node: LayoutNode, label?: string, bp?: LayoutBreakpoint[], isPage?: boolean, justAdded?: boolean } }
const nodes = ref<FlowNode[]>([])
let seq = 0

// Undo (#940): snapshot the whole board before each mutation; Undo restores the last snapshot.
// `nodes` is the complete board state, so a deep-cloned snapshot is a full, safe restore point.
// (`JSONclone` is a hoisted function declaration, so it's callable here.) Cleared on entering a page.
const UNDO_LIMIT = 50
const undoStack = ref<FlowNode[][]>([])
const canUndo = computed(() => undoStack.value.length > 0)
function pushUndo() {
  undoStack.value.push(JSONclone(nodes.value))
  if (undoStack.value.length > UNDO_LIMIT) undoStack.value.shift()
}
function undo() {
  const prev = undoStack.value.pop()
  if (!prev) return
  resetSnap()
  closeEdit()
  nodes.value = prev
}
// ⌘/Ctrl-Z undoes, on the board only (let inputs/textareas keep their native undo).
onKeyStroke('z', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return
  if (!selectedPageId.value || viewport.value) return
  const t = e.target as HTMLElement | null
  if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return
  e.preventDefault()
  undo()
})

// Camera: re-frame the whole board to an overview after adding a block. CroutonFlow only
// fits-to-view on mount (when the board is empty), so without this a freshly-added block sits at
// the default zoom — which on a narrow phone fills the screen. fitView with maxZoom:1 keeps a
// single block at a comfortable size and shows everything you've added. Survey/focus own the
// camera, so skip then.
const flowRef = ref<{
  fitView?: (o?: Record<string, unknown>) => void
  fitBounds?: (b: { x: number, y: number, width: number, height: number }, o?: Record<string, unknown>) => void
  setCenter?: (x: number, y: number, o?: Record<string, unknown>) => void
} | null>(null)

// Pinch-to-zoom over a layout (#948): SpikeBlockNode catches a 2-finger gesture and calls this so the
// canvas zooms even when the fingers start on a node (Vue Flow's own pinch never fires there — the
// node's drag eats it). We read the live viewport transform and re-`setCenter` with the math that
// keeps the pinched point fixed under the fingers (Vue Flow exposes setCenter but not setViewport).
function pinchZoom(ratio: number, midX: number, midY: number) {
  if (viewport.value || zoomNodeId.value) return
  const container = document.querySelector('.crouton-vue-flow') as HTMLElement | null
  const vp = container?.querySelector('.vue-flow__viewport') as HTMLElement | null
  if (!container || !vp || !flowRef.value?.setCenter) return
  const m = new DOMMatrix(getComputedStyle(vp).transform)
  const z = m.a
  if (!z || !isFinite(ratio) || ratio <= 0) return
  const rect = container.getBoundingClientRect()
  const px = midX - rect.left, py = midY - rect.top // pinch midpoint, container-relative
  const pfx = (px - m.e) / z, pfy = (py - m.f) / z   // flow point currently under the fingers
  const nz = Math.min(4, Math.max(0.1, z * ratio))
  // Centre to pass so that flow point (pfx,pfy) lands back at the fingers (px,py) at the new zoom.
  const cx = pfx + (rect.width / 2 - px) / nz
  const cy = pfy + (rect.height / 2 - py) / nz
  flowRef.value.setCenter(cx, cy, { zoom: nz, duration: 0 })
}
provide(SPIKE_PINCH_KEY, pinchZoom)
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
  pushUndo()

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

// Reorder a pane WITHIN its layout (#952): move child `from` → `to` in the split's children, keeping
// each child's size. The FLIP reflow animates the rearrange. Identifies the group by object identity.
function onReorder(group: LayoutNode, payload: SpikeReorderPayload) {
  if (group.type !== 'split') return
  const { from, to } = payload
  if (from === to || from < 0 || to < 0 || from >= group.children.length || to >= group.children.length) return
  const idx = nodes.value.findIndex(n => n.data.node === group)
  if (idx === -1) return
  pushUndo()
  const children = [...group.children]
  const [moved] = children.splice(from, 1)
  children.splice(to, 0, moved!)
  const next: LayoutNode = { ...group, children }
  nodes.value = nodes.value.map((n, i) => i === idx ? { ...n, data: { ...n.data, node: next } } : n)
}
provide(SPIKE_REORDER_KEY, onReorder)

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

// Always-on responsive slider (#951): the bottom slider is ALWAYS in view (no "Responsive" mode
// button). It's a GLOBAL width scrubber — every layout responds to it at once (survey). At its MAX
// the board is EDIT mode (`viewport = null`: topology, drag/snap/detach); scrub left and it previews
// at that width (read-only). So "max = edit, scrub = preview" — one control, no mode toggle. The
// per-layout breakpoint authoring (keypoints) lives in the focus edit view you open by tapping a layout.
const SURVEY_MIN = 320
const SURVEY_MAX = 1440
/** Drive the global survey width. At/over MAX → edit (no survey). Else preview at that width,
 *  snapping the label to a device preset when it matches one. */
function setSurveyWidth(w: number | undefined) {
  const width = Math.round(w ?? SURVEY_MAX)
  if (width >= SURVEY_MAX) { viewport.value = null; return } // max = back to edit (topology)
  const preset = SPIKE_VIEWPORTS.find(v => v.width === width)
  viewport.value = preset
    ? { ...preset }
    : { label: 'Custom', icon: 'i-lucide-ruler', width, height: viewport.value?.height ?? 800 }
}
// Top-level Fit = zoom the camera to show every node. Doesn't touch the survey width (the slider owns
// that now) — just frames the board.
function fitBoard() {
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

/** A clear spot to the RIGHT of every existing node (never under one), so a freshly added block
 *  lands in the open, not hidden behind a wide layout. Uses real footprints, not a fixed stride. */
function clearSpot(): { x: number, y: number } {
  if (!nodes.value.length) return { x: 60, y: 140 }
  let maxRight = -Infinity, topY = Infinity
  for (const n of nodes.value) {
    const s = sizeOf(n.data.node)
    maxRight = Math.max(maxRight, n.position.x + s.width)
    topY = Math.min(topY, n.position.y)
  }
  return { x: Math.round(maxRight + 100), y: Math.round(topY) }
}

let justAddedTimer: number | null = null
/** CroutonFlow emits this on drop with the flow-space position — add a fresh leaf node. */
function onNodeDrop(item: Record<string, unknown>, position: { x: number, y: number }) {
  pushUndo()
  const label = String(item.label ?? item.blockId)
  const leaf: LayoutNode = { type: 'leaf', blockId: String(item.blockId), config: { collection: 'artists', heading: label } }
  const added: FlowNode = { id: String(item.id), type: 'default', position, data: { node: leaf, label, justAdded: true } }
  // Clear any prior "just added" highlight so only the newest block glows; fade this one after a beat.
  nodes.value = [...nodes.value.map(n => (n.data.justAdded ? { ...n, data: { ...n.data, justAdded: false } } : n)), added]
  if (justAddedTimer != null) window.clearTimeout(justAddedTimer)
  justAddedTimer = window.setTimeout(() => {
    nodes.value = nodes.value.map(n => (n.id === added.id ? { ...n, data: { ...n.data, justAdded: false } } : n))
  }, 2600)
  // Center on the new block at a moderate zoom (frame it with breathing room — not too deep), so it's
  // always visible after adding rather than hidden behind / off-screen of the existing layouts.
  const s = sizeOf(leaf)
  const margin = Math.max(s.width, s.height) * 0.9
  nextTick(() => flowRef.value?.fitBounds?.(
    { x: position.x - margin, y: position.y - margin, width: s.width + margin * 2, height: s.height + margin * 2 },
    { duration: 350, padding: 0.1 },
  ))
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
  | { kind: 'insert', target: FlowNode, insert: SpikeSnapInsert }
  | { kind: 'edge', target: FlowNode, edge: SnapEdge }
type FlowRect = { x: number, y: number, w: number, h: number }
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
// Recurse to the DEEPEST split under (cx,cy): walk each split's child sub-rects so a drop can land
// inside a NESTED layout (a split within a pane), not just the top-level split. Returns that split,
// its flow-space sub-rect, and the child-index path to it.
// A candidate insert seam, in flow-space: `main` = the seam line's position on its split's MAIN axis;
// [c0,c1] = its CROSS-axis span. Carries the split's `path` + the seam `index` within it.
interface SeamCand { path: number[], index: number, axis: 'horizontal' | 'vertical', main: number, c0: number, c1: number }
// Collect EVERY insertable seam across ALL splits in the tree (parent AND nested), so the nearest one
// to the cursor wins — near a top-level gap → the parent; deep inside a child near its seam → the
// child. (Deepest-split-always-wins made the parent unreachable; #950 follow-up.)
function collectSeams(node: LayoutNode, rect: FlowRect, path: number[], out: SeamCand[]) {
  if (node.type !== 'split') return
  const horizontal = node.direction === 'horizontal'
  const sizes = node.children.map(c => c.defaultSize ?? (100 / node.children.length))
  const total = sizes.reduce((a, b) => a + b, 0) || node.children.length
  const bounds = [0]
  let acc = 0
  for (const s of sizes) { acc += s / total; bounds.push(acc) } // [0, f1, …, 1] — children+1 seams
  bounds.forEach((b, index) => out.push(horizontal
    ? { path, index, axis: 'horizontal', main: rect.x + b * rect.w, c0: rect.y, c1: rect.y + rect.h }
    : { path, index, axis: 'vertical', main: rect.y + b * rect.h, c0: rect.x, c1: rect.x + rect.w }))
  acc = 0
  for (let i = 0; i < node.children.length; i++) {
    const frac0 = acc / total, len = sizes[i]! / total
    acc += sizes[i]!
    const cr: FlowRect = horizontal
      ? { x: rect.x + frac0 * rect.w, y: rect.y, w: len * rect.w, h: rect.h }
      : { x: rect.x, y: rect.y + frac0 * rect.h, w: rect.w, h: len * rect.h }
    collectSeams(node.children[i]!, cr, [...path, i], out)
  }
}
function snapIntent(movedNode: LayoutNode, pos: { x: number, y: number }, others: FlowNode[]): SnapIntent | null {
  const md = sizeOf(movedNode)
  const cx = pos.x + md.width / 2
  const cy = pos.y + md.height / 2
  // 1) INSERT: the drag OVERLAPS a split target → drop between its panes. Overlap (≥35% of the dragged
  // area), not strict centre-inside. Then pick the NEAREST seam across every split (parent + nested):
  // near a top-level gap targets the parent, near a child's seam targets the child — so both are reachable.
  const dl = pos.x, dr = pos.x + md.width, dt = pos.y, db = pos.y + md.height
  for (const o of others) {
    const node = o.data.node
    if (node.type !== 'split') continue
    const ts = sizeOf(node)
    const tx = o.position.x, ty = o.position.y
    const ox = Math.max(0, Math.min(dr, tx + ts.width) - Math.max(dl, tx))
    const oy = Math.max(0, Math.min(db, ty + ts.height) - Math.max(dt, ty))
    if ((ox * oy) / (md.width * md.height) < 0.35) continue // not enough over the split → try edge-snap
    const ccx = clamp(cx, tx, tx + ts.width), ccy = clamp(cy, ty, ty + ts.height)
    const seams: SeamCand[] = []
    collectSeams(node, { x: tx, y: ty, w: ts.width, h: ts.height }, [], seams)
    let best: SeamCand | null = null, bestD = Infinity
    for (const s of seams) {
      const inCross = s.axis === 'horizontal' ? (ccy >= s.c0 && ccy <= s.c1) : (ccx >= s.c0 && ccx <= s.c1)
      if (!inCross) continue
      const d = s.axis === 'horizontal' ? Math.abs(ccx - s.main) : Math.abs(ccy - s.main)
      if (d < bestD) { bestD = d; best = s }
    }
    if (!best) continue
    const insert: SpikeSnapInsert = best.axis === 'horizontal'
      ? { axis: 'horizontal', path: best.path, index: best.index, pos: (best.main - tx) / ts.width, cross0: (best.c0 - ty) / ts.height, cross1: (best.c1 - ty) / ts.height }
      : { axis: 'vertical', path: best.path, index: best.index, pos: (best.main - ty) / ts.height, cross0: (best.c0 - tx) / ts.width, cross1: (best.c1 - tx) / ts.width }
    return { kind: 'insert', target: o, insert }
  }
  // 2) EDGE: original side-snap (merge onto a target's outer edge).
  const s = snapAt(movedNode, pos, others)
  return s ? { kind: 'edge', target: s.target, edge: s.edge } : null
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
  // Dwell key is COARSE for inserts — keyed on the target only, NOT the seam index — so small
  // movements that flip the nearest seam don't reset the arm timer; the seam keeps following the
  // finger live (base carries the current index/frac) and the green arms reliably after the hold.
  const key = intent.kind === 'insert' ? `ins-${intent.target.id}` : `edge-${intent.target.id}-${intent.edge}`
  const dragLabel = moved.data.label ?? labelFor(moved.data.node)
  const base: SpikeSnapPreview = intent.kind === 'insert'
    ? { node: intent.target.data.node, insert: intent.insert, dragLabel, dragNode: moved.data.node }
    : { node: intent.target.data.node, edge: intent.edge, dragLabel }
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
  pushUndo() // a real move (reposition / merge / insert) is about to apply — snapshot first
  // Released while only SOFT (not held long enough) → just place it; snapping requires the dwell.
  if (!armed) { nodes.value = rows; return }

  // The target FlowNode is the one whose layout node is the armed candidate (node identity is stable
  // across a drag — only positions change — so this matches what the green guide pointed at).
  const target = rows.find(r => r.id !== moved.id && r.data.node === armed.node)
  if (!target) { nodes.value = rows; return }
  const md = sizeOf(moved.data.node)
  // Page (favorited) ALWAYS consumes (#942): if either side is the page, the result stays the page.
  const keepPage = (target.data.isPage || moved.data.isPage) ? { isPage: true } : {}

  // INSERT between the panes — at the targeted split, which may be NESTED (armed.insert.path). (#950)
  if (armed.insert && target.data.node.type === 'split') {
    const newNode = insertAtPath(target.data.node, armed.insert.path, armed.insert.index, moved.data.node)
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
    clearSpot(), // open spot to the right of everything — never hidden under an existing layout
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
  if (nodes.value.length) pushUndo()
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
// Mirror @fyit/crouton-pages' real page model (#940): the builder is just another VIEW of the pages
// collection, so the header reflects the package's actual fields/enums/icons (see
// packages/crouton-pages/schemas/pages.json + app/components/Editor/Toolbar.vue). Demo values here;
// the real builder reads the page row — and at graduation should REUSE the package's toolbar/settings
// rather than mirror them. Class strings are literal (not `bg-${x}`) so Tailwind's JIT keeps them.
// Page-model enums + display meta (status / visibility / layout) live in app/utils/spike-page-meta
// (auto-imported) so the board page-shell here AND the Site-flow page card read ONE source of truth.
interface BuilderPage {
  id: string, label: string, icon?: string, path?: string
  status?: PageStatus, visibility?: PageVisibility, layout?: PageLayout, showInNavigation?: boolean
  tree: LayoutTree
}
const pageSplit = (a: string, b: string, dir: 'horizontal' | 'vertical' = 'horizontal'): LayoutTree['root'] => ({
  type: 'split', direction: dir,
  children: [{ type: 'leaf', blockId: a, defaultSize: 50 }, { type: 'leaf', blockId: b, defaultSize: 50 }],
})
const PAGES: BuilderPage[] = [
  {
    id: 'dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard',
    path: '/dashboard', status: 'published', visibility: 'members', layout: 'default', showInNavigation: true,
    tree: { renderer: 'panes', root: { type: 'split', direction: 'horizontal', children: [
      { type: 'leaf', blockId: 'artists-list', defaultSize: 34 },
      { type: 'leaf', blockId: 'artists-stats', defaultSize: 33 },
      { type: 'leaf', blockId: 'artists-form', defaultSize: 33 },
    ] } },
  },
  { id: 'reports', label: 'Reports', icon: 'i-lucide-bar-chart-3', path: '/reports', status: 'draft', visibility: 'admin', layout: 'full-height', showInNavigation: true, tree: { renderer: 'panes', root: pageSplit('artists-stats', 'artists-list') } },
  { id: 'settings', label: 'Settings', icon: 'i-lucide-settings', path: '/settings', status: 'published', visibility: 'public', layout: 'default', showInNavigation: false, tree: { renderer: 'panes', root: { type: 'leaf', blockId: 'artists-form' } } },
]
// STATUS_META / VISIBILITY_META / LAYOUT_META are auto-imported from app/utils/spike-page-meta.
// The same pages as crouton-flow rows (Dashboard is root; others hang off it) — ENRICHED from PAGES
// so the Site-flow cards carry the settings (status · visibility · layout · nav · icon · path) they
// now display condensed. Parent wiring (parentId) is the sitemap hierarchy.
const PAGE_PARENTS: Record<string, string | null> = { dashboard: null, reports: 'dashboard', settings: 'dashboard' }
const pageRows = PAGES.map(p => ({
  id: p.id, label: p.label, parentId: PAGE_PARENTS[p.id] ?? null,
  icon: p.icon, path: p.path, status: p.status, visibility: p.visibility,
  layout: p.layout, showInNavigation: p.showInNavigation,
}))
const pageById = (id: unknown) => PAGES.find(p => p.id === String(id))

// Per-page board state — persist the FlowNode[] verbatim so positions, merges, and
// per-node breakpoints all survive a round-trip out to Site and back (no lossy recompile).
const pageBoards = new Map<string, FlowNode[]>()
const selectedPageId = ref<string | null>(null)
// Direction of the page⇄site cross-fade: 'in' grows the page in (opening), 'out' settles back to the
// flow (returning). Set before the swap so the right curve plays. (#940)
const zoomDir = ref<'in' | 'out'>('in')
const currentPageLabel = computed(() => (selectedPageId.value ? pageById(selectedPageId.value)?.label ?? 'Page' : ''))
// The page being edited → drives the page-shell header (icon · name · path · access · status). The
// header collapses to just icon+name+chips; expanding reveals the path + full access/status labels.
const currentPage = computed(() => (selectedPageId.value ? pageById(selectedPageId.value) ?? null : null))
const pageHeaderExpanded = ref(false)
// The header's pages-package controls (preview / open-public) are display-only in the POC — on
// graduation they wire to the real crouton-pages actions (this view is just another view of pages).
function mockPageAction(name: string) {
  useToast().add({ title: name, description: 'Mock — wires to the pages package on graduation', icon: 'i-lucide-info', duration: 1500 })
}

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
  pushUndo()
  nodes.value = nodes.value.map(n => ({ ...n, data: { ...n.data, isPage: n.data.node === node } }))
}
/** Duplicate a node as a free draft (deep-cloned) so you can rearrange the copy, then promote it. */
function duplicateNode(node: LayoutNode) {
  const src = nodes.value.find(n => n.data.node === node)
  if (!src) return
  pushUndo()
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
// Same contract the package's SiteFlow provides — our SpikePageCard injects this to "open the full
// page" (descend into the board). enterPage is a hoisted function declaration, available here.
provide('croutonSiteFlowZoom', (id: string) => enterPage(id))
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
  undoStack.value = [] // fresh board context — don't undo across page boundaries
  zoomDir.value = 'in'
  selectedPageId.value = id
  nodes.value = pageBoards.get(id) ?? treeToBoardNodes(page.tree)
  fitPage()
}
/** Page → Site: persist the board and go back to the page flow. */
function exitToPages() {
  stashCurrentBoard()
  zoomNodeId.value = null; originRect.value = null; viewport.value = null
  zoomDir.value = 'out'
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

    <!-- Old app-chrome header removed (#940): the page-shell header below IS the header now (back
         button folded in), and the Site view is full-bleed. The BUILD stamp floats as a tiny chip. -->

    <!-- Page ⇄ Site cross-fade (#940 redux): both views stacked absolutely so one fades IN while the
         other fades OUT (simultaneous — NOT mode=out-in, which flashed the dark bg between them and
         delayed the board's mount so the fit missed). A subtle directional scale reads as a gentle
         zoom in (open a page) / out (back to the flow). The board still mounts immediately, so fitPage works. -->
    <div class="relative flex min-h-0 flex-1 overflow-hidden">
    <Transition :name="zoomDir === 'in' ? 'viewzoom-in' : 'viewzoom-out'">
    <div v-if="selectedPageId" key="board" class="absolute inset-0 flex">
      <!-- Desktop drawer — the collection's blocks, draggable onto the canvas -->
      <aside class="hidden w-56 shrink-0 overflow-y-auto border-r border-default bg-elevated/40 p-3 md:block">
        <p class="mb-2 text-xs uppercase tracking-widest text-muted">Artists · blocks</p>
        <ReusePalette />
      </aside>

      <!-- The canvas — Free (Vue Flow) or Snap (magnetic compose canvas) -->
      <!-- Page shell (#940): entering a page frames the flow INSIDE a padded container whose header
           carries the page identity — icon + name, expandable to path / visibility / live-vs-draft
           (mirrors the pages package). The header slides in as the container forms (the transition). -->
      <div class="relative min-w-0 flex-1 p-2 sm:p-3">
       <div class="flex h-full flex-col overflow-hidden rounded-xl border border-default bg-elevated/40 shadow-sm">
        <!-- Mirrors CroutonPagesEditorToolbar — status (dot+label) · visibility (icon+label) · preview
             · open-public · settings gear. Display-only here; reuses the real toolbar on graduation. -->
        <header class="spike-page-header shrink-0 border-b border-default/70 bg-elevated/60 px-3 py-2 backdrop-blur">
          <div class="flex items-center gap-2.5">
            <UButton
              icon="i-lucide-arrow-left"
              size="xs"
              color="neutral"
              variant="ghost"
              aria-label="Back to pages"
              title="Back to pages"
              @click="exitToPages"
            />
            <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <UIcon :name="currentPage?.icon ?? 'i-lucide-file'" class="size-5" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold leading-tight">{{ currentPage?.label ?? 'Page' }}</p>
              <p v-if="currentPage?.path" class="hidden truncate font-mono text-[10px] leading-tight text-muted sm:block">{{ currentPage.path }}</p>
            </div>

            <div class="ml-auto flex items-center gap-0.5">
              <!-- status: colored dot + label -->
              <span v-if="currentPage?.status" class="flex items-center gap-1.5 px-1.5 text-[11px] font-medium" :class="STATUS_META[currentPage.status].text">
                <span class="size-2 rounded-full" :class="STATUS_META[currentPage.status].dot" />
                <span class="hidden sm:inline">{{ STATUS_META[currentPage.status].label }}</span>
              </span>
              <!-- visibility: icon + label -->
              <span v-if="currentPage?.visibility" class="flex items-center gap-1.5 px-1.5 text-[11px] text-muted">
                <UIcon :name="VISIBILITY_META[currentPage.visibility].icon" class="size-4" />
                <span class="hidden sm:inline">{{ VISIBILITY_META[currentPage.visibility].label }}</span>
              </span>
              <USeparator orientation="vertical" class="mx-1 hidden h-5 sm:block" />
              <UButton icon="i-lucide-eye" size="xs" color="neutral" variant="ghost" class="hidden sm:inline-flex" aria-label="Preview" @click="mockPageAction('Preview')" />
              <UButton icon="i-lucide-external-link" size="xs" color="neutral" variant="ghost" class="hidden sm:inline-flex" :disabled="currentPage?.status !== 'published'" aria-label="Open public page" @click="mockPageAction('Open public page')" />
              <UButton
                :icon="pageHeaderExpanded ? 'i-lucide-chevron-up' : 'i-lucide-settings'"
                size="xs"
                :color="pageHeaderExpanded ? 'primary' : 'neutral'"
                :variant="pageHeaderExpanded ? 'soft' : 'ghost'"
                aria-label="Page settings"
                @click="pageHeaderExpanded = !pageHeaderExpanded"
              />
            </div>
          </div>
          <!-- Settings detail (mirrors SettingsPanel fields, read-only mock): path · visibility · layout · nav -->
          <div
            v-if="pageHeaderExpanded"
            class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-default/60 pt-2 text-[11px] text-muted sm:grid-cols-4"
          >
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-link" class="size-3.5 shrink-0" /><span class="truncate font-mono">{{ currentPage?.path ?? '—' }}</span>
            </div>
            <div v-if="currentPage?.visibility" class="flex items-center gap-1.5">
              <UIcon :name="VISIBILITY_META[currentPage.visibility].icon" class="size-3.5 shrink-0" />{{ VISIBILITY_META[currentPage.visibility].label }}
            </div>
            <div v-if="currentPage?.layout" class="flex items-center gap-1.5">
              <UIcon :name="LAYOUT_META[currentPage.layout].icon" class="size-3.5 shrink-0" />{{ LAYOUT_META[currentPage.layout].label }}
            </div>
            <div class="flex items-center gap-1.5">
              <UIcon :name="currentPage?.showInNavigation ? 'i-lucide-eye' : 'i-lucide-eye-off'" class="size-3.5 shrink-0" />{{ currentPage?.showInNavigation ? 'In navigation' : 'Hidden from nav' }}
            </div>
          </div>
        </header>
        <!-- The flow itself lives inside the container -->
        <div class="relative min-h-0 flex-1">
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

        <!-- Top actions pill (#951) — icon-only quick actions, floating top-centre of the canvas. -->
        <div
          v-if="mode === 'free' && !editing"
          class="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-4"
        >
          <div class="pointer-events-auto flex items-center gap-1 rounded-full border border-default/60 bg-elevated/85 p-1.5 shadow-xl backdrop-blur-xl">
            <UButton icon="i-lucide-undo-2" size="sm" color="neutral" variant="ghost" :disabled="!canUndo" title="Undo (⌘Z)" aria-label="Undo" @click="undo" />
            <UButton icon="i-lucide-plus" size="sm" color="neutral" variant="ghost" title="Add blocks" aria-label="Add blocks" @click="paletteOpen = true" />
            <UButton :icon="hasAI ? 'i-lucide-sparkles' : 'i-lucide-wand-2'" size="sm" color="primary" variant="solid" :disabled="!blockCount" title="Magic arrange" aria-label="Magic" @click="magic" />
            <UButton v-if="proposals.length" icon="i-lucide-panel-top-open" size="sm" color="neutral" variant="ghost" aria-label="Show layout result" @click="resultOpen = true" />
          </div>
        </div>

        <!-- Always-on responsive slider (#951) — Fit (left of the slider) + the GLOBAL width slider +
             a width/Edit readout. Scrub to preview every layout at a width; at MAX it's edit mode. -->
        <div
          v-if="mode === 'free' && !editing"
          class="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div class="pointer-events-auto flex w-[min(94vw,560px)] items-center gap-2 rounded-2xl border border-default/60 bg-elevated/85 py-2 pl-1.5 pr-3 shadow-xl backdrop-blur-xl">
            <UButton icon="i-lucide-scan" size="sm" color="neutral" variant="ghost" title="Zoom to fit" aria-label="Fit" @click="fitBoard" />
            <USlider
              class="flex-1"
              :min="SURVEY_MIN"
              :max="SURVEY_MAX"
              :step="2"
              :model-value="viewport?.width ?? SURVEY_MAX"
              @update:model-value="setSurveyWidth"
            />
            <span
              class="w-12 shrink-0 text-right font-mono text-[11px]"
              :class="viewport ? 'text-primary' : 'text-muted'"
            >{{ viewport ? Math.round(viewport.width) + 'px' : 'Edit' }}</span>
          </div>
        </div>

        <!-- Snap hints (when there's something to arrange) -->
        <p
          v-if="mode === 'free' && viewport && nodes.length"
          class="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full border border-primary/40 bg-elevated/90 px-3 py-1 text-[11px] text-primary backdrop-blur"
        >
          Surveying at {{ viewport.label }} · {{ viewport.width }}px — read-only · hit ⛶ to fit · pick <strong>Fit</strong> to edit
        </p>
        <p
          v-else-if="mode === 'free' && nodes.length >= 2"
          class="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full border border-default bg-elevated/90 px-3 py-1 text-[11px] text-muted backdrop-blur"
        >
          Drag a block next to another → they snap together · then ✨ Magic or compile · double-click to edit
        </p>
        <p
          v-else-if="mode === 'snap' && pieces.length"
          class="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full border border-default bg-elevated/90 px-3 py-1 text-[11px] text-muted backdrop-blur"
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
      </div>
    </div>

    <!-- Site level (#940) — the page flow. Cards = pages (lines = parentId); double-click /
         ⤡ a card → enterPage() loads that page's layout into the spike board above. -->
    <div v-else key="site" class="absolute inset-0">
      <ClientOnly>
        <!-- Site flow built on CroutonFlow directly (not the CroutonFlowSiteFlow preset) so we can
             inject our richer POC page card (SpikePageCard) — the condensed page with its settings
             icons — via `defaultNodeComponent`. We provide the same `croutonSiteFlowZoom` contract
             the card injects, pointing it at enterPage. (#940) -->
        <CroutonFlow
          :rows="pageRows"
          collection="pagesPages"
          label-field="label"
          parent-field="parentId"
          :default-node-component="spikePageCard"
          background-pattern="dots"
          @node-dbl-click="(id: string) => enterPage(String(id))"
        />
      </ClientOnly>
    </div>
    </Transition>
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

    <!-- Version chip (#940): the old header is gone, so this tiny floating chip shows the current
         iteration NUMBER and — tapped — opens the full former-changelog history. On-page (not Nuxt
         DevTools, which is dev-only and can't show on the mobile staging preview deploys verify on). -->
    <UButton
      class="fixed bottom-1 left-1 z-50 font-mono text-[10px]"
      size="xs"
      color="neutral"
      variant="soft"
      :label="`v${BUILD_VERSION}`"
      icon="i-lucide-history"
      :title="BUILD"
      @click="versionOpen = true"
    />
    <UModal v-model:open="versionOpen" :ui="{ content: 'sm:max-w-md' }">
      <template #content="{ close }">
        <div class="flex max-h-[82dvh] flex-col">
          <div class="flex items-center justify-between border-b border-default px-4 py-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-history" class="size-4 text-muted" />
              <h3 class="text-sm font-semibold">Changelog</h3>
              <span class="rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">v{{ BUILD_VERSION }}</span>
            </div>
            <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" aria-label="Close" @click="close" />
          </div>
          <!-- Timeline: a hairline rail down the left, a dot per entry; current entry accented. -->
          <ol class="relative min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <li
              v-for="(entry, i) in BUILD_HISTORY"
              :key="entry.v"
              class="relative flex gap-3 pb-4 last:pb-0"
            >
              <!-- rail + dot -->
              <div class="relative flex w-10 shrink-0 justify-center">
                <span v-if="i < BUILD_HISTORY.length - 1" class="absolute left-1/2 top-4 h-full w-px -translate-x-1/2 bg-default" />
                <span
                  class="relative z-10 inline-flex h-5 items-center rounded-full px-1.5 font-mono text-[10px] font-semibold tabular-nums ring-2 ring-default"
                  :class="i === 0 ? 'bg-primary text-inverted ring-primary/30' : 'bg-elevated text-muted'"
                >{{ entry.v }}</span>
              </div>
              <div class="min-w-0 flex-1 pt-0.5">
                <p class="text-xs leading-snug text-default">{{ entry.note }}</p>
                <p v-if="entry.commit" class="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-dimmed">
                  <UIcon name="i-lucide-git-commit-horizontal" class="size-3" />{{ entry.commit }}
                </p>
                <span v-if="i === 0" class="ml-2 align-middle text-[10px] font-medium text-primary">· current</span>
              </div>
            </li>
          </ol>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Move Vue Flow's zoom controls (+/−/fit) from the default bottom-left to the TOP-RIGHT corner of
   the canvas (#940) — clear of the bottom command pill and the floating version chip. :deep reaches
   into CroutonFlow. Applies to both the board and the Site flow. */
:deep(.vue-flow__controls) {
  top: 0.5rem;
  right: 0.5rem;
  bottom: auto;
  left: auto;
}

/* Page ⇄ Site cross-fade (#940): both views absolute + overlapping, so enter and leave run at the
   SAME time (no bg flash). Subtle directional scale = a gentle zoom. Opacity is a touch faster than
   the transform so the outgoing view is mostly gone before its scale finishes (clean hand-off). */
.viewzoom-in-enter-active, .viewzoom-in-leave-active,
.viewzoom-out-enter-active, .viewzoom-out-leave-active {
  transition: opacity 0.26s ease, transform 0.34s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  will-change: opacity, transform;
}
.viewzoom-in-enter-from { opacity: 0; transform: scale(0.97); }   /* page grows in */
.viewzoom-in-leave-to { opacity: 0; transform: scale(1.03); }     /* site recedes forward */
.viewzoom-out-enter-from { opacity: 0; transform: scale(1.03); }  /* site settles back from larger */
.viewzoom-out-leave-to { opacity: 0; transform: scale(0.97); }    /* page shrinks away */
@media (prefers-reduced-motion: reduce) {
  .viewzoom-in-enter-active, .viewzoom-in-leave-active,
  .viewzoom-out-enter-active, .viewzoom-out-leave-active { transition: opacity 0.2s ease; transform: none; }
  .viewzoom-in-enter-from, .viewzoom-in-leave-to,
  .viewzoom-out-enter-from, .viewzoom-out-leave-to { transform: none; }
}

/* Page-shell header (#940): on entering a page the identity bar slides down into place as the
   container forms — the "name slides to the top" feel. Runs on mount (the board is re-created each
   entry), so it replays every time you open a page. */
@media (prefers-reduced-motion: no-preference) {
  @keyframes spike-header-in {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .spike-page-header { animation: spike-header-in 0.34s cubic-bezier(0.4, 0, 0.2, 1) both; }
}
</style>
