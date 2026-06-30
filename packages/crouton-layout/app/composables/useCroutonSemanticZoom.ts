/**
 * useCroutonSemanticZoom — the navigation state machine for the Crouton Builder's
 * semantic-zoom shell (WS1, #870; epic #868).
 *
 * One gesture (zoom in / zoom out) walks the abstraction ladder; content changes
 * *meaning* at each depth (Figma/Miro-style ZUI):
 *
 *   Site  → a flow of pages (the only floating level)
 *   Page  → a LAYOUT of the page's apps (panes)
 *   App   → each app is ITSELF a layout — recurse into a `nested` node (WS2 #871)
 *   Breakpoints → author responsiveness for the focused layout (WS5 #874)
 *
 * The state is a stack of frames = the breadcrumb. Each "zoom in" pushes a frame;
 * "zoom out" pops; a breadcrumb click jumps. Zooming into a pane that is a
 * `nested` node descends into its OWN sub-layout (its own NodePath space) — the
 * per-layout edit scoping from WS2 made visible as navigation.
 *
 * Pure VueUse-free reactivity (`ref`/`computed` imported from vue) so it runs in
 * a Nuxt app AND is unit-testable without a Nuxt context.
 */
import { ref, computed } from 'vue'
import type { LayoutTree } from '@fyit/crouton-core/app/types/layout'
import { getNode, getNestedLayout, replaceNestedLayout, type NodePath } from '../utils/layout-edit'

export type ZoomLevel = 'site' | 'layout' | 'breakpoints'

export interface ZoomFrame {
  level: ZoomLevel
  /** Human label shown in the breadcrumb / level badge. */
  label: string
  /** The focused layout at this frame (absent on the Site frame). */
  tree?: LayoutTree
  /**
   * For a frame reached by zooming into a `nested` node (`zoomIntoNested`): the
   * path of that node WITHIN the parent frame's layout. `setCurrentTree` uses it to
   * write an edit made down here back up into the parent's tree, so the parent
   * stays in sync (one shared tree across the whole zoom stack, #899).
   */
  sourcePath?: NodePath
}

export interface ZoomCrumb {
  label: string
  index: number
  level: ZoomLevel
}

export interface UseSemanticZoomOptions {
  /** Label for the root Site frame (default `'Site'`). */
  siteLabel?: string
}

export function useCroutonSemanticZoom(opts: UseSemanticZoomOptions = {}) {
  const stack = ref<ZoomFrame[]>([{ level: 'site', label: opts.siteLabel ?? 'Site' }])

  /** The frame currently in view (top of the stack). */
  const current = computed<ZoomFrame>(() => stack.value[stack.value.length - 1]!)
  /** How many levels deep we've zoomed (0 = Site). */
  const depth = computed(() => stack.value.length - 1)
  const canZoomOut = computed(() => stack.value.length > 1)
  /** The breadcrumb trail, root → current. */
  const breadcrumb = computed<ZoomCrumb[]>(() =>
    stack.value.map((f, index) => ({ label: f.label, index, level: f.level })),
  )

  /** Zoom from the Site level into a page's layout. */
  function zoomIntoPage(label: string, tree: LayoutTree): boolean {
    if (current.value.level !== 'site') return false
    stack.value = [...stack.value, { level: 'layout', label, tree }]
    return true
  }

  /**
   * Zoom into a `nested` app at `path` within the current layout → its sub-layout
   * (its own path space). No-op unless the current frame is a layout AND `path`
   * addresses a `nested` node.
   */
  function zoomIntoNested(path: NodePath): boolean {
    const frame = current.value
    if (frame.level !== 'layout' || !frame.tree) return false
    const sub = getNestedLayout(frame.tree.root, path)
    if (!sub) return false
    const node = getNode(frame.tree.root, path)
    const label = node?.type === 'nested' && node.label ? node.label : 'App'
    stack.value = [...stack.value, { level: 'layout', label, tree: sub, sourcePath: path }]
    return true
  }

  /** Zoom into the breakpoint authoring level for the focused layout. */
  function zoomIntoBreakpoints(label = 'Responsive'): boolean {
    const frame = current.value
    if (frame.level !== 'layout' || !frame.tree) return false
    stack.value = [...stack.value, { level: 'breakpoints', label, tree: frame.tree }]
    return true
  }

  /**
   * Replace the focused frame's tree with an edit made at this level, then
   * propagate that edit DOWN the stack so every frame addressing the same layout
   * stays in sync — the "one shared tree" guarantee (#899):
   *
   *  - a `breakpoints` frame sits directly on top of the `layout` it authors, so
   *    its edit also replaces that layout frame's tree;
   *  - a `nested`-zoomed frame (carrying `sourcePath`) writes its sub-tree back into
   *    the parent frame at that path via `replaceNestedLayout`;
   *  - propagation stops at an independent boundary (a page zoomed from Site, whose
   *    parent is the treeless Site frame) — the host owns persistence past that.
   *
   * Because it only rewrites `tree` (never pushes/pops), the focused level/label and
   * the breadcrumb are untouched — so a re-seed keyed on navigation won't refire.
   */
  function setCurrentTree(tree: LayoutTree): boolean {
    if (current.value.level === 'site') return false
    const next = stack.value.slice()
    next[next.length - 1] = { ...next[next.length - 1]!, tree }
    for (let i = next.length - 1; i > 0; i--) {
      const frame = next[i]!
      const below = next[i - 1]!
      if (frame.level === 'breakpoints') {
        // Same layout, viewed as breakpoints — share the edited tree downward.
        next[i - 1] = { ...below, tree: frame.tree }
      }
      else if (frame.sourcePath && below.tree && frame.tree) {
        // A nested app — fold its sub-layout back into the parent at its path.
        const root = replaceNestedLayout(below.tree.root, frame.sourcePath, frame.tree)
        next[i - 1] = { ...below, tree: { ...below.tree, root } }
      }
      else {
        break // independent boundary (page ← Site): host owns it from here.
      }
    }
    stack.value = next
    return true
  }

  /** Zoom out one level (no-op at the Site root). */
  function zoomOut(): boolean {
    if (stack.value.length <= 1) return false
    stack.value = stack.value.slice(0, -1)
    return true
  }

  /** Jump straight to a breadcrumb level (no-op for the current/last or invalid index). */
  function jumpTo(index: number): boolean {
    if (index < 0 || index >= stack.value.length - 1) return false
    stack.value = stack.value.slice(0, index + 1)
    return true
  }

  /** Reset all the way back to the Site root. */
  function reset(): void {
    stack.value = stack.value.slice(0, 1)
  }

  return {
    stack,
    current,
    depth,
    canZoomOut,
    breadcrumb,
    zoomIntoPage,
    zoomIntoNested,
    zoomIntoBreakpoints,
    setCurrentTree,
    zoomOut,
    jumpTo,
    reset,
  }
}
