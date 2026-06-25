import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LayoutComposeCanvas from '../LayoutComposeCanvas.vue'
import type { ComposePiece } from '../../composables/useCroutonComposeGestures'
import type { LayoutSplit, LayoutNested, LayoutLeaf } from '@fyit/crouton-core/app/types/layout'

/**
 * Live component test (WS4 #873): mount the REAL canvas and drive a genuine pointer
 * drag (down → move → up) through the component's own handlers + the gesture controller,
 * asserting the layout tree actually recomposes. Verifies the wiring the unit tests
 * can't — pointer math, the world↔client conversion, capture, and the commit path.
 *
 * happy-dom's getBoundingClientRect is the zero rect, so world coords == client coords
 * (grab offset cancels), which keeps the arithmetic predictable.
 */
const piece = (id: string, x: number, y: number): ComposePiece => ({
  id, node: { type: 'leaf', blockId: id }, x, y, width: 200, height: 140, label: id,
})

function mountCanvas(pieces: ComposePiece[]) {
  return mount(LayoutComposeCanvas, {
    props: { modelValue: pieces, 'onUpdate:modelValue': () => {} },
    global: { stubs: { CroutonLayoutRenderer: true, UIcon: true } },
  })
}

describe('CroutonLayoutComposeCanvas — live drag', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('snaps a dragged piece into a bound split (drag b onto a.right)', async () => {
    const w = mountCanvas([piece('a', 0, 0), piece('b', 800, 0)])

    // grab b at its own origin (grab offset → 0), drag it to 40px past a's right edge
    await w.get('[data-piece-id="b"]').trigger('pointerdown', { clientX: 800, clientY: 0, pointerId: 1 })
    await w.trigger('pointermove', { clientX: 240, clientY: 0 })
    await w.trigger('pointerup')

    const emits = w.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits!.at(-1)![0] as ComposePiece[]
    expect(next).toHaveLength(1) // b folded into a's group
    const split = next[0]!.node as LayoutSplit
    expect(split.type).toBe('split')
    expect(split.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['a', 'b'])
  })

  it('drops INSIDE on a dwell (hold b over a) → nested app', async () => {
    const w = mountCanvas([piece('a', 0, 0), piece('b', 800, 0)])

    await w.get('[data-piece-id="b"]').trigger('pointerdown', { clientX: 800, clientY: 0, pointerId: 1 })
    await w.trigger('pointermove', { clientX: 10, clientY: 10 }) // b squarely over a
    vi.advanceTimersByTime(600) // dwell arms
    await w.trigger('pointerup')

    const next = w.emitted('update:modelValue')!.at(-1)![0] as ComposePiece[]
    expect(next).toHaveLength(1)
    expect(next[0]!.node.type).toBe('nested')
    const inner = (next[0]!.node as LayoutNested).layout.root as LayoutSplit
    expect(inner.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['a', 'b'])
  })

  it('leaves both pieces free when released out of range', async () => {
    const w = mountCanvas([piece('a', 0, 0), piece('b', 800, 0)])

    await w.get('[data-piece-id="b"]').trigger('pointerdown', { clientX: 800, clientY: 0, pointerId: 1 })
    await w.trigger('pointermove', { clientX: 900, clientY: 500 })
    await w.trigger('pointerup')

    // no commit emit with a combined tree; pieces stay two (last emit, if any, has length 2)
    const emits = w.emitted('update:modelValue')
    if (emits) expect((emits.at(-1)![0] as ComposePiece[]).length).toBe(2)
  })
})
