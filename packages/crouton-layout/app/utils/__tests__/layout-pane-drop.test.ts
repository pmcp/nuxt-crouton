import { describe, it, expect } from 'vitest'
import { insertAtPath, applyPaneDrop, moveChild, makeLeaf } from '../layout-edit'
import type { LayoutSplit, LayoutLeaf } from '@fyit/crouton-core/app/types/layout'

// --- #985 drop-beside-pane pure transforms ---------------------------------
// The behaviour spec (re-derived from the builder POC, not ported): dropping a
// block OVER a rendered layout targets the PANE under the cursor and adds the
// dragged node as a sibling on the side you're nearest. Two outcomes:
//   • FLATTEN — when the side runs ALONG the parent split's axis (drop right of a
//     block already in a row → it just joins the row).
//   • WRAP    — perpendicular (or a lone pane) → the pane is wrapped in a new
//     2-child split (so "right of a pane that lives in a vertical stack" works,
//     even though a vertical stack has no pre-existing right-seam).
// `applyPaneDrop` is the decision; `insertAtPath` is the flatten primitive. Both
// are pure/immutable and reuse the existing `dropNode` for the wrap case.

const leaf = (blockId: string, defaultSize?: number): LayoutLeaf => ({
  type: 'leaf',
  blockId,
  ...(defaultSize !== undefined ? { defaultSize } : {}),
})

const row = (): LayoutSplit => ({
  type: 'split',
  direction: 'horizontal',
  children: [leaf('list', 40), leaf('form', 60)],
})

const column = (): LayoutSplit => ({
  type: 'split',
  direction: 'vertical',
  children: [leaf('chart', 50), leaf('stats', 50)],
})

describe('insertAtPath', () => {
  it('splices a child into the root split and redistributes children to even sizes', () => {
    const next = insertAtPath(row(), [], 2, leaf('chart')) as LayoutSplit
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['list', 'form', 'chart'])
    // 3 children → 33.3% each (rounded to 1 dp), original 40/60 overwritten.
    expect(next.children.map(c => c.defaultSize)).toEqual([33.3, 33.3, 33.3])
  })

  it('inserts at the given index (front)', () => {
    const next = insertAtPath(row(), [], 0, leaf('chart')) as LayoutSplit
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['chart', 'list', 'form'])
  })

  it('clamps an out-of-range index to the end', () => {
    const next = insertAtPath(row(), [], 99, leaf('chart')) as LayoutSplit
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['list', 'form', 'chart'])
  })

  it('splices into a nested split addressed by path, leaving the spine intact', () => {
    const nestedRow: LayoutSplit = {
      type: 'split',
      direction: 'vertical',
      children: [leaf('top', 30), row()],
    }
    const next = insertAtPath(nestedRow, [1], 1, leaf('chart')) as LayoutSplit
    expect(next.direction).toBe('vertical')
    const inner = next.children[1] as LayoutSplit
    expect(inner.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['list', 'chart', 'form'])
    expect(inner.children.map(c => c.defaultSize)).toEqual([33.3, 33.3, 33.3])
    // the untouched sibling keeps its size
    expect(next.children[0]!.defaultSize).toBe(30)
  })

  it('returns a non-split root unchanged', () => {
    const lone = leaf('list')
    expect(insertAtPath(lone, [], 0, leaf('chart'))).toBe(lone)
  })

  it('is immutable — the input root is not mutated', () => {
    const root = row()
    const snapshot = JSON.stringify(root)
    insertAtPath(root, [], 1, leaf('chart'))
    expect(JSON.stringify(root)).toBe(snapshot)
  })
})

describe('applyPaneDrop', () => {
  it('FLATTENS into the row when dropping on the side along the parent axis (right of a block in a row)', () => {
    const next = applyPaneDrop(row(), { path: [1], edge: 'right' }, leaf('chart')) as LayoutSplit
    expect(next.type).toBe('split')
    expect(next.direction).toBe('horizontal')
    // joined the row after `form`; no new nesting level introduced
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['list', 'form', 'chart'])
    expect(next.children.every(c => c.type === 'leaf')).toBe(true)
  })

  it('flattens BEFORE the target when the edge is left/top', () => {
    const next = applyPaneDrop(row(), { path: [0], edge: 'left' }, leaf('chart')) as LayoutSplit
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['chart', 'list', 'form'])
  })

  it('WRAPS the pane perpendicular — right of a pane that lives in a VERTICAL stack', () => {
    // the key case the seam-only insert could never reach (no right-seam in a column)
    const next = applyPaneDrop(column(), { path: [1], edge: 'right' }, leaf('extra')) as LayoutSplit
    expect(next.direction).toBe('vertical')
    const wrapped = next.children[1] as LayoutSplit
    expect(wrapped.type).toBe('split')
    expect(wrapped.direction).toBe('horizontal')
    expect(wrapped.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['stats', 'extra'])
  })

  it('flattens into the column when the edge runs along the vertical axis (bottom of a pane in a column)', () => {
    const next = applyPaneDrop(column(), { path: [0], edge: 'bottom' }, leaf('extra')) as LayoutSplit
    expect(next.direction).toBe('vertical')
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['chart', 'extra', 'stats'])
    expect(next.children.every(c => c.type === 'leaf')).toBe(true)
  })

  it('wraps a lone leaf (path []) into a new split via dropNode', () => {
    const next = applyPaneDrop(leaf('list'), { path: [], edge: 'right' }, leaf('chart')) as LayoutSplit
    expect(next.type).toBe('split')
    expect(next.direction).toBe('horizontal')
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['list', 'chart'])
  })

  it('is immutable — the input root is not mutated', () => {
    const root = column()
    const snapshot = JSON.stringify(root)
    applyPaneDrop(root, { path: [1], edge: 'right' }, leaf('extra'))
    expect(JSON.stringify(root)).toBe(snapshot)
  })
})

describe('moveChild', () => {
  const triple = (): LayoutSplit => ({
    type: 'split',
    direction: 'horizontal',
    children: [leaf('a'), leaf('b'), leaf('c')],
  })

  it('moves a child forward, preserving the order of the rest', () => {
    const next = moveChild(triple(), [], 0, 2) as LayoutSplit
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['b', 'c', 'a'])
  })

  it('moves a child backward', () => {
    const next = moveChild(triple(), [], 2, 0) as LayoutSplit
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['c', 'a', 'b'])
  })

  it('reorders the children of a nested split addressed by path', () => {
    const root: LayoutSplit = { type: 'split', direction: 'vertical', children: [leaf('top'), triple()] }
    const next = moveChild(root, [1], 1, 0) as LayoutSplit
    const inner = next.children[1] as LayoutSplit
    expect(inner.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['b', 'a', 'c'])
  })

  it('is a no-op for from === to, out-of-range, or a non-split target', () => {
    const root = triple()
    expect(moveChild(root, [], 1, 1)).toBe(root)
    expect(moveChild(root, [], 0, 9)).toBe(root)
    expect(moveChild(root, [0], 0, 1)).toBe(root) // child 0 is a leaf
  })

  it('is immutable — the input root is not mutated', () => {
    const root = triple()
    const snapshot = JSON.stringify(root)
    moveChild(root, [], 0, 2)
    expect(JSON.stringify(root)).toBe(snapshot)
  })
})
