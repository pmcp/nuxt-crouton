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

/**
 * An authored responsive breakpoint (WS5, #874) — a layout adapts in two
 * complementary layers: *intrinsic* (every region reflows to its own width via
 * container queries, recursively) and *explicit* (these breakpoints, authored
 * "by demonstration"). A breakpoint is a **min-width checkpoint that locks
 * upward**: it applies for every container width `>= minWidth`. The base tree
 * (`LayoutTree.root`, nothing collapsed, no variant overrides) is the floor
 * below the smallest breakpoint.
 *
 * Each field is resolved independently, last-wins: at a container width `W`, a
 * field takes the value from the **largest** breakpoint with `minWidth <= W`
 * that defines it, else the base default (see `resolveLayoutAtWidth`). So you
 * can set just the collapsed set at one width and just a widget variant at
 * another without re-stating the whole arrangement.
 */
export interface LayoutBreakpoint {
  /** Container width (px) at and above which this breakpoint applies. */
  minWidth: number
  /** Human label for the ruler checkpoint (e.g. `'Tablet'`, `'Desktop'`). */
  label?: string
  /**
   * A full arrangement override for this breakpoint — when present it replaces
   * `LayoutTree.root` from `minWidth` up (the "arrange at a width and it locks"
   * demonstration). Omit to keep the base arrangement and only tweak the dials
   * below.
   */
  root?: LayoutNode
  /** `blockId`s collapsed to a gutter tab at this breakpoint and up. */
  collapsed?: string[]
  /** Per-block widget variant override (`blockId` → variant, e.g. list↔cards↔table). */
  variants?: Record<string, string>
  /** Collapse-style for collapsed panes at this breakpoint (WS6, #875). Reserved. */
  collapseStyle?: string
}

export interface LayoutTree {
  renderer: 'panes'
  root: LayoutNode
  /**
   * Authored responsive breakpoints (WS5, #874), the *explicit* layer over the
   * *intrinsic* (container-query) reflow. Optional; absent = no authored
   * breakpoints (the intrinsic layer still reflows every region to its own
   * width). A nested sub-layout is its own `LayoutTree`, so it carries its own
   * breakpoints — responsiveness recurses with the layout.
   */
  breakpoints?: LayoutBreakpoint[]
}
