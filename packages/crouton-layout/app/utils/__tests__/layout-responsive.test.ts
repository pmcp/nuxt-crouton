import { describe, it, expect } from 'vitest'
import {
  resolveLayoutAtWidth,
  partitionCollapsed,
  patchBreakpoint,
  removeBreakpoint,
  toggleCollapsed,
  setVariant,
  listBlocks,
} from '../layout-responsive'
import type { LayoutLeaf, LayoutNode, LayoutSplit, LayoutTree } from '@fyit/crouton-core/app/types/layout'

const leaf = (blockId: string, extra: Partial<LayoutLeaf> = {}): LayoutLeaf => ({ type: 'leaf', blockId, ...extra })

function masterDetail(): LayoutSplit {
  return {
    type: 'split',
    direction: 'horizontal',
    children: [leaf('list', { defaultSize: 40 }), leaf('form', { defaultSize: 60 })],
  }
}

function tree(over: Partial<LayoutTree> = {}): LayoutTree {
  return { renderer: 'panes', root: masterDetail(), ...over }
}

describe('resolveLayoutAtWidth — base / no breakpoints', () => {
  it('returns the base root with empty dials and no active breakpoint', () => {
    const t = tree()
    const r = resolveLayoutAtWidth(t, 1280)
    expect(r.root).toBe(t.root)
    expect(r.collapsed).toEqual([])
    expect(r.variants).toEqual({})
    expect(r.activeBreakpoint).toBeNull()
  })

  it('treats an empty breakpoints array as no breakpoints', () => {
    const r = resolveLayoutAtWidth(tree({ breakpoints: [] }), 320)
    expect(r.activeBreakpoint).toBeNull()
    expect(r.collapsed).toEqual([])
  })
})

describe('resolveLayoutAtWidth — min-width locks upward', () => {
  const t = tree({
    breakpoints: [{ minWidth: 768, label: 'Tablet', collapsed: ['list'] }],
  })

  it('below the checkpoint, the base holds', () => {
    const r = resolveLayoutAtWidth(t, 767)
    expect(r.collapsed).toEqual([])
    expect(r.activeBreakpoint).toBeNull()
  })

  it('exactly at the checkpoint, the breakpoint is active (inclusive)', () => {
    const r = resolveLayoutAtWidth(t, 768)
    expect(r.collapsed).toEqual(['list'])
    expect(r.activeBreakpoint).toBe(768)
  })

  it('above the checkpoint, the breakpoint still applies (locks upward)', () => {
    const r = resolveLayoutAtWidth(t, 1440)
    expect(r.collapsed).toEqual(['list'])
    expect(r.activeBreakpoint).toBe(768)
  })
})

describe('resolveLayoutAtWidth — per-field last-wins cascade', () => {
  // collapsed authored at 600, variants authored at 1024 — independent fields.
  const t = tree({
    breakpoints: [
      { minWidth: 600, collapsed: ['list'] },
      { minWidth: 1024, variants: { form: 'compact' } },
    ],
  })

  it('between the two, only the lower field applies', () => {
    const r = resolveLayoutAtWidth(t, 800)
    expect(r.collapsed).toEqual(['list'])
    expect(r.variants).toEqual({})
    expect(r.activeBreakpoint).toBe(600)
  })

  it('above both, each field takes its own largest definer', () => {
    const r = resolveLayoutAtWidth(t, 1280)
    expect(r.collapsed).toEqual(['list']) // inherited from 600 (1024 doesn't redefine it)
    expect(r.variants).toEqual({ form: 'compact' })
    expect(r.activeBreakpoint).toBe(1024) // the largest active checkpoint overall
  })

  it('a later breakpoint that redefines a field fully replaces it (snapshot, not merge)', () => {
    const t2 = tree({
      breakpoints: [
        { minWidth: 600, collapsed: ['list', 'form'] },
        { minWidth: 1024, collapsed: [] }, // explicitly nothing collapsed at desktop
      ],
    })
    expect(resolveLayoutAtWidth(t2, 800).collapsed).toEqual(['list', 'form'])
    expect(resolveLayoutAtWidth(t2, 1280).collapsed).toEqual([])
  })
})

describe('resolveLayoutAtWidth — arrangement (root) override', () => {
  const stacked: LayoutSplit = {
    type: 'split',
    direction: 'vertical',
    children: [leaf('list'), leaf('form')],
  }
  const t = tree({ breakpoints: [{ minWidth: 1024, root: stacked }] })

  it('uses the base root below the checkpoint', () => {
    expect(resolveLayoutAtWidth(t, 800).root).toBe(t.root)
  })

  it('swaps in the breakpoint root at/above the checkpoint', () => {
    expect(resolveLayoutAtWidth(t, 1280).root).toBe(stacked)
  })
})

describe('resolveLayoutAtWidth — robustness', () => {
  it('sorts unsorted breakpoints correctly', () => {
    const t = tree({
      breakpoints: [
        { minWidth: 1024, collapsed: ['a'] },
        { minWidth: 480, collapsed: ['b'] },
      ],
    })
    expect(resolveLayoutAtWidth(t, 1280).collapsed).toEqual(['a'])
    expect(resolveLayoutAtWidth(t, 500).collapsed).toEqual(['b'])
  })

  it('clamps a negative / non-finite width to 0 (base)', () => {
    const t = tree({ breakpoints: [{ minWidth: 1, collapsed: ['x'] }] })
    expect(resolveLayoutAtWidth(t, -100).activeBreakpoint).toBeNull()
    expect(resolveLayoutAtWidth(t, Number.NaN).activeBreakpoint).toBeNull()
  })

  it('collapseStyle resolves to the largest definer', () => {
    const t = tree({
      breakpoints: [
        { minWidth: 600, collapseStyle: 'spring-drawer' },
        { minWidth: 1024, collapseStyle: 'gutter-tabs' },
      ],
    })
    expect(resolveLayoutAtWidth(t, 800).collapseStyle).toBe('spring-drawer')
    expect(resolveLayoutAtWidth(t, 1280).collapseStyle).toBe('gutter-tabs')
  })
})

describe('partitionCollapsed', () => {
  it('splits visible panes from collapsed leaves (gutter rail)', () => {
    const root = masterDetail()
    const { visible, collapsed } = partitionCollapsed(root, ['list'])
    expect(collapsed).toEqual([{ blockId: 'list' }])
    // The surviving single child collapses up into a bare leaf.
    expect(visible).toMatchObject({ type: 'leaf', blockId: 'form' })
  })

  it('returns the tree untouched when nothing is collapsed', () => {
    const root = masterDetail()
    const { visible, collapsed } = partitionCollapsed(root, [])
    expect(visible).toBe(root)
    expect(collapsed).toEqual([])
  })

  it('yields a null visible tree when every block is collapsed', () => {
    const root = masterDetail()
    const { visible, collapsed } = partitionCollapsed(root, ['list', 'form'])
    expect(visible).toBeNull()
    expect(collapsed.map(c => c.blockId).sort()).toEqual(['form', 'list'])
  })

  it('recurses into nested sub-layouts to find collapsed blocks', () => {
    const nestedRoot: LayoutNode = {
      type: 'split',
      direction: 'horizontal',
      children: [
        leaf('keep'),
        { type: 'nested', label: 'App', layout: { renderer: 'panes', root: leaf('inner') } },
      ],
    }
    const { collapsed } = partitionCollapsed(nestedRoot, ['inner'])
    expect(collapsed).toEqual([{ blockId: 'inner', label: 'App' }])
  })
})

describe('authoring transforms', () => {
  it('patchBreakpoint creates a sorted checkpoint, then merges into it', () => {
    const t0 = tree()
    const t1 = patchBreakpoint(t0, 768, { collapsed: ['list'] })
    expect(t1.breakpoints).toEqual([{ minWidth: 768, collapsed: ['list'] }])
    expect(t0.breakpoints).toBeUndefined() // immutable

    const t2 = patchBreakpoint(t1, 480, { variants: { list: 'cards' } })
    expect(t2.breakpoints?.map(b => b.minWidth)).toEqual([480, 768]) // sorted

    const t3 = patchBreakpoint(t2, 768, { variants: { form: 'compact' } })
    expect(t3.breakpoints?.find(b => b.minWidth === 768)).toEqual({
      minWidth: 768, collapsed: ['list'], variants: { form: 'compact' },
    })
  })

  it('removeBreakpoint drops one, and omits the field when none remain', () => {
    const t = patchBreakpoint(patchBreakpoint(tree(), 768, {}), 1024, {})
    expect(removeBreakpoint(t, 768).breakpoints?.map(b => b.minWidth)).toEqual([1024])
    const empty = removeBreakpoint(patchBreakpoint(tree(), 768, {}), 768)
    expect('breakpoints' in empty).toBe(false)
  })

  it('toggleCollapsed adds then removes a block at a checkpoint', () => {
    const on = toggleCollapsed(tree(), 768, 'list')
    expect(on.breakpoints?.[0]?.collapsed).toEqual(['list'])
    const off = toggleCollapsed(on, 768, 'list')
    expect(off.breakpoints?.[0]?.collapsed).toEqual([])
  })

  it('setVariant sets and clears a block variant at a checkpoint', () => {
    const set = setVariant(tree(), 1024, 'list', 'cards')
    expect(set.breakpoints?.[0]?.variants).toEqual({ list: 'cards' })
    const cleared = setVariant(set, 1024, 'list', '')
    expect(cleared.breakpoints?.[0]?.variants).toEqual({})
  })

  it('listBlocks collects placed blocks, threading the nested app label', () => {
    const root: LayoutNode = {
      type: 'split',
      direction: 'horizontal',
      children: [
        leaf('list'),
        { type: 'nested', label: 'Bookings', layout: { renderer: 'panes', root: leaf('calendar') } },
      ],
    }
    expect(listBlocks(root)).toEqual([
      { blockId: 'list' },
      { blockId: 'calendar', label: 'Bookings' },
    ])
  })
})
