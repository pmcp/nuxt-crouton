/**
 * #974 round-trip the LayoutTree onto the GitHub ticket — the pure codec between a
 * GitHub COMMENT BODY and a `LayoutDocument` (the agent⇄human seat). Test-first (#774).
 *
 * Built on #987's serialize/parseLayoutDocument (canonical + sanitising). The actual
 * "post to the issue" is app/agent integration on top; this unit is the pure codec.
 */
import { describe, it, expect } from 'vitest'
import type { LayoutDocument } from '../layout-serialize'
import { serializeLayoutDocument } from '../layout-serialize'
import {
  LAYOUT_COMMENT_MARKER,
  formatLayoutComment,
  extractLayoutDocument,
  latestLayoutDocument,
} from '../layout-ticket'

const doc: LayoutDocument = {
  version: 1,
  pages: [
    { id: 'p_dashboard', name: 'Dashboard', path: '/dashboard', isHome: true,
      tree: { renderer: 'panes', root: { type: 'leaf', blockId: 'artists-list' } } },
    { id: 'p_reports', name: 'Reports', path: '/reports', parentId: 'p_dashboard',
      tree: { renderer: 'panes', root: { type: 'leaf', blockId: 'revenue-stat' } } },
  ],
}

describe('#974 formatLayoutComment / extractLayoutDocument — the ticket codec', () => {
  it('1. round-trips through a comment body losslessly', () => {
    expect(extractLayoutDocument(formatLayoutComment(doc))).toEqual(doc)
  })

  it('2. embeds a human summary + the marker + a fenced json of the CANONICAL doc', () => {
    const body = formatLayoutComment(doc)
    expect(body).toContain(LAYOUT_COMMENT_MARKER)
    expect(body).toContain('```json')
    expect(body).toContain('2')
    expect(body).toContain('Dashboard')
    expect(body).toContain(serializeLayoutDocument(doc))
  })

  it('3. extracts the spec even with human prose wrapped around it', () => {
    const body = `Looks good but move Reports under Settings 🙏\n\n${formatLayoutComment(doc)}\n\n— thanks!`
    expect(extractLayoutDocument(body)).toEqual(doc)
  })

  it('4. returns null when the marker is absent or the json is malformed', () => {
    expect(extractLayoutDocument('just a normal comment, no spec here')).toBeNull()
    expect(extractLayoutDocument('```json\n{"version":1,"pages":[]}\n```')).toBeNull()
    expect(extractLayoutDocument(`${LAYOUT_COMMENT_MARKER}\n\`\`\`json\nnot json\n\`\`\``)).toBeNull()
  })

  it('5. sanitises an untrusted (agent-posted) spec — junk pages dropped', () => {
    const dirty = `${LAYOUT_COMMENT_MARKER}\n\`\`\`json\n${JSON.stringify({ version: 1, pages: [
      { id: 'ok', name: 'OK', path: '/ok', tree: { root: { type: 'leaf', blockId: 'x' } } },
      { id: 'bad', name: 'Bad', path: '/bad', tree: { root: { type: 'nope' } } },
    ] })}\n\`\`\``
    expect(extractLayoutDocument(dirty)!.pages.map(p => p.id)).toEqual(['ok'])
  })

  it('6. latestLayoutDocument picks the newest valid spec among many comments', () => {
    const v1: LayoutDocument = { version: 1, pages: [{ id: 'a', name: 'A', path: '/a', tree: { renderer: 'panes', root: { type: 'leaf', blockId: 'x' } } }] }
    const comments = [
      { body: 'kick-off, no spec' },
      { body: formatLayoutComment(v1) },
      { body: 'human: tweak it' },
      { body: formatLayoutComment(doc) },
    ]
    expect(latestLayoutDocument(comments)).toEqual(doc)
    expect(latestLayoutDocument([{ body: 'no specs at all' }])).toBeNull()
  })

  it('7. is idempotent + diffable (equal docs → identical comment payload)', () => {
    const a = formatLayoutComment(doc)
    const b = formatLayoutComment(extractLayoutDocument(a)!)
    expect(b).toBe(a)
  })
})
