import { describe, it, expect } from 'vitest'
import { flipTransform, contentKey, siblingKeys } from '../layout-flip'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

const leaf = (blockId: string): LayoutNode => ({ type: 'leaf', blockId })
const hsplit = (...children: LayoutNode[]): LayoutNode => ({ type: 'split', direction: 'horizontal', children })

describe('flipTransform', () => {
  it('returns the inverse translate+scale from old box to new box (top-left origin)', () => {
    // a pane that grew from the left half (0..100) to the full width (0..200)
    const t = flipTransform({ left: 0, top: 0, width: 100, height: 100 }, { left: 0, top: 0, width: 200, height: 100 })
    expect(t).not.toBeNull()
    expect(t!.dx).toBe(0)
    expect(t!.dy).toBe(0)
    expect(t!.sx).toBe(0.5) // start at half-width, animate out to identity
    expect(t!.sy).toBe(1)
  })

  it('captures a pure slide (pane shifted left into a freed gap, same size)', () => {
    const t = flipTransform({ left: 200, top: 0, width: 100, height: 100 }, { left: 100, top: 0, width: 100, height: 100 })
    expect(t).not.toBeNull()
    expect(t!.dx).toBe(100) // it was 100px to the right of where it lands
    expect(t!.sx).toBe(1)
  })

  it('returns null when nothing moved or resized (untouched pane → no animation)', () => {
    expect(flipTransform({ left: 10, top: 10, width: 100, height: 50 }, { left: 10, top: 10, width: 100, height: 50 })).toBeNull()
  })

  it('returns null below the sub-pixel move threshold', () => {
    expect(flipTransform({ left: 10.2, top: 10, width: 100, height: 50 }, { left: 10, top: 10, width: 100, height: 50 })).toBeNull()
  })

  it('returns null when the new box has no area (not yet measured)', () => {
    expect(flipTransform({ left: 0, top: 0, width: 100, height: 100 }, { left: 0, top: 0, width: 0, height: 0 })).toBeNull()
  })
})

describe('contentKey', () => {
  it('keys a leaf by its block id', () => {
    expect(contentKey(leaf('hero'))).toBe('l:hero')
  })

  it('keys a split by direction + recursive children (so shape is the identity)', () => {
    expect(contentKey(hsplit(leaf('a'), leaf('b')))).toBe('s:horizontal:[l:a,l:b]')
  })

  it('is stable across a rebuild that re-wraps survivor nodes (new objects, same shape)', () => {
    const before = hsplit(leaf('a'), leaf('b'), leaf('c'))
    // simulate a detach of `b` rebuilding the survivors as fresh objects
    const after = hsplit(leaf('a'), leaf('c'))
    expect(contentKey((before as any).children[0])).toBe(contentKey((after as any).children[0])) // a matches a
    expect(contentKey((before as any).children[2])).toBe(contentKey((after as any).children[1])) // c matches c
  })
})

describe('siblingKeys', () => {
  it('lines up index→key with the rendered pane order', () => {
    expect(siblingKeys([leaf('a'), leaf('b')])).toEqual(['l:a#0', 'l:b#0'])
  })

  it('disambiguates structurally identical siblings by occurrence', () => {
    expect(siblingKeys([leaf('a'), leaf('a')])).toEqual(['l:a#0', 'l:a#1'])
  })

  it('keeps survivor keys matchable after the middle pane is removed', () => {
    const before = siblingKeys([leaf('a'), leaf('b'), leaf('a')]) // ['l:a#0','l:b#0','l:a#1']
    const after = siblingKeys([leaf('a'), leaf('a')])             // ['l:a#0','l:a#1']
    expect(after[0]).toBe(before[0]) // first 'a' still matches
    expect(after[1]).toBe(before[2]) // second 'a' still matches the old second 'a'
  })
})
