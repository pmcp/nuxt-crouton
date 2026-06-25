/**
 * Compose-gesture controller (WS4, #873) — turns pointer drags of free "pieces" on a
 * canvas into edits on the real layout tree. The geometry (`layout-snap`) decides
 * *where* a dragged piece snaps; the tree transforms (`layout-edit`) apply *what*:
 *
 *  - **snap** — drag a piece near another → they click into a bound split (`dropNode`).
 *  - **dwell-to-drop-inside** — hold a piece OVER another → it drops *inside*, creating a
 *    nested app (`nestInside`, WS2 nesting).
 *  - **rearrange / detach** — pieces are free nodes; combining/splitting is just moving
 *    nodes between pieces.
 *
 * The reactive bits (drag state, dwell timer) live here; the decisions are the pure,
 * unit-tested `closestSnap` / `isOverPane` / `dropNode` / `nestInside`. The canvas
 * component owns pointer events + rect measurement and calls these handlers.
 */
import { computed, ref, type Ref } from 'vue'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'
import { dropNode, nestInside } from '../utils/layout-edit'
import { closestSnap, isOverPane, type Rect, type ClosestSnapResult } from '../utils/layout-snap'

/** A free-floating piece on the canvas: a positioned standalone layout node. */
export interface ComposePiece {
  id: string
  /** The node this piece renders — a leaf, a bound split, or a nested app. */
  node: LayoutNode
  /** World-space top-left + size (px). */
  x: number
  y: number
  width: number
  height: number
  /** Human label shown on the piece frame. */
  label?: string
}

/** What the dragged piece is currently going to do if released now. */
export interface ComposePreview {
  /** The piece being dragged. */
  draggingId: string
  /** The piece it will combine with, or null (drops as a free piece). */
  targetId: string | null
  /** 'nest' = drop inside (dwell); an edge = snap beside; null = no combine. */
  intent: 'nest' | 'snap' | null
  /** The edge it snaps to (when intent === 'snap'). */
  edge?: ClosestSnapResult['edge']
}

export interface ComposeGestureOptions {
  /** Snap gap threshold (px). */
  gap?: number
  /** ms a piece must dwell OVER another before it becomes a nest-drop. */
  dwellMs?: number
  /** Called whenever the pieces change (commit a snap/nest). */
  onChange?: (pieces: ComposePiece[]) => void
}

const rectOf = (p: ComposePiece): Rect => ({ x: p.x, y: p.y, width: p.width, height: p.height })

export function useCroutonComposeGestures(pieces: Ref<ComposePiece[]>, opts: ComposeGestureOptions = {}) {
  const gap = opts.gap ?? 72
  const dwellMs = opts.dwellMs ?? 550

  const draggingId = ref<string | null>(null)
  /** When the dragged piece has been hovering over a target long enough to nest. */
  const dwellReady = ref(false)
  let dwellTimer: ReturnType<typeof setTimeout> | null = null
  let dwellOverId: string | null = null

  const dragging = computed(() => pieces.value.find(p => p.id === draggingId.value) ?? null)

  /** The live snap target for the dragged piece (geometry only). */
  const snap = computed<ClosestSnapResult | null>(() => {
    const d = dragging.value
    if (!d) return null
    // Each OTHER piece is a snap candidate; we address them by index → map back to id.
    const targets = pieces.value
      .map((p, i) => ({ path: [i], rect: rectOf(p), id: p.id }))
      .filter(t => t.id !== d.id)
    return closestSnap(rectOf(d), targets, { gap })
  })

  /** What releasing now would do — for the canvas to draw a guide. */
  const preview = computed<ComposePreview | null>(() => {
    const d = dragging.value
    if (!d) return null
    const over = pieces.value.find(p => p.id !== d.id && isOverPane(rectOf(d), rectOf(p)))
    if (over && dwellReady.value) return { draggingId: d.id, targetId: over.id, intent: 'nest' }
    const s = snap.value
    if (s) return { draggingId: d.id, targetId: pieces.value[s.path[0]!]!.id, intent: 'snap', edge: s.edge }
    return { draggingId: d.id, targetId: null, intent: null }
  })

  function clearDwell() {
    if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null }
    dwellOverId = null
    dwellReady.value = false
  }

  function start(id: string) {
    draggingId.value = id
    clearDwell()
  }

  /** Call on pointer move with the dragged piece's new world position. */
  function move(x: number, y: number) {
    const d = dragging.value
    if (!d) return
    d.x = x
    d.y = y
    // (re)arm the dwell timer when hovering over a (new) piece
    const over = pieces.value.find(p => p.id !== d.id && isOverPane(rectOf(d), rectOf(p)))
    if (over) {
      if (dwellOverId !== over.id) {
        clearDwell()
        dwellOverId = over.id
        dwellTimer = setTimeout(() => { dwellReady.value = true }, dwellMs)
      }
    }
    else { clearDwell() }
  }

  /** Release: commit a nest, a snap, or leave the piece free. Returns the intent applied. */
  function end(): ComposePreview['intent'] {
    const p = preview.value
    const d = dragging.value
    draggingId.value = null
    const applied = p?.intent ?? null
    if (!d || !p || !p.targetId || !p.intent) { clearDwell(); return null }

    const next = pieces.value.slice()
    const ti = next.findIndex(x => x.id === p.targetId)
    const di = next.findIndex(x => x.id === d.id)
    if (ti < 0 || di < 0) { clearDwell(); return null }

    const target = next[ti]!
    const combined = p.intent === 'nest'
      ? nestInside(target.node, [], d.node, d.label)
      : dropNode(target.node, [], d.node, p.edge!)

    // Grow the combined group along the snap axis so the newly-joined pane keeps its
    // size instead of being squished into a sliver (and looking like it "vanished"). A
    // left/top snap also shifts the origin so the group grows in that direction. Nesting
    // keeps the target's footprint (the guest tucks inside).
    let { x, y, width, height } = target
    if (p.intent === 'snap') {
      if (p.edge === 'left' || p.edge === 'right') width = target.width + d.width
      if (p.edge === 'top' || p.edge === 'bottom') height = target.height + d.height
      if (p.edge === 'left') x = target.x - d.width
      if (p.edge === 'top') y = target.y - d.height
    }
    next[ti] = { ...target, node: combined, label: undefined, x, y, width, height }
    next.splice(di, 1) // the dragged piece is now folded into the target group
    pieces.value = next
    opts.onChange?.(next)
    clearDwell()
    return applied
  }

  function cancel() {
    draggingId.value = null
    clearDwell()
  }

  return { draggingId, dragging, snap, preview, dwellReady, start, move, end, cancel }
}
