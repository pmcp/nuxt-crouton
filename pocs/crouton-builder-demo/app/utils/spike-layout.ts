/**
 * Spike layout sizing (#907) — how big a Vue Flow block-node should be on the canvas.
 * A node renders a `LayoutNode` (a single block, or a snapped split of blocks); its
 * footprint is how many block-cells it spans on each axis, so a 2-high stack is twice
 * as tall and a snapped neighbour can match it. Auto-imported (app/utils).
 */
import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

export const SPIKE_BASE_W = 256
export const SPIKE_BASE_H = 184

/** Which edge of a target a dragged block will snap to (mirrors layout-snap's edge). */
export type SnapEdge = 'left' | 'right' | 'top' | 'bottom'

/**
 * Live snap preview (#907) — set continuously WHILE a block is dragged (via CroutonFlow's
 * new `@node-drag`). It names the TARGET node (by object identity of its `data.node`) and
 * the edge the dragged block will click onto, so that target's card can light up that edge
 * — "the side that's gonna snap lines up" before you let go. Provided by the page, injected
 * by SpikeBlockNode. `shallowRef` because the value is a small immutable record swapped each frame.
 */
// `armed` (#941 dwell): false = "snap point here" (soft/blue, just approached); true = held long
// enough that releasing now WILL snap (green). Two-stage so a snap takes intent, not a brush-past.
//
// A preview is EITHER an `edge` snap (merge the dragged node onto a side of the target) OR an
// `insert` (drop the dragged node BETWEEN the panes of a combined target, Phase A). `insert.frac`
// is the seam position as a 0..1 fraction along the split axis; the target draws a guide line there.
// An insert targets a split addressed by `path` (the child-index route from the target node's root —
// `[]` is the root split, `[1,0]` a split nested two levels deep), at seam `index` within it. The
// `pos`/`cross0`/`cross1` are the seam's geometry as fractions of the WHOLE target card, so the soft
// guide bar can draw at the right place AND only across the nested split's sub-region. (#950)
export interface SpikeSnapInsert {
  axis: 'horizontal' | 'vertical'
  path: number[]
  index: number
  pos: number
  cross0: number
  cross1: number
}

/** Resolve the split at `path` within `root` (or null). Walks split children by index. */
export function splitAtPath(root: LayoutNode, path: number[]): LayoutNode | null {
  let node: LayoutNode | null = root
  for (const i of path) {
    if (!node || node.type !== 'split' || !node.children[i]) return null
    node = node.children[i]!
  }
  return node
}

/** Immutably splice `child` into the split at `path`, index `index`, redistributing that split's
 *  children to even sizes. Rebuilds only the touched spine. (Used for the ghost preview AND the
 *  real drop, so nested inserts land exactly where the seam guide pointed.) */
export function insertAtPath(root: LayoutNode, path: number[], index: number, child: LayoutNode): LayoutNode {
  if (root.type !== 'split') return root
  if (path.length === 0) {
    const children = [...root.children]
    children.splice(Math.min(index, children.length), 0, child)
    const size = Math.round((100 / children.length) * 10) / 10
    return { ...root, children: children.map(c => ({ ...c, defaultSize: size })) }
  }
  const [head, ...rest] = path
  const target = root.children[head!]
  if (!target) return root
  const children = root.children.slice()
  children[head!] = insertAtPath(target, rest, index, child)
  return { ...root, children }
}
// `dragLabel` (#946 ghost) — a human label for the node being dragged, so the armed insert target
// can render a "this is where it lands" ghost slab at the seam carrying the incoming item's name.
// `dragNode` (#947) — the dragged node's actual subtree, so the target can build a ghost skeleton
// with the SAME footprint (a 2-row stack → a 2-row ghost), making the opened slot match its size.
export interface SpikeSnapPreview { node: LayoutNode, armed?: boolean, edge?: SnapEdge, insert?: SpikeSnapInsert, dragLabel?: string, dragNode?: LayoutNode }
export const SPIKE_SNAP_KEY = Symbol('spike-snap') as InjectionKey<ShallowRef<SpikeSnapPreview | null>>

/**
 * Pull-the-pane-to-detach (#907) — the inverse of snap-merge, ON the flow canvas. A merged node
 * renders its panes; arming it (hover/select) makes each top-level pane a grabbable face — grab one
 * and pull it past a threshold to pop it back into its own flow node. The page owns `nodes`, but a
 * default node component can't emit up through CroutonFlow, so the page PROVIDES this callback and
 * SpikeBlockNode calls it — identifying its group by object identity of `data.node` (Vue Flow
 * doesn't forward the node id). `dropOffset` is the pulled pane's top-left at release as a FLOW-space
 * offset from the group's top-left (the node computes it from its on-screen size vs its flow
 * footprint, no Vue Flow store needed); the page adds it to the group's known flow position so the
 * freed node lands exactly where you dropped it. `dir` (screen-px release delta) is a fallback for
 * placing it on the pulled side when no `dropOffset` is available. (Detach is a BOARD gesture;
 * double-click a node to open the separate full-screen edit view.)
 */
export interface SpikeDetachPayload { index: number, dir: { x: number, y: number }, dropOffset?: { x: number, y: number } }
export const SPIKE_DETACH_KEY = Symbol('spike-detach') as InjectionKey<(group: LayoutNode, payload: SpikeDetachPayload) => void>

/**
 * Reorder-within-layout (#952) — the sibling of detach. While pulling a pane, if the finger stays
 * INSIDE the card but over a DIFFERENT slot, releasing MOVES that child to the new index (instead of
 * popping it out). Same gesture as detach, different destination: drag across to reorder, drag OUT to
 * detach. The page owns `nodes`, so it provides this; SpikeBlockNode calls it (group by object identity).
 */
export interface SpikeReorderPayload { from: number, to: number }
export const SPIKE_REORDER_KEY = Symbol('spike-reorder') as InjectionKey<(group: LayoutNode, payload: SpikeReorderPayload) => void>

/**
 * Page promotion (#942) — the board is a sandbox of layout candidates + loose draft blocks;
 * exactly ONE node is "the page" (the live layout a user sees, ★-badged). `SET_PAGE` promotes a
 * node to be the page; `DUPLICATE` clones a node as a free draft so you can rearrange a copy and
 * then promote it. Both identify the node by object identity of its `data.node` (Vue Flow doesn't
 * forward the node id), exactly like the detach callback. Provided by the page, injected by SpikeBlockNode.
 */
export const SPIKE_SET_PAGE_KEY = Symbol('spike-set-page') as InjectionKey<(node: LayoutNode) => void>
export const SPIKE_DUPLICATE_KEY = Symbol('spike-duplicate') as InjectionKey<(node: LayoutNode) => void>

/**
 * Page regions (#953, the "expressiveness boundary" — bounded vocabulary, not free floats). A node can
 * be PINNED to the top or bottom edge of the page so it renders as a sticky pill/bar while the rest of
 * the layout flows/scrolls in the middle — the review-flow + pill-top + pill-bottom shape. A bounded
 * ENUM an agent could equally pick (`top` | `bottom` | undefined = main), kept on the FlowNode data.
 * The page Preview overlay assembles the regions. Provided by the page, injected by SpikeBlockNode
 * (node identified by object identity of its `data.node`, like the other node callbacks). `null` clears.
 */
export type SpikeRegion = 'top' | 'bottom'
export const SPIKE_SET_REGION_KEY = Symbol('spike-set-region') as InjectionKey<(node: LayoutNode, region: SpikeRegion | null) => void>

/**
 * Per-node resize (#954 — replacing the global survey slider). A node carries its own display
 * `width`/`height`; dragging its corner handle sets them, and the node renders its layout RESPONSIVELY
 * at that width (panes reflow / breakpoints resolve) — so each card is its OWN width preview. The handle
 * IS the per-element slider. Width is the meaningful axis (drives responsiveness); height just frames.
 * `null` width clears back to the intrinsic footprint size. Provided by the page, injected by
 * SpikeBlockNode (node by object identity, like the other node callbacks).
 */
export interface SpikeNodeSize { width: number | null, height?: number | null }
export const SPIKE_SET_SIZE_KEY = Symbol('spike-set-size') as InjectionKey<(node: LayoutNode, size: SpikeNodeSize) => void>

/** Delete a node (a block or a whole composed layout) from the canvas (#955). Provided by the page,
 *  injected by SpikeBlockNode (node by object identity). Undoable. */
export const SPIKE_DELETE_KEY = Symbol('spike-delete') as InjectionKey<(node: LayoutNode) => void>

/**
 * Drop-ghost label (#946 ease-apart) — when an internal insert ARMS, the target splices a ghost
 * pane into its layout so the real panes ease apart to open the slot (the renderer's #943 FLIP
 * animates them). The ghost pane block (`__dropghost__`) renders `SpikeGhostPane`, which injects
 * this to show the incoming item's name. Provided by SpikeBlockNode (the armed target).
 */
export const SPIKE_GHOST_LABEL_KEY = Symbol('spike-ghost-label') as InjectionKey<Ref<string>>

/**
 * Pinch-to-zoom passthrough (#948) — Vue Flow zooms on a two-finger pinch over the empty canvas,
 * but a pinch that STARTS on a node is swallowed by the node's drag, so you can't zoom while your
 * fingers are over a layout. SpikeBlockNode catches a 2-finger gesture (capture phase, before the
 * node drag) and calls this so the PAGE drives the canvas zoom instead — `ratio` is the incremental
 * finger-distance change, `(midX, midY)` the pinch midpoint in client px (kept under the fingers).
 */
export const SPIKE_PINCH_KEY = Symbol('spike-pinch') as InjectionKey<(ratio: number, midX: number, midY: number) => void>

// Focus editing (#907 redesign) lives in a DEDICATED full-screen edit VIEW, not an in-flow
// camera zoom — so there's no SPIKE_FOCUS/RESIZE injection here anymore. The overlay renders the
// node's layout through CroutonLayoutBreakpointAuthor (ruler + devices + width slider + collapse
// motion + variants, all in one) and persists via the page's `zoomTree` v-model; resize→keypoint
// is the author's own job. Keeping the camera out of editing is what fixes the framing bug.

/** How many block-cells wide × tall this node spans (1×1 for a leaf). */
export function footprint(node: LayoutNode): { cols: number, rows: number } {
  if (node.type === 'leaf') return { cols: 1, rows: 1 }
  if (node.type === 'nested') return footprint(node.layout.root)
  const fps = node.children.map(footprint)
  if (node.direction === 'horizontal') {
    return { cols: fps.reduce((s, f) => s + f.cols, 0), rows: Math.max(...fps.map(f => f.rows)) }
  }
  return { cols: Math.max(...fps.map(f => f.cols)), rows: fps.reduce((s, f) => s + f.rows, 0) }
}

/** Pixel size of a node on the canvas (footprint × the base block size). */
export function sizeOf(node: LayoutNode): { width: number, height: number } {
  const f = footprint(node)
  return { width: f.cols * SPIKE_BASE_W, height: f.rows * SPIKE_BASE_H }
}
