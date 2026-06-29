import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveSink, registeredSinks } from '../src/runtime/server/sinks'
import { webhookSink } from '../src/runtime/server/sinks/webhook'
import type { Annotation } from '../src/runtime/overlay/capture'
import type { SinkContext } from '../src/runtime/server/sinks/types'

const annotation: Annotation = {
  route: '/x',
  cssSelector: '#b',
  componentFile: 'app/X.vue',
  boundingBox: { x: 0, y: 0, width: 1, height: 1 },
  commentText: 'tweak',
  createdAt: 't'
}

const ctx = (config: Record<string, unknown>): SinkContext =>
  ({ config, event: {} as never })

describe('sink registry', () => {
  it('resolves the webhook sink by name and as the default', () => {
    expect(resolveSink('webhook')).toBe(webhookSink)
    expect(resolveSink(undefined)).toBe(webhookSink)
    expect(resolveSink('')).toBe(webhookSink)
  })

  it('returns null for an unknown sink (slack/discord/github land in #964)', () => {
    expect(resolveSink('nope')).toBeNull()
  })

  it('lists the registered sinks', () => {
    expect(registeredSinks()).toContain('webhook')
  })
})

describe('webhook sink', () => {
  const original = (globalThis as Record<string, unknown>).$fetch

  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).$fetch = vi.fn(async () => ({}))
  })
  afterEach(() => {
    ;(globalThis as Record<string, unknown>).$fetch = original
  })

  it('errors (without throwing) when no URL is configured', async () => {
    const res = await webhookSink(annotation, '# md', ctx({}))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not configured/i)
    expect((globalThis as Record<string, unknown>).$fetch).not.toHaveBeenCalled()
  })

  it('POSTs annotation + markdown to the configured URL', async () => {
    const res = await webhookSink(annotation, '# md', ctx({ webhookUrl: 'https://hook.example/x' }))
    expect(res.ok).toBe(true)
    const fetchMock = (globalThis as Record<string, unknown>).$fetch as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledWith('https://hook.example/x', {
      method: 'POST',
      body: { annotation, markdown: '# md' }
    })
  })

  it('reports a safe failure when the request throws', async () => {
    ;(globalThis as Record<string, unknown>).$fetch = vi.fn(async () => {
      throw Object.assign(new Error('boom'), { statusCode: 502 })
    })
    const res = await webhookSink(annotation, '# md', ctx({ webhookUrl: 'https://hook.example/x' }))
    expect(res.ok).toBe(false)
    expect(res.error).toContain('502')
  })
})
