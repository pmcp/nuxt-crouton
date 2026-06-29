import { describe, it, expect, vi } from 'vitest'
import {
  validateAnalyticsIngest,
  toAnalyticsRow,
  createD1Provider,
  AnalyticsIngestError,
  MAX_PROPS_KEYS,
  type AnalyticsRowContext,
} from '../d1-sink'

const ctx = (over: Partial<AnalyticsRowContext> = {}): AnalyticsRowContext => ({
  id: 'srv-id',
  now: 1_700_000_000_000,
  teamId: 'team-real',
  ...over,
})

describe('validateAnalyticsIngest — the public-endpoint security boundary', () => {
  it('accepts a known event and passes props/sessionId/path through', () => {
    const r = validateAnalyticsIngest({ event: 'cta_click', props: { surface: 'landing' }, sessionId: 's1', path: '/x' })
    expect(r).toEqual({ event: 'cta_click', props: { surface: 'landing' }, sessionId: 's1', path: '/x' })
  })

  it('rejects an unknown event name', () => {
    expect(() => validateAnalyticsIngest({ event: 'arbitrary_spam' })).toThrow(AnalyticsIngestError)
  })

  it('rejects an empty/missing event name', () => {
    expect(() => validateAnalyticsIngest({})).toThrow(AnalyticsIngestError)
    expect(() => validateAnalyticsIngest({ event: '' })).toThrow(AnalyticsIngestError)
  })

  it('rejects props with too many keys', () => {
    const props: Record<string, number> = {}
    for (let i = 0; i <= MAX_PROPS_KEYS; i++) props[`k${i}`] = i
    expect(() => validateAnalyticsIngest({ event: 'key_action', props })).toThrow(AnalyticsIngestError)
  })

  it('rejects oversized props', () => {
    const props = { blob: 'x'.repeat(5000) }
    expect(() => validateAnalyticsIngest({ event: 'key_action', props })).toThrow(AnalyticsIngestError)
  })

  it('strips a client-supplied version from props (server owns it)', () => {
    const r = validateAnalyticsIngest({ event: 'pageview', props: { version: 'spoofed', a: 1 } })
    expect(r.props).toEqual({ a: 1 })
  })

  it('defaults missing sessionId/path to null', () => {
    const r = validateAnalyticsIngest({ event: 'pageview' })
    expect(r.sessionId).toBeNull()
    expect(r.path).toBeNull()
  })
})

describe('toAnalyticsRow — server owns id/timestamp/teamId/version', () => {
  it('uses the server context and ignores client-supplied id/teamId/timestamp', () => {
    const row = toAnalyticsRow(
      { event: 'signup', props: { plan: 'free' }, id: 'client-spoof', teamId: 'team-spoof', timestamp: 1 },
      ctx({ version: 'v2' }),
    )
    expect(row).toEqual({
      id: 'srv-id',
      timestamp: 1_700_000_000_000,
      teamId: 'team-real',
      event: 'signup',
      props: { plan: 'free' },
      sessionId: null,
      path: null,
      version: 'v2',
    })
  })

  it('sets version to null when the server has none', () => {
    const row = toAnalyticsRow({ event: 'pageview' }, ctx())
    expect(row.version).toBeNull()
  })

  it('propagates a rejection from validation', () => {
    expect(() => toAnalyticsRow({ event: 'nope' }, ctx())).toThrow(AnalyticsIngestError)
  })
})

describe('createD1Provider — client beacon mapping', () => {
  it('sends each tracked event to the injected sender', () => {
    const send = vi.fn()
    const p = createD1Provider(send)
    expect(p.id).toBe('d1')
    p.track('cta_click', { surface: 'landing' })
    expect(send).toHaveBeenCalledWith({ event: 'cta_click', props: { surface: 'landing' } })
  })
})
