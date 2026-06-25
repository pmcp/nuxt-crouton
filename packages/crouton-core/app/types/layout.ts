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
 * The closed set of pane-collapse motions (WS6, #875). Promoted from the 12-concept
 * gallery (`writeups/ui-proposals/layout-collapse-concepts.md`) by two questions:
 * does it survive in a *narrow pane*, and does it map to a *node in a tree* (not the
 * whole viewport). The four that pass:
 *
 *  - `gutter-tabs` — shipped (#852, WS5). The collapsed pane *leaves the splitter* and
 *    hangs as a vertical tab in a right-edge gutter rail. The one "out-of-flow" style.
 *  - `spring-drawer` — in-place. The pane slams shut into a thin edge spine with a
 *    damped-spring overshoot; restore springs past its width and settles.
 *  - `crt-power-down` — in-place. An old-CRT switch-off: the pane crushes to a phosphor
 *    line, pinches to a standby dot (the restore handle), then boots back open.
 *  - `iris-portal` — in-place. A camera-shutter iris closes the pane to a glowing seed
 *    at its own center; restore irises back open.
 *
 * `gutter-tabs` reclaims space by leaving the splitter; the three in-place styles keep
 * the pane's tree slot and collapse its splitter panel to a thin handle so siblings
 * reflow into the freed space. All four are size-proof (the resting handle is tiny) and
 * tree-native (work on any leaf at any nesting depth).
 */
export const LAYOUT_COLLAPSE_STYLES = ['gutter-tabs', 'spring-drawer', 'crt-power-down', 'iris-portal'] as const
export type LayoutCollapseStyle = (typeof LAYOUT_COLLAPSE_STYLES)[number]

/** The default collapse motion when a breakpoint sets none (the shipped behaviour). */
export const DEFAULT_COLLAPSE_STYLE: LayoutCollapseStyle = 'gutter-tabs'

/** Narrow a persisted/untrusted value to a known `LayoutCollapseStyle`. */
export function isLayoutCollapseStyle(value: unknown): value is LayoutCollapseStyle {
  return typeof value === 'string' && (LAYOUT_COLLAPSE_STYLES as readonly string[]).includes(value)
}

/**
 * `gutter-tabs` pulls a collapsed pane out of the splitter into a gutter rail; every
 * other style collapses the pane *in place* (its panel shrinks to a handle, siblings
 * reflow). The renderer branches on this.
 */
export function isInPlaceCollapse(style: LayoutCollapseStyle): boolean {
  return style !== 'gutter-tabs'
}

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
  /**
   * Collapse motion for panes collapsed at this breakpoint (WS6, #875). One of the
   * closed `LayoutCollapseStyle` set; absent ⇒ `DEFAULT_COLLAPSE_STYLE` (`gutter-tabs`).
   */
  collapseStyle?: LayoutCollapseStyle
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
