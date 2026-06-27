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
export interface SpikeSnapPreview { node: LayoutNode, edge: SnapEdge }
export const SPIKE_SNAP_KEY = Symbol('spike-snap') as InjectionKey<ShallowRef<SpikeSnapPreview | null>>

/**
 * Pull-apart-to-detach (#907) — the inverse of snap-merge, ON the flow canvas. A merged
 * node renders its panes; arming it (hover/select) shows a grip per top-level pane, and
 * dragging a grip OUT past a threshold pops that pane back into its own flow node. The
 * page owns `nodes`, but a default node component can't emit up through CroutonFlow, so the
 * page PROVIDES this callback and SpikeBlockNode calls it — identifying its group by object
 * identity of `data.node` (Vue Flow doesn't forward the node id). `dropOffset` is the pulled
 * pane's top-left at release expressed as a FLOW-space offset from the group's top-left (the node
 * computes it from its own on-screen size vs its flow footprint, no Vue Flow store needed); the
 * page adds it to the group's known flow position so the freed node lands exactly where you
 * dropped it. `dir` (screen-px release delta) is kept as a fallback for placing it on the pulled
 * side when no `dropOffset` is available.
 */
export interface SpikeDetachPayload { index: number, dir: { x: number, y: number }, dropOffset?: { x: number, y: number } }
export const SPIKE_DETACH_KEY = Symbol('spike-detach') as InjectionKey<(group: LayoutNode, payload: SpikeDetachPayload) => void>

/**
 * Global viewport survey (#907, "layer 3") — the flow has no real concept of screen size;
 * size there is just topology. Flipping a viewport makes the WHOLE board render every layout
 * AT that width, so you can scan all your pages as phone/tablet/desktop at a glance. It's a
 * read-only survey: while a viewport is active, snapping/detach are off and nodes tile rather
 * than drag. `null` = back to the topology (footprint) view. Provided by the page; SpikeBlockNode
 * injects it to size its card to the device + render via CroutonLayoutResponsiveRenderer at `width`.
 */
export interface SpikeViewport { label: string, icon: string, width: number, height: number }
export const SPIKE_VIEWPORT_KEY = Symbol('spike-viewport') as InjectionKey<Ref<SpikeViewport | null>>

/** The device presets the viewport chips offer (width/height in px). */
export const SPIKE_VIEWPORTS: SpikeViewport[] = [
  { label: 'Phone', icon: 'i-lucide-smartphone', width: 375, height: 720 },
  { label: 'Tablet', icon: 'i-lucide-tablet', width: 768, height: 1024 },
  { label: 'Desktop', icon: 'i-lucide-monitor', width: 1280, height: 800 },
]

/**
 * In-flow zoom edit (#907) — when you zoom into ONE node, you edit it IN PLACE on the canvas:
 * the focused node renders at the chosen device width with live splitter handles, and dragging a
 * pane saves its sizes to THAT width's keypoint. `focus` names the node (object identity) + the
 * device it's being authored at; `SPIKE_RESIZE_KEY` is the page callback the node calls on a
 * splitter drag (it can't emit up through CroutonFlow). null focus = not zoom-editing.
 */
export interface SpikeFocus { node: LayoutNode, vp: SpikeViewport }
export const SPIKE_FOCUS_KEY = Symbol('spike-focus') as InjectionKey<Ref<SpikeFocus | null>>
export const SPIKE_RESIZE_KEY = Symbol('spike-resize') as InjectionKey<(group: LayoutNode, path: number[], sizes: number[], width: number) => void>

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
