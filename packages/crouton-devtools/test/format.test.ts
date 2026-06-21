import { describe, it, expect } from 'vitest'
import { formatReviewComment, type ReviewAnnotation } from '../src/runtime/overlay/capture'

const base: ReviewAnnotation = {
  route: '/teams/acme/products',
  cssSelector: '.crouton-card > .title',
  componentFile: 'packages/crouton-core/app/components/DefaultCard.vue',
  boundingBox: { x: 412, y: 118, width: 180, height: 24 },
  commentText: 'truncate the title at 2 lines',
  createdAt: '2026-06-20T00:00:00.000Z'
}

describe('formatReviewComment', () => {
  it('renders the agent-readable contract (header + component + page + comment)', () => {
    const md = formatReviewComment(base)
    expect(md).toContain('🎯 **Preview feedback**')
    expect(md).toContain('`packages/crouton-core/app/components/DefaultCard.vue`')
    expect(md).toContain('`.crouton-card > .title`')
    expect(md).toContain('bbox 412,118 180×24')
    expect(md).toContain('/teams/acme/products')
    expect(md).toContain('> truncate the title at 2 lines')
  })

  it('falls back to "unknown" when no source file resolved', () => {
    const md = formatReviewComment({ ...base, componentFile: null })
    expect(md).toContain('**Component:** _unknown_')
  })

  it('quotes multi-line comments as a blockquote', () => {
    const md = formatReviewComment({ ...base, commentText: 'line one\nline two' })
    expect(md).toContain('> line one\n> line two')
  })
})
