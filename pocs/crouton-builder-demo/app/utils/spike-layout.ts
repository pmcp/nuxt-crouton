/**
 * Spike layout sizing (#907) — how big a Vue Flow block-node should be on the canvas.
 * A node renders a `LayoutNode` (a single block, or a snapped split of blocks); its
 * footprint is how many block-cells it spans on each axis, so a 2-high stack is twice
 * as tall and a snapped neighbour can match it. Auto-imported (app/utils).
 */
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

export const SPIKE_BASE_W = 256
export const SPIKE_BASE_H = 184

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
