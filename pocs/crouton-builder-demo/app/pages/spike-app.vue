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
import { detachNode } from '@fyit/crouton-layout/app/utils/layout-edit'
import type { ComposePiece } from '@fyit/crouton-layout/app/composables/useCroutonComposeGestures'
import SpikeBlockNode from '~/components/SpikeBlockNode.vue'

useHead({ title: 'Spike · app on Vue Flow' })
const BUILD = 'focus-view-1 · #907 · unified edit view (no camera) — framing fixed'

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

// Live snap preview (#907): while a block is dragged, the target node it will snap to lights
// up the joining edge. Provided here; SpikeBlockNode injects it and matches by object identity.
const snapPreview = shallowRef<SpikeSnapPreview | null>(null)
provide(SPIKE_SNAP_KEY, snapPreview)

// Detach (#907 focus-view redesign) — folded INTO the edit view as a clean affordance (a pane
// menu), no longer pull-apart grips on the canvas. From inside the view you pop a top-level pane
// of the focused group back onto the board: split the group's `data.node`, shrink the host to the
// remainder (authored breakpoints reset — the structure they targeted changed), place the freed
// pane beside it, and return to the board so you can see it. See `detachPaneInView` below.
const DETACH_GAP = 40

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

// Focus EDIT VIEW (#907 redesign) — double-click a node to open a DEDICATED full-screen edit view
// (not a Vue Flow camera zoom). Because it's a plain overlay, the layout renders at a constant,
// cleanly-framed on-screen size for EVERY node — no fight with Vue Flow's own viewport fit (the old
// camera approach raced its re-measure and cut off some nodes, esp. the 2nd at mobile width). The
// view hosts CroutonLayoutBreakpointAuthor, which already unifies everything in one screen: the
// breakpoint ruler/key-points, the device buttons, the width slider, the per-checkpoint collapse
// motion, and per-block widget variants — with splitter drags → keypoint sizes. `zoomNodeId` ≠ null
// means the view is open.
const zoomNodeId = ref<string | null>(null)
const zoomNode = computed(() => zoomNodeId.value ? nodes.value.find(n => n.id === zoomNodeId.value) ?? null : null)
const zoomLabel = computed(() => zoomNode.value?.data.label ?? 'Layout')
const editing = computed(() => zoomNode.value !== null)

function onNodeDblClick(id: string) {
  if (mode.value !== 'free') return
  if (!nodes.value.some(nd => nd.id === id)) return
  viewport.value = null // editing one node; leave the board-wide survey
  zoomNodeId.value = id
}
function closeEdit() {
  zoomNodeId.value = null
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

// Detach FROM the edit view — the top-level panes of the focused group, each detachable to its own
// board node. `detachItems` feeds the view's "Detach" menu (only shown for a split/group node).
const editPanes = computed(() => {
  const n = zoomNode.value?.data.node
  if (!n || n.type !== 'split') return []
  return n.children.map((c, i) => ({ index: i, label: flattenLeaves(c)[0]?.label ?? `Pane ${i + 1}` }))
})
const detachItems = computed(() => [
  editPanes.value.map(p => ({ label: `Detach ${p.label}`, icon: 'i-lucide-grip', onSelect: () => detachPaneInView(p.index) })),
])
function detachPaneInView(paneIndex: number) {
  const id = zoomNodeId.value
  if (!id) return
  const idx = nodes.value.findIndex(n => n.id === id)
  if (idx === -1) return
  const host = nodes.value[idx]!
  const group = host.data.node
  const { root, detached } = detachNode(group, [paneIndex])
  if (!detached || !root) return
  const gSize = sizeOf(group) // group's extent BEFORE it shrinks
  const pos = { x: host.position.x + gSize.width + DETACH_GAP, y: host.position.y }
  const label = flattenLeaves(detached)[0]?.label
  const freed: FlowNode = { id: `detached-${++seq}`, type: 'default', position: { x: Math.round(pos.x), y: Math.round(pos.y) }, data: { node: detached, label } }
  // Shrink the host to the remainder (authored bp reset — its structure changed) + add the freed pane beside it.
  nodes.value = nodes.value.map((n, i) => i === idx ? { ...n, data: { ...n.data, node: root, bp: undefined } } : n).concat(freed)
  toast.add({ title: `Detached ${label ?? 'pane'}`, icon: 'i-lucide-grip', duration: 1400 })
  closeEdit() // back to the board so the freed pane is visible
}

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
            :rows="flowRows"
            collection="artists"
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

    <!-- Focus EDIT VIEW (#907 redesign) — a dedicated full-screen overlay, NOT a Vue Flow camera
         zoom. The layout renders at a constant, cleanly-framed on-screen size for every node (no
         viewport-fit race → the old off-screen/cut-off framing is gone). CroutonLayoutBreakpointAuthor
         IS the unified surface: breakpoint key-points + device buttons + width slider + collapse
         motion + per-block variants, with splitter drags → keypoint sizes. A subtle CSS zoom-in
         eases it in. The app-style header floats over the author's reserved top band. -->
    <Teleport to="body">
      <Transition name="focus-zoom">
        <section
          v-if="editing"
          class="fixed inset-0 z-50 flex flex-col bg-default text-default"
          role="dialog"
          aria-modal="true"
          :aria-label="`Edit ${zoomLabel}`"
        >
          <header class="flex shrink-0 items-center gap-2 border-b border-default bg-elevated/60 px-4 py-2.5 backdrop-blur">
            <UIcon name="i-lucide-layout-template" class="size-4 text-primary" />
            <span class="text-sm font-semibold">{{ zoomLabel }}</span>
            <UBadge color="neutral" variant="subtle" size="sm" class="hidden sm:inline-flex">Edit responsiveness</UBadge>
            <div class="ml-auto flex items-center gap-2">
              <UDropdownMenu v-if="editPanes.length" :items="detachItems">
                <UButton size="xs" icon="i-lucide-grip" color="neutral" variant="ghost" label="Detach pane" trailing-icon="i-lucide-chevron-down" />
              </UDropdownMenu>
              <UButton size="xs" icon="i-lucide-check" color="primary" label="Done" @click="closeEdit" />
            </div>
          </header>
          <div class="min-h-0 flex-1 overflow-auto">
            <!-- The author renders its own ruler/devices/slider/motion/variants; -mt-12 reclaims its
                 built-in pt-16 top band since this view supplies the header. -->
            <CroutonLayoutBreakpointAuthor v-model="zoomTree" class="-mt-12" />
          </div>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Subtle "zoom into the view" — a CSS scale+fade, NOT a Vue Flow camera fit (#907). */
.focus-zoom-enter-active,
.focus-zoom-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.focus-zoom-enter-from,
.focus-zoom-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
