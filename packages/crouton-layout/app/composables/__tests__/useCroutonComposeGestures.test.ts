import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCroutonComposeGestures, type ComposePiece } from '../useCroutonComposeGestures'
import type { LayoutSplit, LayoutNested, LayoutLeaf } from '@fyit/crouton-core/app/types/layout'

const piece = (id: string, x: number, y: number): ComposePiece => ({
  id, node: { type: 'leaf', blockId: id }, x, y, width: 200, height: 140, label: id,
})

describe('useCroutonComposeGestures', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('previews a snap when a dragged piece nears another', () => {
    const pieces = ref([piece('a', 0, 0), piece('b', 800, 0)])
    const g = useCroutonComposeGestures(pieces)
    g.start('b')
    g.move(240, 0) // b now just past a's right edge
    expect(g.preview.value).toMatchObject({ draggingId: 'b', targetId: 'a', intent: 'snap', edge: 'right' })
  })

  it('commits a snap into a bound split and folds the dragged piece away', () => {
    const pieces = ref([piece('a', 0, 0), piece('b', 800, 0)])
    const g = useCroutonComposeGestures(pieces)
    g.start('b')
    g.move(240, 0)
    const intent = g.end()
    expect(intent).toBe('snap')
    expect(pieces.value).toHaveLength(1)
    const combined = pieces.value[0]!.node as LayoutSplit
    expect(combined.type).toBe('split')
    expect(combined.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['a', 'b'])
    // the group grows along the snap axis so the joined pane isn't squished to a sliver
    expect(pieces.value[0]!.width).toBe(400) // 200 (a) + 200 (b)
    expect(pieces.value[0]!.height).toBe(140)
  })

  it('arms a nest after dwelling OVER a piece, then commits a nested app', () => {
    const pieces = ref([piece('a', 0, 0), piece('b', 800, 0)])
    const g = useCroutonComposeGestures(pieces, { dwellMs: 500 })
    g.start('b')
    g.move(10, 10) // b sits squarely over a (mostly overlapping)
    expect(g.preview.value?.intent).not.toBe('nest') // not yet — dwell not elapsed
    vi.advanceTimersByTime(500)
    expect(g.preview.value).toMatchObject({ targetId: 'a', intent: 'nest' })
    const intent = g.end()
    expect(intent).toBe('nest')
    expect(pieces.value).toHaveLength(1)
    expect(pieces.value[0]!.node.type).toBe('nested')
    const inner = (pieces.value[0]!.node as LayoutNested).layout.root as LayoutSplit
    expect(inner.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['a', 'b'])
  })

  it('leaves the piece free when released out of range', () => {
    const pieces = ref([piece('a', 0, 0), piece('b', 800, 0)])
    const g = useCroutonComposeGestures(pieces)
    g.start('b')
    g.move(900, 400) // nowhere near a
    expect(g.end()).toBeNull()
    expect(pieces.value).toHaveLength(2)
  })
})
