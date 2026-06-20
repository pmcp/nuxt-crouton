/**
 * Pure capture helpers for the preview-review overlay (epic #488, #489).
 *
 * Kept DOM-pure (no overlay/plugin glue) so they're unit-testable under happy-dom.
 * They turn a clicked element + comment into the structured `ReviewAnnotation`
 * payload that #491 will post to GitHub as a PR review comment.
 */

export interface ReviewAnnotationBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ReviewAnnotation {
  /** Page the comment was left on (location.pathname). */
  route: string
  /** A reasonably-unique CSS selector for the clicked element. */
  cssSelector: string
  /** Owning source file from the nearest `data-crouton-src` ancestor (#490), if any. */
  componentFile: string | null
  /** Viewport-relative bounds of the clicked element. */
  boundingBox: ReviewAnnotationBox
  /** What the reviewer typed. */
  commentText: string
  /** ISO timestamp. */
  createdAt: string
}

/**
 * Walk up the DOM to the nearest `data-crouton-src` (stamped at build time by the
 * #490 transform) so a click resolves to the source file an agent should edit.
 */
export function componentFileFor(el: Element | null): string | null {
  let node: Element | null = el
  while (node) {
    const src = node.getAttribute?.('data-crouton-src')
    if (src) return src
    node = node.parentElement
  }
  return null
}

/** Build a short, reasonably-unique selector path for an element. */
export function cssSelectorFor(el: Element): string {
  if (el.id) return `#${el.id}`

  const parts: string[] = []
  let node: Element | null = el
  while (node && node.nodeType === 1 && node.tagName !== 'BODY' && node.tagName !== 'HTML') {
    if (node.id) {
      parts.unshift(`#${node.id}`)
      break
    }
    let part = node.tagName.toLowerCase()
    const parent: Element | null = node.parentElement
    if (parent) {
      const current = node
      const sameTag = Array.from(parent.children).filter(c => c.tagName === current.tagName)
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`
    }
    parts.unshift(part)
    if (parts.length >= 6) break
    node = parent
  }
  return parts.join(' > ')
}

/** Viewport-relative bounds, rounded to whole pixels. */
export function boundingBoxFor(el: Element): ReviewAnnotationBox {
  const r = el.getBoundingClientRect()
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: Math.round(r.width),
    height: Math.round(r.height)
  }
}

/** Assemble the full annotation payload from a clicked element. */
export function buildAnnotation(el: Element, commentText: string, route: string): ReviewAnnotation {
  return {
    route,
    cssSelector: cssSelectorFor(el),
    componentFile: componentFileFor(el),
    boundingBox: boundingBoxFor(el),
    commentText,
    createdAt: new Date().toISOString()
  }
}
