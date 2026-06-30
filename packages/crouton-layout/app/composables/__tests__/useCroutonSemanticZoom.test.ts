import { describe, it, expect } from 'vitest'
import { useCroutonSemanticZoom } from '../useCroutonSemanticZoom'
import { makeNested } from '../../utils/layout-edit'
import type { LayoutTree } from '@fyit/crouton-core/app/types/layout'

// An app-layout (what a `nested` node hosts).
const calendarApp: LayoutTree = {
  renderer: 'panes',
  root: { type: 'split', direction: 'horizontal', children: [
    { type: 'leaf', blockId: 'calendar' },
    { type: 'leaf', blockId: 'detail' },
  ] },
}

// A page-layout whose first pane is a nested app (layouts in layouts).
const bookingsPage: LayoutTree = {
  renderer: 'panes',
  root: { type: 'split', direction: 'horizontal', children: [
    makeNested(calendarApp, 'Calendar'),
    { type: 'leaf', blockId: 'stats' },
  ] },
}

describe('useCroutonSemanticZoom — starts at the Site root', () => {
  it('begins on the site frame with an empty breadcrumb tail', () => {
    const z = useCroutonSemanticZoom()
    expect(z.current.value.level).toBe('site')
    expect(z.depth.value).toBe(0)
    expect(z.canZoomOut.value).toBe(false)
    expect(z.breadcrumb.value).toEqual([{ label: 'Site', index: 0, level: 'site' }])
  })

  it('honours a custom site label', () => {
    const z = useCroutonSemanticZoom({ siteLabel: 'friendlyinter.net' })
    expect(z.current.value.label).toBe('friendlyinter.net')
  })
})

describe('useCroutonSemanticZoom — Site → Page → App by zoom alone', () => {
  it('zooms Site → Page into a page layout', () => {
    const z = useCroutonSemanticZoom()
    expect(z.zoomIntoPage('Bookings', bookingsPage)).toBe(true)
    expect(z.current.value).toMatchObject({ level: 'layout', label: 'Bookings', tree: bookingsPage })
    expect(z.depth.value).toBe(1)
    expect(z.breadcrumb.value.map(c => c.label)).toEqual(['Site', 'Bookings'])
  })

  it('zooms Page → App by descending into a nested node (its own sub-layout)', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    expect(z.zoomIntoNested([0])).toBe(true) // child 0 is the nested Calendar app
    expect(z.current.value).toMatchObject({ level: 'layout', label: 'Calendar', tree: calendarApp })
    expect(z.breadcrumb.value.map(c => c.label)).toEqual(['Site', 'Bookings', 'Calendar'])
  })

  it('labels a nested app "App" when it carries no label', () => {
    const page: LayoutTree = { renderer: 'panes', root: makeNested(calendarApp) }
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Page', page)
    z.zoomIntoNested([])
    expect(z.current.value.label).toBe('App')
  })

  it('zooms into the breakpoints level for the focused layout', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    expect(z.zoomIntoBreakpoints()).toBe(true)
    expect(z.current.value).toMatchObject({ level: 'breakpoints', label: 'Responsive', tree: bookingsPage })
  })
})

describe('useCroutonSemanticZoom — invalid zooms are no-ops', () => {
  it('zoomIntoPage only works from the Site level', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    expect(z.zoomIntoPage('Menu', bookingsPage)).toBe(false) // already in a layout
    expect(z.depth.value).toBe(1)
  })

  it('zoomIntoNested no-ops off the site frame or off a non-nested path', () => {
    const z = useCroutonSemanticZoom()
    expect(z.zoomIntoNested([0])).toBe(false) // on Site, no layout
    z.zoomIntoPage('Bookings', bookingsPage)
    expect(z.zoomIntoNested([1])).toBe(false) // child 1 is a leaf, not nested
    expect(z.zoomIntoNested([9])).toBe(false) // out of range
    expect(z.depth.value).toBe(1)
  })

  it('zoomIntoBreakpoints no-ops on the site frame', () => {
    const z = useCroutonSemanticZoom()
    expect(z.zoomIntoBreakpoints()).toBe(false)
  })
})

describe('useCroutonSemanticZoom — setCurrentTree shares one tree across levels (#899)', () => {
  const edited: LayoutTree = {
    renderer: 'panes',
    root: { type: 'split', direction: 'horizontal', children: [{ type: 'leaf', blockId: 'merged' }] },
  }

  it('no-ops on the Site frame (nothing to edit)', () => {
    const z = useCroutonSemanticZoom()
    expect(z.setCurrentTree(edited)).toBe(false)
  })

  it('replaces the focused layout tree without moving the breadcrumb', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    expect(z.setCurrentTree(edited)).toBe(true)
    expect(z.current.value.tree).toEqual(edited)
    expect(z.current.value.level).toBe('layout')
    expect(z.depth.value).toBe(1) // no push/pop — a re-seed keyed on depth won't refire
  })

  it('a breakpoints edit propagates DOWN to the layout it authors', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    z.zoomIntoBreakpoints()
    z.setCurrentTree(edited)
    // both the breakpoints frame and the layout frame below now hold the edit
    expect(z.current.value.tree).toEqual(edited)
    z.zoomOut()
    expect(z.current.value).toMatchObject({ level: 'layout', tree: edited })
  })

  it('a nested-app edit folds back into the parent page (zoom out shows it)', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage) // child 0 = nested Calendar app
    z.zoomIntoNested([0])
    const newApp: LayoutTree = { renderer: 'panes', root: { type: 'leaf', blockId: 'calendar-only' } }
    z.setCurrentTree(newApp)
    z.zoomOut() // back to the page
    const root = z.current.value.tree!.root
    expect(root.type).toBe('split')
    if (root.type === 'split') {
      const nested = root.children[0]
      expect(nested?.type).toBe('nested')
      if (nested?.type === 'nested') expect(nested.layout).toEqual(newApp)
    }
  })
})

describe('useCroutonSemanticZoom — zoom out / jump / reset', () => {
  it('zooms out one level and reports when it cannot', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    z.zoomIntoNested([0])
    expect(z.depth.value).toBe(2)
    expect(z.zoomOut()).toBe(true)
    expect(z.current.value.label).toBe('Bookings')
    expect(z.zoomOut()).toBe(true)
    expect(z.current.value.level).toBe('site')
    expect(z.zoomOut()).toBe(false) // already at root
  })

  it('jumps straight to a breadcrumb level', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    z.zoomIntoNested([0])
    expect(z.jumpTo(0)).toBe(true) // back to Site
    expect(z.current.value.level).toBe('site')
    expect(z.depth.value).toBe(0)
  })

  it('jumpTo is a no-op for the current level or an invalid index', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    expect(z.jumpTo(1)).toBe(false) // current level (last)
    expect(z.jumpTo(-1)).toBe(false)
    expect(z.jumpTo(5)).toBe(false)
  })

  it('reset returns to the Site root from any depth', () => {
    const z = useCroutonSemanticZoom()
    z.zoomIntoPage('Bookings', bookingsPage)
    z.zoomIntoNested([0])
    z.reset()
    expect(z.current.value.level).toBe('site')
    expect(z.depth.value).toBe(0)
  })
})
