/**
 * Spike layout sizing (#907) — how big a Vue Flow block-node should be on the canvas.
 * A node renders a `LayoutNode` (a single block, or a snapped split of blocks); its
 * footprint is how many block-cells it spans on each axis, so a 2-high stack is twice
 * as tall and a snapped neighbour can match it. Auto-imported (app/utils).
 */
import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'
import { dropNode } from '@fyit/crouton-layout/app/utils/layout-edit'

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
// A preview is EITHER an `edge` snap (merge the dragged node onto a side of a NEARBY card) OR a
// `paneDrop` (drop OVER a layout → add beside the targeted pane, #972 — see SpikePaneDrop below).

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
/**
 * Pane-drop (#972) — dropping a block OVER a layout targets the rendered PANE under the cursor and
 * adds the dragged node as a sibling on the side you're nearest. Unlike `insert` (which only used
 * seams that already existed), this works on ANY pane edge — so you can add a block to the RIGHT of a
 * pane that sits in a vertical stack (no pre-existing right-seam), e.g. "right of the chart". It's a
 * bounded, agent-pickable edit: "insert node X beside pane at `path` on side `edge`". `path` is the
 * child-index route to the leaf within the target node's root (`[]` = the whole node is one pane);
 * `rect` is that pane's box as % of the target card, so the guide band draws on the right edge.
 */
export interface SpikePaneDrop { path: number[], edge: SnapEdge, rect: { left: number, top: number, width: number, height: number } }

/**
 * Apply a pane-drop to `root`: add `child` beside the pane at `paneDrop.path` on `paneDrop.edge`.
 * FLATTENS into the parent row when the side is ALONG the parent split's axis (drop right of a block
 * in a row → it joins the row), and WRAPS the pane in a new perpendicular split otherwise (drop right
 * of a pane in a vertical stack → `[pane | child]`). Used for BOTH the ghost preview and the real drop.
 */
export function applyPaneDrop(root: LayoutNode, paneDrop: { path: number[], edge: SnapEdge }, child: LayoutNode): LayoutNode {
  const { path, edge } = paneDrop
  const direction = edge === 'left' || edge === 'right' ? 'horizontal' : 'vertical'
  const before = edge === 'left' || edge === 'top'
  if (path.length > 0) {
    const parentPath = path.slice(0, -1)
    const leafIndex = path[path.length - 1]!
    const parent = splitAtPath(root, parentPath)
    if (parent && parent.type === 'split' && parent.direction === direction) {
      // Side runs ALONG the parent → flatten into the existing row/column.
      return insertAtPath(root, parentPath, leafIndex + (before ? 0 : 1), child)
    }
  }
  // Perpendicular (or a lone pane) → wrap the pane in a new split. `dropNode` handles a leaf root too.
  return dropNode(root, path, child, edge)
}

// `dragLabel` (#946 ghost) — a human label for the node being dragged, so the armed pane-drop target
// can render a "this is where it lands" ghost slab carrying the incoming item's name.
// `dragNode` (#947) — the dragged node's actual subtree, so the target can build a ghost skeleton
// with the SAME footprint (a 2-row stack → a 2-row ghost), making the opened slot match its size.
// `targetId` — the target FlowNode's id, so the on-release apply can re-find it by STABLE id (CroutonFlow
// re-emits rows on drag-end that don't preserve `data.node` by reference, so identity matching missed).
export interface SpikeSnapPreview { node: LayoutNode, targetId?: string, armed?: boolean, edge?: SnapEdge, paneDrop?: SpikePaneDrop, dragLabel?: string, dragNode?: LayoutNode }
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

/**
 * Block sizing descriptor (#971) — "the component decides its own size" as DECLARED DATA, not
 * per-instance CSS. Each block declares how it fills a pane per axis: `fill` stretches to the pane,
 * `hug` sizes to its own content. A Top bar / Bottom nav declare `height: 'hug'`, so they come out as
 * SHORT bars wherever they land (incl. pinned regions) with NO per-instance size control — the agent
 * picks the BLOCK, the block's descriptor does the rest. It lives on the `croutonLayoutBlocks` registry
 * entries (app.config), so one source feeds the renderer, the viability metric, and an agent alike.
 *
 * Honoured POC-side in the Preview (a `hug`-height block → an `height:auto` pane → short bar). Making a
 * pane hug its content INSIDE a split is the `crouton-layout` package renderer's job — graduation work;
 * the clean formalisation is exactly this descriptor moving onto the typed `CroutonLayoutBlockDefinition`.
 */
export type SpikeSizing = 'fill' | 'hug'
export interface SpikeBlockSizing { width: SpikeSizing, height: SpikeSizing }
export const SPIKE_DEFAULT_SIZING: SpikeBlockSizing = { width: 'fill', height: 'fill' }

/** A registry shape carrying the optional POC sizing descriptor (the app.config entries). The fields
 *  are read loosely (app.config literals widen to `string`) and validated to the enum here. */
type SizedRegistry = Record<string, { sizing?: { width?: string, height?: string }, minWidth?: number } | undefined>

/** Narrow an arbitrary value to a `SpikeSizing` (default `fill`) — robust to widened/tampered data. */
const asSizing = (v: unknown): SpikeSizing => (v === 'hug' ? 'hug' : 'fill')

/** The sizing a block declares (defaults to fully `fill`). Reads the descriptor off the registry. */
export function blockSizing(blockId: string, registry: SizedRegistry): SpikeBlockSizing {
  const s = registry[blockId]?.sizing
  return { width: asSizing(s?.width), height: asSizing(s?.height) }
}

/**
 * How a NODE wants to size on the page's vertical axis. Only a single leaf hugs by its block's
 * descriptor; a composed split/nested fills (a real layout claims its space). Drives the Preview's
 * per-region hug/fill so a pinned Top bar is short because the BLOCK says `hug`, not because it's pinned.
 */
export function nodeHeightSizing(node: LayoutNode, registry: SizedRegistry): SpikeSizing {
  return node.type === 'leaf' ? blockSizing(node.blockId, registry).height : 'fill'
}

/**
 * Composite sizing derivation (#972 follow-up) — "component-driven, all the way up". A LEAF declares
 * its rules (minWidth + fill/hug on the registry); a COMPOSITE (split / nested layout) DERIVES its own,
 * bottom-up, so a layout-of-layouts publishes the same contract its children do and a parent (or an
 * agent) can reason about it as one unit. The fold is direction-aware, with TWO width floors:
 *   • softMinWidth — the comfortable width that keeps a horizontal split a ROW: `sum` of children
 *     along a horizontal axis, `max` across a vertical one. Below it, the renderer stacks the row.
 *   • hardMinWidth — the absolute floor it can reflow DOWN to: a horizontal split can always stack to
 *     a column whose width floor is the widest child, so hard = `max` of children's hard floors
 *     (recursively, the widest single leaf in the subtree).
 * Height mirrors width with the axes swapped (`sum` vertical, `max` horizontal). `width`/`height`
 * fill/hug: a composite always `fill`s (a real layout claims its space); a leaf uses its descriptor.
 *
 * Prototyped POC-side; the clean home is the `crouton-layout` viability engine (it already folds leaf
 * min-widths for stacking) + the `nested` node carrying this as its declared contract (graduation).
 */
export interface SpikeDerivedSizing { hardMinWidth: number, softMinWidth: number, minHeight: number, width: SpikeSizing, height: SpikeSizing }
export function deriveSizing(node: LayoutNode, registry: SizedRegistry): SpikeDerivedSizing {
  if (node.type === 'leaf') {
    const mw = registry[node.blockId]?.minWidth ?? 0
    const s = blockSizing(node.blockId, registry)
    return { hardMinWidth: mw, softMinWidth: mw, minHeight: 0, width: s.width, height: s.height }
  }
  if (node.type === 'nested') return deriveSizing(node.layout.root, registry)
  const kids = node.children.map(c => deriveSizing(c, registry))
  const horizontal = node.direction === 'horizontal'
  // Hard floor: the subtree can always reflow to a single column → the widest single leaf.
  const hardMinWidth = Math.max(0, ...kids.map(k => k.hardMinWidth))
  // Soft floor: keep the arrangement as-is — sum along the axis, max across it.
  const softMinWidth = horizontal
    ? kids.reduce((sum, k) => sum + k.softMinWidth, 0)
    : Math.max(0, ...kids.map(k => k.softMinWidth))
  const minHeight = horizontal
    ? Math.max(0, ...kids.map(k => k.minHeight))
    : kids.reduce((sum, k) => sum + k.minHeight, 0)
  return { hardMinWidth, softMinWidth, minHeight, width: 'fill', height: 'fill' }
}

/**
 * Per-leaf config field read/write (#970 display variants) — a block's `variant` (rows/cards/table) is
 * a bounded enum SERIALISED on the leaf's `config`, so it persists with the layout and an agent can
 * read/set it. Read the first matching leaf's value; set it immutably on EVERY matching leaf (mirrors
 * how `setCollapseRecipe` addresses a block by id across the tree, vs by NodePath).
 */
export function leafConfigValue(node: LayoutNode, blockId: string, key: string): unknown {
  if (node.type === 'leaf') return node.blockId === blockId ? node.config?.[key] : undefined
  if (node.type === 'nested') return leafConfigValue(node.layout.root, blockId, key)
  for (const c of node.children) {
    const v = leafConfigValue(c, blockId, key)
    if (v !== undefined) return v
  }
  return undefined
}

export function setLeafConfigValue(node: LayoutNode, blockId: string, key: string, value: unknown): LayoutNode {
  if (node.type === 'leaf') {
    return node.blockId === blockId ? { ...node, config: { ...(node.config ?? {}), [key]: value } } : node
  }
  if (node.type === 'nested') return { ...node, layout: { ...node.layout, root: setLeafConfigValue(node.layout.root, blockId, key, value) } }
  return { ...node, children: node.children.map(c => setLeafConfigValue(c, blockId, key, value)) }
}
