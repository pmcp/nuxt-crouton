// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  componentFileFor,
  cssSelectorFor,
  buildAnnotation,
  formatAnnotationMarkdown,
  type Annotation
} from '../src/runtime/overlay/capture'

describe('overlay capture helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('walks up to the nearest data-feedback-src stamp', () => {
    document.body.innerHTML
      = `<div data-feedback-src="app/components/Card.vue"><section><span id="t">hi</span></section></div>`
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
      = `<div data-feedback-src="app/X.vue"><button id="b">go</button></div>`
    const a = buildAnnotation(document.getElementById('b')!, 'make it bigger', '/teams/acme/products')
    expect(a).toMatchObject({
      route: '/teams/acme/products',
      componentFile: 'app/X.vue',
      commentText: 'make it bigger'
    })
    expect(a.boundingBox).toHaveProperty('width')
    expect(typeof a.createdAt).toBe('string')
  })

  it('renders the agent-readable Markdown contract', () => {
    const a: Annotation = {
      route: '/teams/acme/products',
      cssSelector: '#b',
      componentFile: 'app/X.vue',
      boundingBox: { x: 1, y: 2, width: 3, height: 4 },
      commentText: 'make it\nbigger',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
    const md = formatAnnotationMarkdown(a)
    expect(md).toContain('🎯 **Preview feedback**')
    expect(md).toContain('**Component:** `app/X.vue`')
    expect(md).toContain('**Page:** `/teams/acme/products`')
    // multi-line comment is quoted on every line
    expect(md).toContain('> make it\n> bigger')
  })

  it('marks the component _unknown_ when unstamped', () => {
    const a: Annotation = {
      route: '/x', cssSelector: 'div', componentFile: null,
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      commentText: 'hi', createdAt: 't'
    }
    expect(formatAnnotationMarkdown(a)).toContain('**Component:** _unknown_')
  })
})
