import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveSink, registeredSinks } from '../src/runtime/server/sinks'
import { webhookSink } from '../src/runtime/server/sinks/webhook'
import { slackSink, buildSlackPayload } from '../src/runtime/server/sinks/slack'
import { discordSink, buildDiscordPayload } from '../src/runtime/server/sinks/discord'
import type { Annotation } from '../src/runtime/overlay/capture'
import type { SinkContext } from '../src/runtime/server/sinks/types'

const annotation: Annotation = {
  route: '/products',
  cssSelector: '#title',
  componentFile: 'app/pages/products.vue',
  boundingBox: { x: 0, y: 0, width: 1, height: 1 },
  commentText: 'make this bigger',
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

  it('resolves slack / discord / github by name', () => {
    expect(resolveSink('slack')).toBe(slackSink)
    expect(resolveSink('discord')).toBe(discordSink)
    expect(typeof resolveSink('github')).toBe('function')
  })

  it('returns null for an unknown sink', () => {
    expect(resolveSink('telepathy')).toBeNull()
  })

  it('lists every registered sink', () => {
    expect(registeredSinks().sort()).toEqual(['discord', 'github', 'slack', 'webhook'])
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

describe('slack sink', () => {
  const original = (globalThis as Record<string, unknown>).$fetch
  beforeEach(() => { (globalThis as Record<string, unknown>).$fetch = vi.fn(async () => ({})) })
  afterEach(() => { (globalThis as Record<string, unknown>).$fetch = original })

  it('builds a Block Kit payload carrying comment, component and page', () => {
    const payload = buildSlackPayload(annotation) as { blocks: Array<{ type: string, text?: { text?: string } }> }
    const section = payload.blocks.find(b => b.type === 'section')!.text!.text!
    expect(section).toContain('make this bigger')
    expect(section).toContain('app/pages/products.vue')
    expect(section).toContain('/products')
  })

  it('errors (no network) when slackUrl is missing', async () => {
    const res = await slackSink(annotation, '# md', ctx({}))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not configured/i)
    expect((globalThis as Record<string, unknown>).$fetch).not.toHaveBeenCalled()
  })

  it('POSTs the blocks payload to slackUrl', async () => {
    const res = await slackSink(annotation, '# md', ctx({ slackUrl: 'https://hooks.slack.com/x' }))
    expect(res.ok).toBe(true)
    const fetchMock = (globalThis as Record<string, unknown>).$fetch as ReturnType<typeof vi.fn>
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://hooks.slack.com/x')
    expect(opts.body).toHaveProperty('blocks')
  })

  it('reports a safe failure when the request throws', async () => {
    ;(globalThis as Record<string, unknown>).$fetch = vi.fn(async () => {
      throw Object.assign(new Error('boom'), { statusCode: 500 })
    })
    const res = await slackSink(annotation, '# md', ctx({ slackUrl: 'https://hooks.slack.com/x' }))
    expect(res.ok).toBe(false)
    expect(res.error).toContain('500')
  })
})

describe('discord sink', () => {
  const original = (globalThis as Record<string, unknown>).$fetch
  beforeEach(() => { (globalThis as Record<string, unknown>).$fetch = vi.fn(async () => ({})) })
  afterEach(() => { (globalThis as Record<string, unknown>).$fetch = original })

  it('builds an embed payload carrying comment, component and page', () => {
    const payload = buildDiscordPayload(annotation) as { embeds: Array<{ title: string, description: string }> }
    expect(payload.embeds[0].title).toContain('Preview feedback')
    expect(payload.embeds[0].description).toContain('make this bigger')
    expect(payload.embeds[0].description).toContain('app/pages/products.vue')
    expect(payload.embeds[0].description).toContain('/products')
  })

  it('errors (no network) when discordUrl is missing', async () => {
    const res = await discordSink(annotation, '# md', ctx({}))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not configured/i)
    expect((globalThis as Record<string, unknown>).$fetch).not.toHaveBeenCalled()
  })

  it('POSTs the embed payload to discordUrl', async () => {
    const res = await discordSink(annotation, '# md', ctx({ discordUrl: 'https://discord.com/api/webhooks/x' }))
    expect(res.ok).toBe(true)
    const fetchMock = (globalThis as Record<string, unknown>).$fetch as ReturnType<typeof vi.fn>
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://discord.com/api/webhooks/x')
    expect(opts.body).toHaveProperty('embeds')
  })
})
