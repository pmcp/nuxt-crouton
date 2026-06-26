/**
 * Spike layout sizing (#907) — how big a Vue Flow block-node should be on the canvas.
 * A node renders a `LayoutNode` (a single block, or a snapped split of blocks); its
 * footprint is how many block-cells it spans on each axis, so a 2-high stack is twice
 * as tall and a snapped neighbour can match it. Auto-imported (app/utils).
 */
import type { InjectionKey, ShallowRef } from 'vue'
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
export interface SpikeSnapPreview { node: LayoutNode, edge: SnapEdge }
export const SPIKE_SNAP_KEY = Symbol('spike-snap') as InjectionKey<ShallowRef<SpikeSnapPreview | null>>

/**
 * Pull-apart-to-detach (#907) — the inverse of snap-merge, ON the flow canvas. A merged
 * node renders its panes; arming it (hover/select) shows a grip per top-level pane, and
 * dragging a grip OUT past a threshold pops that pane back into its own flow node. The
 * page owns `nodes`, but a default node component can't emit up through CroutonFlow, so the
 * page PROVIDES this callback and SpikeBlockNode calls it — identifying its group by object
 * identity of `data.node` (Vue Flow doesn't forward the node id). `dir` is the release
 * direction (screen px) so the page places the freed node on that side of the group.
 */
export interface SpikeDetachPayload { index: number, dir: { x: number, y: number } }
export const SPIKE_DETACH_KEY = Symbol('spike-detach') as InjectionKey<(group: LayoutNode, payload: SpikeDetachPayload) => void>

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
