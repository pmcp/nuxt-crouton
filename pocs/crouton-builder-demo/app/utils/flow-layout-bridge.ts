/**
 * flow-layout-bridge (#939) — the pure isomorphism between a `LayoutTree` (the one
 * shared model the renderer / breakpoint author edit) and the **Vue Flow nodes** the
 * App-level canvas manipulates. The zoom shell renders this canvas at the App level
 * (L1/L2); every other surface thinks in one tree. So an arrangement on the flow
 * canvas is the SAME edit the breakpoint author sees when you zoom in — one tree.
 *
 * This mirrors the package's `layout-compose-bridge` (treeToPieces / piecesToTree),
 * but for Vue Flow node geometry. It's reimplemented here rather than imported because
 * crouton-layout's `package.json` `exports` doesn't expose that util (the #903 spike
 * hit the same wall and inlined its `compile`). POC-first: prove the shape here, fold
 * it into the package later.
 */
import type { LayoutNode, LayoutSplit, LayoutTree } from '@fyit/crouton-core/app/types/layout'
import type { NodePath } from '@fyit/crouton-layout/app/utils/layout-edit'

export interface FlowLayoutNode {
  id: string
  type: string
  position: { x: number, y: number }
  data: { node: LayoutNode, label?: string }
}

/** Node card footprint (px) — matches BuilderAppNode's rendered size so seed-tiling
 *  doesn't overlap; also the basis for axis inference. */
export const NODE_W = 420
export const NODE_H = 260
const GAP = 48

function nodeKey(node: LayoutNode): string {
  if (node.type === 'leaf') return node.blockId
  if (node.type === 'nested') return node.label ? `app-${node.label}` : 'app'
  return 'group'
}

function defaultLabel(node: LayoutNode): string | undefined {
  if (node.type === 'nested') return node.label || 'App'
  return undefined
}

export interface SeedOptions {
  /** Force a single vertical column (mobile) regardless of the split direction. */
  column?: boolean
  /** Resolve a human label for a node (e.g. a block's registry `name`). */
  labelOf?: (node: LayoutNode) => string | undefined
}

/**
 * Explode a layout tree into free Vue Flow nodes — one per top-level child of a split
 * root (tiled along the split axis), or a single node for a leaf/nested root. Positions
 * are a simple non-overlapping tiling; the canvas re-fits on mount.
 */
export function treeToFlowNodes(tree: LayoutTree, opts: SeedOptions = {}): FlowLayoutNode[] {
  const root = tree.root
  const horizontal = opts.column ? false : root.type === 'split' ? root.direction === 'horizontal' : true
  const nodes: LayoutNode[] = root.type === 'split' ? root.children : [root]
  const labelOf = opts.labelOf ?? defaultLabel
  return nodes.map((node, i) => {
    const label = labelOf(node)
    return {
      id: `fnode-${i}-${nodeKey(node)}`,
      type: 'default',
      position: {
        x: horizontal ? 24 + i * (NODE_W + GAP) : 24,
        y: horizontal ? 24 : 24 + i * (NODE_H + GAP),
      },
      data: { node, ...(label ? { label } : {}) },
    }
  })
}

const cx = (n: FlowLayoutNode) => n.position.x + NODE_W / 2
const cy = (n: FlowLayoutNode) => n.position.y + NODE_H / 2

/**
 * The nodes ordered as `flowNodesToTree` lays them out: axis inferred from the spread
 * of centres, then sorted along it. Single source of ordering truth so the tree and
 * `flowNodePath` can never disagree.
 */
function order(nodes: FlowLayoutNode[]): { ordered: FlowLayoutNode[], horizontal: boolean } {
  const spread = (a: number[]) => (a.length ? Math.max(...a) - Math.min(...a) : 0)
  const horizontal = spread(nodes.map(cx)) >= spread(nodes.map(cy))
  const ordered = nodes.slice().sort((a, b) => (horizontal ? cx(a) - cx(b) : cy(a) - cy(b)))
  return { ordered, horizontal }
}

/**
 * The `NodePath` of a flow node within `flowNodesToTree(nodes)` — so a double-click on a
 * nested-app card maps to a zoom target. One node IS the root (path `[]`); among many,
 * the path is its position-sorted slot index. `null` if the node isn't present.
 */
export function flowNodePath(nodes: FlowLayoutNode[], id: string): NodePath | null {
  if (!nodes.some(n => n.id === id)) return null
  if (nodes.length === 1) return []
  const { ordered } = order(nodes)
  const idx = ordered.findIndex(n => n.id === id)
  return idx < 0 ? null : [idx]
}

/**
 * Recompose the authoritative tree from the free flow nodes. Zero → base unchanged. One
 * → its node is the whole root. Many → a split whose axis is inferred from the on-canvas
 * arrangement, ordered along it, sizes apportioned evenly (the prototype keeps it simple;
 * proportional sizing is a follow-up). `renderer` / `breakpoints` carry from `base`.
 */
export function flowNodesToTree(nodes: FlowLayoutNode[], base?: LayoutTree): LayoutTree {
  const renderer = base?.renderer ?? 'panes'
  const carry = base?.breakpoints ? { breakpoints: base.breakpoints } : {}
  if (nodes.length === 0) {
    return base ?? { renderer, root: { type: 'split', direction: 'horizontal', children: [] } }
  }
  if (nodes.length === 1) {
    return { renderer, root: nodes[0]!.data.node, ...carry }
  }
  const { ordered, horizontal } = order(nodes)
  const size = Math.round((100 / ordered.length) * 10) / 10
  const children: LayoutNode[] = ordered.map(n => ({ ...n.data.node, defaultSize: size }))
  const root: LayoutSplit = { type: 'split', direction: horizontal ? 'horizontal' : 'vertical', children }
  return { renderer, root, ...carry }
}
