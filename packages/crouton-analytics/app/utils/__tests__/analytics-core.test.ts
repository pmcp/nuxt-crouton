import { describe, it, expect, vi } from 'vitest'
import {
  resolveProvider,
  withVersion,
  createTracker,
  type AnalyticsProvider,
} from '../analytics-core'

describe('resolveProvider — pick the backend, degrade safely', () => {
  it('returns the no-op provider when unconfigured', () => {
    expect(resolveProvider(undefined).id).toBe('noop')
    expect(resolveProvider({}).id).toBe('noop')
  })

  it('returns no-op for an explicit noop provider', () => {
    expect(resolveProvider({ provider: 'noop' }).id).toBe('noop')
  })

  it('returns the console provider, whose track hits the injected sink', () => {
    const sink = vi.fn()
    const p = resolveProvider({ provider: 'console' }, { sink })
    expect(p.id).toBe('console')
    p.track('cta_click', { surface: 'landing' })
    expect(sink).toHaveBeenCalledWith({ event: 'cta_click', props: { surface: 'landing' } })
  })

  it('returns the posthog provider, whose track calls the loader capture', () => {
    const capture = vi.fn()
    const p = resolveProvider({ provider: 'posthog' }, { posthogLoader: () => ({ capture }) })
    expect(p.id).toBe('posthog')
    p.track('signup', { plan: 'free' })
    expect(capture).toHaveBeenCalledWith('signup', { plan: 'free' })
  })

  it('falls back to no-op (does NOT throw) when posthog has no loader', () => {
    const p = resolveProvider({ provider: 'posthog' }, { posthogLoader: () => undefined })
    expect(p.id).toBe('noop')
    expect(() => p.track('signup')).not.toThrow()
  })

  it('falls back to no-op for an unknown provider', () => {
    // @ts-expect-error — exercising the runtime safety net for a bad config value
    expect(resolveProvider({ provider: 'mixpanel' }).id).toBe('noop')
  })

  it('returns the d1 provider when a sender is injected', () => {
    const d1Sender = vi.fn()
    const p = resolveProvider({ provider: 'd1' }, { d1Sender })
    expect(p.id).toBe('d1')
    p.track('pageview', { path: '/' })
    expect(d1Sender).toHaveBeenCalledWith({ event: 'pageview', props: { path: '/' } })
  })

  it('falls back to no-op for d1 with no sender injected', () => {
    expect(resolveProvider({ provider: 'd1' }).id).toBe('noop')
  })
})

describe('withVersion — optional version/experiment enrichment (#951)', () => {
  it('adds version alongside the original props when present', () => {
    expect(withVersion({ surface: 'landing' }, 'v1.2.0'))
      .toEqual({ version: 'v1.2.0', surface: 'landing' })
  })

  it('returns props unchanged when no version is available', () => {
    expect(withVersion({ surface: 'landing' }, undefined)).toEqual({ surface: 'landing' })
    expect(withVersion({ surface: 'landing' }, '')).toEqual({ surface: 'landing' })
  })

  it('yields just the version for empty props', () => {
    expect(withVersion({}, 'v1.2.0')).toEqual({ version: 'v1.2.0' })
  })

  it('lets the version-lock value win over a caller-provided version prop', () => {
    // Integrity over flexibility: a colliding `version` prop must not corrupt attribution.
    expect(withVersion({ version: 'caller' }, 'locked')).toEqual({ version: 'locked' })
  })
})

describe('createTracker — gating + orchestration', () => {
  const mkProvider = () => {
    const track = vi.fn()
    const identify = vi.fn()
    const provider: AnalyticsProvider = { id: 'console', track, identify }
    return { provider, track, identify }
  }

  it('forwards a tracked event with version-enriched props when opted in', () => {
    const { provider, track } = mkProvider()
    const t = createTracker({ provider, isOptedOut: () => false, version: 'v1' })
    t.track('cta_click', { surface: 'landing' })
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('cta_click', { version: 'v1', surface: 'landing' })
  })

  it('does not call the provider when opted out', () => {
    const { provider, track } = mkProvider()
    const t = createTracker({ provider, isOptedOut: () => true })
    t.track('cta_click')
    expect(track).not.toHaveBeenCalled()
  })

  it('resumes tracking after opt-out is lifted', () => {
    const { provider, track } = mkProvider()
    let out = true
    const t = createTracker({ provider, isOptedOut: () => out })
    t.track('cta_click')
    expect(track).not.toHaveBeenCalled()
    out = false
    t.track('cta_click')
    expect(track).toHaveBeenCalledTimes(1)
  })

  it('pageview is a track of the pageview event with the path', () => {
    const { provider, track } = mkProvider()
    const t = createTracker({ provider, isOptedOut: () => false })
    t.pageview('/blog')
    expect(track).toHaveBeenCalledWith('pageview', { path: '/blog' })
  })

  it('does not identify when opted out', () => {
    const { provider, identify } = mkProvider()
    const t = createTracker({ provider, isOptedOut: () => true })
    t.identify('user_1', { plan: 'free' })
    expect(identify).not.toHaveBeenCalled()
  })
})
