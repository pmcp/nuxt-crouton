import { describe, it, expect } from 'vitest'
import { rectsOverlapFrac, snapEdge, closestSnap, type Rect } from '../layout-snap'

// A 200×140 card at (x, y).
const card = (x: number, y: number, w = 200, h = 140): Rect => ({ x, y, width: w, height: h })

describe('rectsOverlapFrac — how much two rects cover each other (0..1 of the smaller)', () => {
  it('is 0 for disjoint rects', () => {
    expect(rectsOverlapFrac(card(0, 0), card(400, 400))).toBe(0)
  })
  it('is 1 when one fully covers the other', () => {
    expect(rectsOverlapFrac(card(0, 0, 200, 200), card(50, 50, 50, 50))).toBe(1)
  })
  it('is a partial fraction for a partial cover', () => {
    const f = rectsOverlapFrac(card(0, 0), card(100, 70))
    expect(f).toBeGreaterThan(0.2)
    expect(f).toBeLessThan(0.3)
  })
})

describe('snapEdge — which edge of target a dragged card snaps to', () => {
  const target = card(0, 0) // 0..200 x, 0..140 y

  it('snaps to the RIGHT edge when the card sits just past target.right, vertically aligned', () => {
    const r = snapEdge(card(240, 4), target) // 40px gap to the right, near-aligned in y
    expect(r?.edge).toBe('right')
  })

  it('snaps to the LEFT edge on the other side', () => {
    const r = snapEdge(card(-240, 0), target)
    expect(r?.edge).toBe('left')
  })

  it('snaps to BOTTOM when below and horizontally aligned', () => {
    const r = snapEdge(card(6, 170), target) // 30px below, x-aligned
    expect(r?.edge).toBe('bottom')
  })

  it('snaps to TOP when above', () => {
    const r = snapEdge(card(0, -170), target)
    expect(r?.edge).toBe('top')
  })

  it('returns null when too far to snap (beyond the gap threshold)', () => {
    expect(snapEdge(card(600, 0), target)).toBeNull()
  })

  it('returns null when not aligned on the perpendicular axis', () => {
    // to the right horizontally but slid far down so there is no vertical overlap
    expect(snapEdge(card(240, 600), target)).toBeNull()
  })

  it('picks the smaller-gap edge when two are plausible', () => {
    // closer on the right (gap 20) than below (gap 120) → right wins
    const r = snapEdge(card(220, 30), target, { gap: 200 })
    expect(r?.edge).toBe('right')
  })

  it('honours a custom gap threshold', () => {
    expect(snapEdge(card(260, 0), target, { gap: 40 })).toBeNull() // 60px gap > 40
    expect(snapEdge(card(260, 0), target, { gap: 80 })?.edge).toBe('right') // 60 < 80
  })
})

describe('closestSnap — best target+edge across several candidates', () => {
  const targets = [
    { path: [0], rect: card(0, 0) },
    { path: [1], rect: card(800, 0) },
  ]
  it('returns the nearest target with its edge', () => {
    const r = closestSnap(card(240, 0), targets) // near target [0]'s right
    expect(r).toMatchObject({ path: [0], edge: 'right' })
  })
  it('returns null when nothing is in range', () => {
    expect(closestSnap(card(400, 400), targets)).toBeNull()
  })
  it('skips an excluded path (you cannot snap a card to itself)', () => {
    const r = closestSnap(card(240, 0), targets, { excludePath: [0] })
    expect(r).toBeNull() // [0] excluded; [1] is far away
  })
})
