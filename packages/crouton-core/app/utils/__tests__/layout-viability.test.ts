import { describe, it, expect } from 'vitest'
import {
  checkLayoutViability,
  checkTreeViability,
  minWidthResolver,
} from '../layout-viability'
import type { LayoutNode, LayoutTree } from '../../types/layout'
import type { CroutonLayoutBlockRegistry } from '../../types/layout-block'

// sidebar needs 320px; main needs 480px; stats fluid (no min).
const minWidthFor = (id: string) =>
  ({ sidebar: 320, main: 480, stats: 0 } as Record<string, number>)[id] ?? 0

const masterDetail: LayoutNode = {
  type: 'split',
  direction: 'horizontal',
  children: [
    { type: 'leaf', blockId: 'sidebar', defaultSize: 25 },
    { type: 'leaf', blockId: 'main', defaultSize: 75 },
  ],
}

describe('checkLayoutViability — horizontal width distribution', () => {
  it('flags a block that falls below its minWidth at a narrow container', () => {
    // sidebar 25% of 1000 = 250 < 320 → violation; main 750 ≥ 480 → ok.
    const res = checkLayoutViability(masterDetail, minWidthFor, [1000])
    expect(res.viable).toBe(false)
    expect(res.violations).toHaveLength(1)
    expect(res.violations[0]).toMatchObject({
      blockId: 'sidebar', paneWidth: 250, minWidth: 320, containerWidth: 1000,
    })
  })

  it('is viable when the container is wide enough for every block', () => {
    // sidebar 25% of 1600 = 400 ≥ 320; main 1200 ≥ 480.
    expect(checkLayoutViability(masterDetail, minWidthFor, [1600]).viable).toBe(true)
  })

  it('aggregates violations across multiple target widths', () => {
    const res = checkLayoutViability(masterDetail, minWidthFor, [1600, 1000, 800])
    // viable at 1600; sidebar fails at 1000 (250) and 800 (200).
    expect(res.viable).toBe(false)
    expect(res.violations.map(v => v.containerWidth)).toEqual([1000, 800])
  })
})

describe('checkLayoutViability — vertical splits keep full width', () => {
  it('does not reduce width for stacked (vertical) children', () => {
    const stacked: LayoutNode = {
      type: 'split',
      direction: 'vertical',
      children: [
        { type: 'leaf', blockId: 'main', defaultSize: 30 },
        { type: 'leaf', blockId: 'main', defaultSize: 70 },
      ],
    }
    // both children get the full 600px width → both ≥ 480 → viable.
    expect(checkLayoutViability(stacked, minWidthFor, [600]).viable).toBe(true)
  })

  it('handles nested splits (master / [stats over detail])', () => {
    const nested: LayoutNode = {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'leaf', blockId: 'sidebar', defaultSize: 30 },
        {
          type: 'split', direction: 'vertical', defaultSize: 70,
          children: [
            { type: 'leaf', blockId: 'stats' },
            { type: 'leaf', blockId: 'main' },
          ],
        },
      ],
    }
    // at 1000: sidebar 300 < 320 → 1 violation; right column 700, main 700 ≥ 480 ok.
    const res = checkLayoutViability(nested, minWidthFor, [1000])
    expect(res.violations).toHaveLength(1)
    expect(res.violations[0]!.blockId).toBe('sidebar')
  })
})

describe('checkLayoutViability — edge cases', () => {
  it('treats an undeclared minWidth as fluid (never a violation)', () => {
    const onlyFluid: LayoutNode = {
      type: 'split', direction: 'horizontal',
      children: [{ type: 'leaf', blockId: 'stats', defaultSize: 5 }, { type: 'leaf', blockId: 'stats', defaultSize: 95 }],
    }
    expect(checkLayoutViability(onlyFluid, minWidthFor, [320]).viable).toBe(true)
  })

  it('falls back to equal shares when defaultSize is unset', () => {
    const equal: LayoutNode = {
      type: 'split', direction: 'horizontal',
      children: [
        { type: 'leaf', blockId: 'sidebar' },
        { type: 'leaf', blockId: 'sidebar' },
        { type: 'leaf', blockId: 'sidebar' },
      ],
    }
    // 900 / 3 = 300 each < 320 → 3 violations.
    expect(checkLayoutViability(equal, minWidthFor, [900]).violations).toHaveLength(3)
  })

  it('a single leaf root gets the whole container', () => {
    const leaf: LayoutNode = { type: 'leaf', blockId: 'main' }
    expect(checkLayoutViability(leaf, minWidthFor, [500]).viable).toBe(true)
    expect(checkLayoutViability(leaf, minWidthFor, [400]).viable).toBe(false)
  })
})

describe('minWidthResolver + checkTreeViability', () => {
  const registry: CroutonLayoutBlockRegistry = {
    sidebar: { id: 'sidebar', name: '', description: '', icon: '', component: 'X', minWidth: 320 },
    main: { id: 'main', name: '', description: '', icon: '', component: 'Y' },
  }

  it('resolves minWidth from a registry (undeclared → 0)', () => {
    const r = minWidthResolver(registry)
    expect(r('sidebar')).toBe(320)
    expect(r('main')).toBe(0)
    expect(r('ghost')).toBe(0)
  })

  it('checks a full LayoutTree via its root', () => {
    const tree: LayoutTree = { renderer: 'panes', root: masterDetail }
    const res = checkTreeViability(tree, minWidthResolver(registry), [1000])
    expect(res.viable).toBe(false)
    expect(res.violations[0]!.blockId).toBe('sidebar')
  })
})
