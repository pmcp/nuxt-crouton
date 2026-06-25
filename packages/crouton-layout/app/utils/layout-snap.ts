/**
 * Edge-proximity geometry for compose gestures (WS4, #873) — the pure spatial brain
 * behind "drag two apps near each other and they magnetically click into a layout".
 *
 * This module knows nothing about the layout tree: it answers, given a dragged card's
 * rect and the rects of the candidate panes around it, *which edge of which pane* the
 * card is close enough to snap to. The gesture composable feeds the answer to the
 * `layout-edit` tree transforms (`dropNode` at that edge). Pure (no Vue, no DOM) so the
 * snap rules are unit-testable without a browser.
 */
import type { DropEdge, NodePath } from './layout-edit'

export interface Rect { x: number, y: number, width: number, height: number }

export interface SnapOptions {
  /** Max gap (px) between the card and a pane edge that still snaps. */
  gap?: number
  /** Min overlap on the perpendicular axis (0..1 of the smaller side) to snap. */
  align?: number
}

export interface SnapEdgeResult {
  /** Which edge of the TARGET the card snaps to. */
  edge: Exclude<DropEdge, 'center'>
  /** The gap (px) to that edge — smaller = stronger snap. */
  gap: number
  /** Perpendicular centre-to-centre distance — tiebreak when gaps match. */
  offset: number
}

const DEFAULT_GAP = 72
const DEFAULT_ALIGN = 0.4

/** Length of the 1-D overlap of [a0,a1] and [b0,b1]. */
function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
}

/** Area-overlap of two rects as a fraction of the SMALLER rect's area (0..1). */
export function rectsOverlapFrac(a: Rect, b: Rect): number {
  const ox = overlap1d(a.x, a.x + a.width, b.x, b.x + b.width)
  const oy = overlap1d(a.y, a.y + a.height, b.y, b.y + b.height)
  const inter = ox * oy
  if (inter === 0) return 0
  const minArea = Math.min(a.width * a.height, b.width * b.height)
  return minArea > 0 ? inter / minArea : 0
}

/**
 * Which edge of `target` the dragged `drag` rect snaps to, or null if it's not close
 * enough / not aligned. A horizontal snap (left/right) needs vertical alignment; a
 * vertical snap (top/bottom) needs horizontal alignment. The smallest in-range gap
 * wins, tie-broken by the smaller perpendicular offset.
 */
export function snapEdge(drag: Rect, target: Rect, opts: SnapOptions = {}): SnapEdgeResult | null {
  const gapMax = opts.gap ?? DEFAULT_GAP
  const alignMin = opts.align ?? DEFAULT_ALIGN

  const dCx = drag.x + drag.width / 2
  const dCy = drag.y + drag.height / 2
  const tCx = target.x + target.width / 2
  const tCy = target.y + target.height / 2

  const yOverlap = overlap1d(drag.y, drag.y + drag.height, target.y, target.y + target.height)
  const xOverlap = overlap1d(drag.x, drag.x + drag.width, target.x, target.x + target.width)
  const yAlign = yOverlap / Math.min(drag.height, target.height)
  const xAlign = xOverlap / Math.min(drag.width, target.width)

  const candidates: SnapEdgeResult[] = []

  // Horizontal snaps need vertical alignment. Allow a slight negative gap (cards may
  // overlap as you drag through) down to half the card so it still reads as a side snap.
  if (yAlign >= alignMin) {
    const gapRight = drag.x - (target.x + target.width)
    const gapLeft = target.x - (drag.x + drag.width)
    if (gapRight >= -drag.width / 2 && gapRight <= gapMax) candidates.push({ edge: 'right', gap: Math.max(0, gapRight), offset: Math.abs(dCy - tCy) })
    if (gapLeft >= -drag.width / 2 && gapLeft <= gapMax) candidates.push({ edge: 'left', gap: Math.max(0, gapLeft), offset: Math.abs(dCy - tCy) })
  }
  if (xAlign >= alignMin) {
    const gapBottom = drag.y - (target.y + target.height)
    const gapTop = target.y - (drag.y + drag.height)
    if (gapBottom >= -drag.height / 2 && gapBottom <= gapMax) candidates.push({ edge: 'bottom', gap: Math.max(0, gapBottom), offset: Math.abs(dCx - tCx) })
    if (gapTop >= -drag.height / 2 && gapTop <= gapMax) candidates.push({ edge: 'top', gap: Math.max(0, gapTop), offset: Math.abs(dCx - tCx) })
  }

  if (!candidates.length) return null
  candidates.sort((a, b) => a.gap - b.gap || a.offset - b.offset)
  return candidates[0]!
}

export interface SnapTarget { path: NodePath, rect: Rect }
export interface ClosestSnapOptions extends SnapOptions {
  /** A path to skip — a card can't snap to itself. */
  excludePath?: NodePath
}
export interface ClosestSnapResult extends SnapEdgeResult { path: NodePath }

const samePath = (a: NodePath, b: NodePath): boolean => a.length === b.length && a.every((v, i) => v === b[i])

/**
 * The best snap across several candidate panes — the strongest (smallest-gap) edge,
 * skipping `excludePath`. Null when nothing is in range.
 */
export function closestSnap(drag: Rect, targets: SnapTarget[], opts: ClosestSnapOptions = {}): ClosestSnapResult | null {
  let best: ClosestSnapResult | null = null
  for (const t of targets) {
    if (opts.excludePath && samePath(t.path, opts.excludePath)) continue
    const r = snapEdge(drag, t.rect, opts)
    if (r && (!best || r.gap < best.gap || (r.gap === best.gap && r.offset < best.offset))) {
      best = { ...r, path: t.path }
    }
  }
  return best
}

/**
 * Is the card hovering mostly OVER a pane (rather than beside it)? The signal for
 * dwell-to-drop-inside (hold over a pane → drop nested). Default ≥ 60% cover.
 */
export function isOverPane(drag: Rect, target: Rect, minFrac = 0.6): boolean {
  return rectsOverlapFrac(drag, target) >= minFrac
}
