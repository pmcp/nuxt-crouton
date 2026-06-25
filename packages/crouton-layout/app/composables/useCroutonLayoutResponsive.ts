/**
 * The explicit responsiveness layer, wired for components (WS5, #874).
 *
 * `resolveLayoutAtWidth` (pure, in `layout-responsive.ts`) is the precedence
 * brain; this composable is the thin reactive + provide/inject glue the renderer
 * uses:
 *  - `useCroutonLayoutResponsive(tree, width)` resolves the effective layout
 *    reactively as the measured container width changes, and splits it into the
 *    visible tree + the collapsed gutter rail.
 *  - `LAYOUT_VARIANTS_KEY` carries the active breakpoint's per-block widget
 *    variants down to `CroutonLayoutRenderer`, which merges a leaf's variant into
 *    its config (so a block reads `variant` like any other prop) — keeping the
 *    renderer free of breakpoint knowledge.
 */
import { computed, type ComputedRef, type InjectionKey, type MaybeRefOrGetter, type Ref, toValue } from 'vue'
import type { LayoutTree } from '@fyit/crouton-core/app/types/layout'
import { partitionCollapsed, resolveLayoutAtWidth, type CollapsedPane, type ResolvedLayout } from '../utils/layout-responsive'

/** Injected variant map (`blockId` → variant) for the breakpoint in view. */
export const LAYOUT_VARIANTS_KEY: InjectionKey<Ref<Record<string, string>> | ComputedRef<Record<string, string>>> = Symbol('crouton-layout-variants')

export interface UseLayoutResponsive {
  /** The full resolution at the current width (root + dials + active checkpoint). */
  resolved: ComputedRef<ResolvedLayout>
  /** The arrangement with collapsed panes pulled out (null when all collapsed). */
  visibleRoot: ComputedRef<ResolvedLayout['root'] | null>
  /** The panes collapsed to the gutter rail at this width. */
  collapsedPanes: ComputedRef<CollapsedPane[]>
  /** Per-block widget variants for this width (provide under `LAYOUT_VARIANTS_KEY`). */
  variants: ComputedRef<Record<string, string>>
  /** The active checkpoint's `minWidth`, or null on the base. */
  activeBreakpoint: ComputedRef<number | null>
}

/**
 * Resolve a layout's authored breakpoints against a (usually measured) container
 * width, reactively. Pass the live width as a ref/getter so it tracks resizes.
 */
export function useCroutonLayoutResponsive(
  tree: MaybeRefOrGetter<LayoutTree>,
  width: MaybeRefOrGetter<number>,
): UseLayoutResponsive {
  const resolved = computed(() => resolveLayoutAtWidth(toValue(tree), toValue(width)))
  const partition = computed(() => partitionCollapsed(resolved.value.root, resolved.value.collapsed))

  return {
    resolved,
    visibleRoot: computed(() => partition.value.visible),
    collapsedPanes: computed(() => partition.value.collapsed),
    variants: computed(() => resolved.value.variants),
    activeBreakpoint: computed(() => resolved.value.activeBreakpoint),
  }
}
