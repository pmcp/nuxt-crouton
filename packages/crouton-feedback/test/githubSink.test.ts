import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { githubSink } from '../src/runtime/server/sinks/github'
import type { Annotation } from '../src/runtime/overlay/capture'
import type { SinkContext } from '../src/runtime/server/sinks/types'

const annotation: Annotation = {
  route: '/x', cssSelector: '#b', componentFile: 'app/X.vue',
  boundingBox: { x: 0, y: 0, width: 1, height: 1 }, commentText: 'hi', createdAt: 't'
}
const ctx = (config: Record<string, unknown>): SinkContext => ({ config, event: {} as never })

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
})

const g = globalThis as Record<string, unknown>
const originalFetch = g.fetch
const original$fetch = g.$fetch

function stubCommentPost() {
  g.$fetch = vi.fn(async () => ({ html_url: 'https://github.com/o/r/pull/5#issuecomment-1' }))
}
function stubTokenMint(token = 'minted-tok') {
  g.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ token }) }))
}

describe('github sink', () => {
  beforeEach(() => { stubCommentPost(); stubTokenMint() })
  afterEach(() => { g.fetch = originalFetch; g.$fetch = original$fetch })

  it('errors (no network) when neither App creds nor PAT are set', async () => {
    const res = await githubSink(annotation, '# md', ctx({ repository: 'o/r', pr: '5' }))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not configured/i)
    expect(g.$fetch).not.toHaveBeenCalled()
    expect(g.fetch).not.toHaveBeenCalled()
  })

  it('errors when repository / pr are missing even with a token', async () => {
    const res = await githubSink(annotation, '# md', ctx({ githubToken: 'pat' }))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not configured/i)
  })

  it('posts via the interim PAT (no token mint) to issues/{pr}/comments', async () => {
    const res = await githubSink(annotation, '# md', ctx({ githubToken: 'pat-123', repository: 'o/r', pr: '5' }))
    expect(res.ok).toBe(true)
    expect(res.data?.commentUrl).toContain('issuecomment')
    expect(g.fetch).not.toHaveBeenCalled() // no mint when using the PAT
    const [url, opts] = (g.$fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/o/r/issues/5/comments')
    expect(opts.headers.Authorization).toBe('Bearer pat-123')
    expect(opts.body).toEqual({ body: '# md' })
  })

  it('mints a short-lived App token and posts with it', async () => {
    const res = await githubSink(annotation, '# md', ctx({
      githubAppId: '123', githubAppPrivateKey: privateKey, githubAppInstallationId: '999',
      repository: 'o/r', pr: '5'
    }))
    expect(res.ok).toBe(true)
    expect(g.fetch).toHaveBeenCalledOnce() // minted the installation token
    const [, opts] = (g.$fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer minted-tok')
  })

  it('prefers App credentials over the interim PAT', async () => {
    await githubSink(annotation, '# md', ctx({
      githubAppId: '123', githubAppPrivateKey: privateKey, githubAppInstallationId: '999',
      githubToken: 'pat-should-not-be-used', repository: 'o/r', pr: '5'
    }))
    const [, opts] = (g.$fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer minted-tok')
  })

  it('never echoes the token in a failure message', async () => {
    g.$fetch = vi.fn(async () => { throw Object.assign(new Error('boom'), { statusCode: 403 }) })
    const res = await githubSink(annotation, '# md', ctx({ githubToken: 'super-secret-pat', repository: 'o/r', pr: '5' }))
    expect(res.ok).toBe(false)
    expect(res.error).toContain('403')
    expect(res.error).not.toContain('super-secret-pat')
  })
})
