/**
 * Layout tree types — the persisted "layout is data" shape (Sprint 0 spike, #713).
 *
 * A layout is a tree of panes. A `split` node arranges children horizontally or
 * vertically (mapped to a reka-ui SplitterGroup); a `leaf` node hosts one block,
 * resolved id → component through an allowlisted registry map (Sprint 1, #704);
 * a `nested` node hosts a whole sub-layout — an "app" that is itself a layout, so
 * a page-layout's panes can be app-layouts (recursive nesting, WS2 #871).
 *
 * Throwaway spike contract — the production tree lands in Sprint 3 (#706) on the
 * new `layout_configs` table.
 */

export interface LayoutNodeBase {
  /** Default size of this node within its parent split, as a percentage. */
  defaultSize?: number
  /** Minimum size of this node within its parent split, as a percentage. */
  minSize?: number
}

export interface LayoutLeaf extends LayoutNodeBase {
  type: 'leaf'
  /** Registry id; resolved to a component via the allowlisted blocks map. */
  blockId: string
  /** User-editable props passed to the block (validated against its config schema in Sprint 1). */
  config?: Record<string, unknown>
}

export interface LayoutSplit extends LayoutNodeBase {
  type: 'split'
  direction: 'horizontal' | 'vertical'
  children: LayoutNode[]
}

export interface LayoutNested extends LayoutNodeBase {
  type: 'nested'
  /**
   * The embedded sub-layout — an "app" that is itself a layout. A full
   * `LayoutTree` (not a bare node) so a sub-layout can carry its own `renderer`
   * (panes now; canvas/spatial later, #855) and its own breakpoint overrides
   * (WS5, #874). The renderer/edits/viability recurse into `layout.root`.
   */
  layout: LayoutTree
  /** Human name for the app, surfaced at the App zoom level (WS1, #870). */
  label?: string
}

export type LayoutNode = LayoutLeaf | LayoutSplit | LayoutNested

export interface LayoutTree {
  renderer: 'panes'
  root: LayoutNode
}
