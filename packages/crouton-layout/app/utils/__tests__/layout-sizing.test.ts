/**
 * #986 typed component contract (graduation WS3) — the sizing descriptor (fill/hug)
 * + composite derivation (`deriveSizing`) + first-class variants. Test-first (#774).
 *
 * Re-scoped after surveying the packages (graduate step 0): the sizing px CONTRACT
 * + `subtreeMinWidth` (== the soft floor) + variant machinery already existed; this
 * unit adds the fill/hug descriptor, the HARD floor, and the typed fields. The
 * renderer "hug INSIDE a split" is deferred to the UI gate (it's visual).
 */
import { describe, it, expect } from 'vitest'
import type { CroutonLayoutBlockRegistry } from '@fyit/crouton-core/app/types/layout-block'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'
import {
  minWidthResolver,
  subtreeMinWidth,
  sizingResolver,
  deriveSizing,
  blockVariants,
  resolveVariant,
  DEFAULT_BLOCK_SIZING,
} from '../layout-viability'

const registry = {
  list:   { id: 'list', name: 'List', description: '', icon: '', component: 'L', minWidth: 200, sizing: { width: 'fill', height: 'fill' }, variants: ['rows', 'cards', 'table'] },
  stat:   { id: 'stat', name: 'Stat', description: '', icon: '', component: 'S', minWidth: 120 },
  form:   { id: 'form', name: 'Form', description: '', icon: '', component: 'F', minWidth: 260 },
  topbar: { id: 'topbar', name: 'Top', description: '', icon: '', component: 'T', minWidth: 80, sizing: { width: 'fill', height: 'hug' } },
} as unknown as CroutonLayoutBlockRegistry

const leaf = (blockId: string): LayoutNode => ({ type: 'leaf', blockId })

describe('#986 sizingResolver — a block declares fill/hug (default fill)', () => {
  it('returns the declared descriptor', () => {
    expect(sizingResolver(registry)('topbar')).toEqual({ width: 'fill', height: 'hug' })
  })
  it('defaults an undeclared block to fully fill', () => {
    expect(sizingResolver(registry)('stat')).toEqual(DEFAULT_BLOCK_SIZING)
    expect(DEFAULT_BLOCK_SIZING).toEqual({ width: 'fill', height: 'fill' })
  })
  it('narrows a widened/tampered value to the enum (default fill)', () => {
    const dirty = { x: { id: 'x', name: '', description: '', icon: '', component: 'X', sizing: { width: 'WAT', height: 'hug' } } } as unknown as CroutonLayoutBlockRegistry
    expect(sizingResolver(dirty)('x')).toEqual({ width: 'fill', height: 'hug' })
  })
})

describe('#986 deriveSizing — a leaf declares, a composite derives (component-driven, all the way up)', () => {
  const mw = minWidthResolver(registry)

  it('a leaf reports its own min + declared fill/hug', () => {
    expect(deriveSizing(leaf('topbar'), registry)).toEqual({ hardMinWidth: 80, softMinWidth: 80, minHeight: 0, width: 'fill', height: 'hug' })
  })

  it('a horizontal split: soft = SUM of children, hard = widest single child, always fill', () => {
    const row: LayoutNode = { type: 'split', direction: 'horizontal', children: [leaf('list'), leaf('stat'), leaf('form')] }
    const d = deriveSizing(row, registry)
    expect(d.softMinWidth).toBe(200 + 120 + 260)
    expect(d.hardMinWidth).toBe(260)
    expect(d).toMatchObject({ width: 'fill', height: 'fill' })
  })

  it('a vertical split: soft = MAX across, hard = MAX across (a column needs its widest leaf)', () => {
    const col: LayoutNode = { type: 'split', direction: 'vertical', children: [leaf('list'), leaf('form')] }
    const d = deriveSizing(col, registry)
    expect(d.softMinWidth).toBe(260)
    expect(d.hardMinWidth).toBe(260)
  })

  it('hard floor is the widest single leaf ANYWHERE in a nested subtree', () => {
    const tree: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      leaf('stat'),
      { type: 'split', direction: 'vertical', children: [leaf('list'), leaf('form')] },
    ] }
    expect(deriveSizing(tree, registry).hardMinWidth).toBe(260)
    expect(deriveSizing(tree, registry).softMinWidth).toBe(120 + 260)
  })

  it('a nested node derives from its sub-layout root', () => {
    const nested: LayoutNode = { type: 'nested', layout: { renderer: 'panes', root: leaf('form') } }
    expect(deriveSizing(nested, registry)).toMatchObject({ hardMinWidth: 260, softMinWidth: 260 })
  })

  it('hard floor never exceeds soft floor (a column reflow is always ≤ the row)', () => {
    const row: LayoutNode = { type: 'split', direction: 'horizontal', children: [leaf('list'), leaf('form')] }
    const d = deriveSizing(row, registry)
    expect(d.hardMinWidth).toBeLessThanOrEqual(d.softMinWidth)
  })

  it('ANTI-DRIFT: softMinWidth == the existing subtreeMinWidth (we reuse it)', () => {
    const row: LayoutNode = { type: 'split', direction: 'horizontal', children: [leaf('list'), leaf('stat'), leaf('form')] }
    expect(deriveSizing(row, registry).softMinWidth).toBe(subtreeMinWidth(row, mw))
  })

  it('minHeight mirrors width with axes swapped (sum vertical, max horizontal)', () => {
    const tall = { a: { id: 'a', name: '', description: '', icon: '', component: 'A', minHeight: 100 }, b: { id: 'b', name: '', description: '', icon: '', component: 'B', minHeight: 40 } } as unknown as CroutonLayoutBlockRegistry
    const col: LayoutNode = { type: 'split', direction: 'vertical', children: [leaf('a'), leaf('b')] }
    const row: LayoutNode = { type: 'split', direction: 'horizontal', children: [leaf('a'), leaf('b')] }
    expect(deriveSizing(col, tall).minHeight).toBe(140)
    expect(deriveSizing(row, tall).minHeight).toBe(100)
  })
})

describe('#986 variants — first-class bounded option list (parallel to configSchema)', () => {
  it('reads a block declared variant list', () => {
    expect(blockVariants(registry, 'list')).toEqual(['rows', 'cards', 'table'])
    expect(blockVariants(registry, 'stat')).toEqual([])
  })
  it('resolveVariant keeps a valid value, drops an unknown one to the first/undefined', () => {
    expect(resolveVariant(registry, 'list', 'cards')).toBe('cards')
    expect(resolveVariant(registry, 'list', 'bogus')).toBe('rows')
    expect(resolveVariant(registry, 'stat', 'whatever')).toBeUndefined()
  })
})
