import { describe, it, expect, vi } from 'vitest'

describe('/api/ping endpoint', () => {
  it('should return { ok: true }', async () => {
    // Mock defineEventHandler to just return the handler function it receives
    vi.stubGlobal('defineEventHandler', (fn: any) => fn)
    
    // Import the handler
    const { default: pingHandler } = await import('../server/api/ping.get')
    
    // Call the handler with a mock event
    const result = pingHandler({})
    
    // Assert the response
    expect(result).toEqual({ ok: true })
  })
})
