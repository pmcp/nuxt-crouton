import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LayoutEditableRenderer from '../LayoutEditableRenderer.vue'
import type { LayoutSplit, LayoutLeaf } from '@fyit/crouton-core/app/types/layout'

/**
 * Live component test (#985): mount the REAL editable renderer and drive a genuine
 * grip drag (down → move → up) through its own handlers, asserting it owns its pane
 * handles — each pane tagged with a stable id, a cross-card drag reorders in place,
 * a pull past the margin emits a detach. happy-dom's getBoundingClientRect is the
 * zero rect, so the card box is empty: a small move stays "inside" (reorder), a large
 * one reads as "outside the margin" (detach), and slotAt clamps to the last slot.
 */
const triSplit = (): LayoutSplit => ({
  type: 'split',
  direction: 'horizontal',
  children: [{ type: 'leaf', blockId: 'a' }, { type: 'leaf', blockId: 'b' }, { type: 'leaf', blockId: 'c' }],
})

function mountR(node: LayoutSplit | LayoutLeaf) {
  return mount(LayoutEditableRenderer, {
    props: { node },
    global: { stubs: { CroutonLayoutRenderer: true } },
  })
}

describe('CroutonLayoutEditableRenderer — renderer-owned pane handles', () => {
  it('tags every pane with a stable data-pane-id (no overlay to measure)', () => {
    const w = mountR(triSplit())
    const ids = w.findAll('[data-pane-id]').map(el => el.attributes('data-pane-id'))
    expect(ids).toContain('root')
    expect(ids).toContain('0')
    expect(ids).toContain('1')
    expect(ids).toContain('2')
  })

  it('reorders a pane in place when dragged across to another slot (emits update:node)', async () => {
    const w = mountR(triSplit())
    const grip = w.findAll('.cl-grip')[0]!
    await grip.trigger('pointerdown', { clientX: 0, clientY: 0, button: 0, pointerId: 1 })
    await grip.trigger('pointermove', { clientX: 10, clientY: 10 }) // within the 64px detach margin
    await grip.trigger('pointerup')

    const emits = w.emitted('update:node')
    expect(emits).toBeTruthy()
    const next = emits!.at(-1)![0] as LayoutSplit
    // zero rects → slotAt clamps to the last slot → pane 0 moves to the end
    expect(next.children.map(c => (c as LayoutLeaf).blockId)).toEqual(['b', 'c', 'a'])
    expect(w.emitted('detach')).toBeFalsy()
  })

  it('detaches a pane pulled out past the margin (emits detach with its path + node, no in-place mutation)', async () => {
    const w = mountR(triSplit())
    const grip = w.findAll('.cl-grip')[1]!
    await grip.trigger('pointerdown', { clientX: 0, clientY: 0, button: 0, pointerId: 1 })
    await grip.trigger('pointermove', { clientX: 300, clientY: 0 }) // way past the margin
    await grip.trigger('pointerup')

    const emits = w.emitted('detach')
    expect(emits).toBeTruthy()
    const payload = emits!.at(-1)![0] as { path: number[], node: LayoutLeaf }
    expect(payload.path).toEqual([1])
    expect(payload.node.blockId).toBe('b')
    expect(w.emitted('update:node')).toBeFalsy() // detach is the host's placement, not an in-place edit
  })

  it('renders editable=false with no grips (identical surface to the read-only renderer)', () => {
    const w = mount(LayoutEditableRenderer, {
      props: { node: triSplit(), editable: false },
      global: { stubs: { CroutonLayoutRenderer: true } },
    })
    expect(w.findAll('.cl-grip')).toHaveLength(0)
  })

  it('renders a lone leaf root as a single pane with nothing to detach', () => {
    const w = mountR({ type: 'leaf', blockId: 'solo' })
    expect(w.find('.is-single').exists()).toBe(true)
    expect(w.findAll('.cl-grip')).toHaveLength(0)
  })
})
