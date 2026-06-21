// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  componentFileFor,
  cssSelectorFor,
  buildAnnotation
} from '../src/runtime/overlay/capture'

describe('overlay capture helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('walks up to the nearest data-crouton-src (the #490 stamp)', () => {
    document.body.innerHTML
      = `<div data-crouton-src="app/components/Card.vue"><section><span id="t">hi</span></section></div>`
    expect(componentFileFor(document.getElementById('t'))).toBe('app/components/Card.vue')
  })

  it('returns null when no ancestor is stamped', () => {
    document.body.innerHTML = `<div><span id="t">hi</span></div>`
    expect(componentFileFor(document.getElementById('t'))).toBeNull()
  })

  it('prefers an id selector when present', () => {
    document.body.innerHTML = `<div><button id="go">x</button></div>`
    expect(cssSelectorFor(document.getElementById('go')!)).toBe('#go')
  })

  it('builds an nth-of-type selector that re-finds the element', () => {
    document.body.innerHTML = `<ul><li>a</li><li>b</li><li>c</li></ul>`
    const third = document.querySelectorAll('li')[2]!
    const sel = cssSelectorFor(third)
    expect(sel).toContain('nth-of-type(3)')
    expect(document.querySelector(sel)).toBe(third)
  })

  it('assembles a full annotation payload', () => {
    document.body.innerHTML
      = `<div data-crouton-src="app/X.vue"><button id="b">go</button></div>`
    const a = buildAnnotation(document.getElementById('b')!, 'make it bigger', '/teams/acme/products')
    expect(a).toMatchObject({
      route: '/teams/acme/products',
      componentFile: 'app/X.vue',
      commentText: 'make it bigger'
    })
    expect(a.boundingBox).toHaveProperty('width')
    expect(typeof a.createdAt).toBe('string')
  })
})
