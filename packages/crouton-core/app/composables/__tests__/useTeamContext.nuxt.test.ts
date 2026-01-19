/**
 * useTeamContext - vi.hoisted + vi.stubGlobal Pattern
 *
 * This test file demonstrates a cleaner mocking pattern for Nuxt composables
 * that use auto-imports. Uses vi.hoisted for changeable mocks that can be
 * modified per test, combined with vi.stubGlobal for auto-import globals.
 *
 * Key patterns:
 * 1. vi.hoisted() creates mock functions that can be changed per test
 * 2. vi.stubGlobal() injects mocks as globals (required for Nuxt auto-imports)
 * 3. Mocks are automatically hoisted to the top of the file
 *
 * Why vi.stubGlobal is still needed:
 * - Nuxt auto-imports become globals at runtime, not ESM imports
 * - vi.mock('#imports') doesn't intercept auto-imported globals
 * - Full mockNuxtImport requires @nuxt/test-utils with nuxt vitest environment
 *
 * Benefits of vi.hoisted over inline mock definitions:
 * - Single source of truth for mock configuration
 * - Cleaner per-test mock customization
 * - Better IDE support and type inference
 * - Easier to reset and reconfigure mocks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computed } from 'vue'

// Create hoisted mocks that can be changed per test
// vi.hoisted runs before any imports are resolved
const { mockRoute, mockRuntimeConfig, mockUseTeam } = vi.hoisted(() => ({
  mockRoute: vi.fn(),
  mockRuntimeConfig: vi.fn(),
  mockUseTeam: vi.fn()
}))

// Stub globals for Nuxt auto-imports
// This is required because auto-imports become globals, not ESM imports
vi.stubGlobal('useRoute', mockRoute)
vi.stubGlobal('useRuntimeConfig', mockRuntimeConfig)
vi.stubGlobal('useTeam', mockUseTeam)
vi.stubGlobal('computed', computed)

// Import the composable under test (after mocks are set up)
import { useTeamContext } from '../useTeamContext'

describe('useTeamContext (nuxt-test-utils)', () => {
  beforeEach(() => {
    // Default mock values
    mockRoute.mockReturnValue({
      path: '/dashboard/test-team/products',
      params: { team: 'test-team' }
    })

    mockRuntimeConfig.mockReturnValue({
      public: {
        crouton: { auth: {} }
      }
    })

    // By default, useTeam throws (simulating no auth module)
    mockUseTeam.mockImplementation(() => {
      throw new Error('useTeam not available')
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getTeamId', () => {
    it('extracts teamId from route params', () => {
      const { getTeamId } = useTeamContext()
      expect(getTeamId()).toBe('test-team')
    })

    it('returns team ID from useTeam() when available', () => {
      mockUseTeam.mockReturnValue({
        currentTeam: { value: { id: 'team-123', slug: 'acme' } }
      })

      const { getTeamId } = useTeamContext()
      expect(getTeamId()).toBe('team-123')
    })

    it('falls back to route param when useTeam() throws', () => {
      mockRoute.mockReturnValue({
        path: '/dashboard/my-team/products',
        params: { team: 'my-team' }
      })
      mockUseTeam.mockImplementation(() => {
        throw new Error('useTeam not available')
      })

      const { getTeamId } = useTeamContext()
      expect(getTeamId()).toBe('my-team')
    })

    it('returns undefined when no team param', () => {
      mockRoute.mockReturnValue({
        path: '/super-admin/products',
        params: {}
      })

      const { getTeamId } = useTeamContext()
      expect(getTeamId()).toBeUndefined()
    })

    it('handles array route params', () => {
      mockRoute.mockReturnValue({
        path: '/dashboard/team/products',
        params: { team: ['first', 'second'] }
      })

      const { getTeamId } = useTeamContext()
      expect(getTeamId()).toBeUndefined()
    })
  })

  describe('getTeamSlug', () => {
    it('returns team slug from route', () => {
      mockRoute.mockReturnValue({
        path: '/dashboard/acme-corp/products',
        params: { team: 'acme-corp' }
      })

      const { getTeamSlug } = useTeamContext()
      expect(getTeamSlug()).toBe('acme-corp')
    })

    it('returns slug from useTeam() when available', () => {
      mockUseTeam.mockReturnValue({
        currentTeam: { value: { id: 'team-123', slug: 'acme-slug' } }
      })

      const { getTeamSlug } = useTeamContext()
      expect(getTeamSlug()).toBe('acme-slug')
    })

    it('falls back to route param when useTeam() throws', () => {
      mockRoute.mockReturnValue({
        path: '/dashboard/fallback-slug/products',
        params: { team: 'fallback-slug' }
      })

      const { getTeamSlug } = useTeamContext()
      expect(getTeamSlug()).toBe('fallback-slug')
    })
  })

  describe('computed refs', () => {
    it('teamId is a computed ref', () => {
      const { teamId } = useTeamContext()
      expect(teamId.value).toBe('test-team')
    })

    it('teamSlug is a computed ref', () => {
      const { teamSlug } = useTeamContext()
      expect(teamSlug.value).toBe('test-team')
    })

    it('teamId returns null when no team', () => {
      mockRoute.mockReturnValue({
        path: '/super-admin',
        params: {}
      })

      const { teamId } = useTeamContext()
      expect(teamId.value).toBeNull()
    })

    it('hasTeamContext is true when team exists', () => {
      const { hasTeamContext } = useTeamContext()
      expect(hasTeamContext.value).toBe(true)
    })

    it('hasTeamContext is false when no team', () => {
      mockRoute.mockReturnValue({
        path: '/super-admin',
        params: {}
      })

      const { hasTeamContext } = useTeamContext()
      expect(hasTeamContext.value).toBe(false)
    })
  })

  describe('useTeamInUrl', () => {
    it('always returns true (team always in URL)', () => {
      const { useTeamInUrl } = useTeamContext()
      expect(useTeamInUrl.value).toBe(true)
    })

    it('returns true regardless of config', () => {
      mockRuntimeConfig.mockReturnValue({
        public: {
          crouton: {}
        }
      })

      const { useTeamInUrl } = useTeamContext()
      expect(useTeamInUrl.value).toBe(true)
    })
  })

  describe('buildDashboardUrl', () => {
    it('always includes team slug in URL', () => {
      const { buildDashboardUrl } = useTeamContext()
      expect(buildDashboardUrl('/settings')).toBe('/dashboard/test-team/settings')
    })

    it('handles path without leading slash', () => {
      const { buildDashboardUrl } = useTeamContext()
      expect(buildDashboardUrl('bookings')).toBe('/dashboard/test-team/bookings')
    })

    it('allows team slug override', () => {
      const { buildDashboardUrl } = useTeamContext()
      expect(buildDashboardUrl('/settings', 'other-team')).toBe('/dashboard/other-team/settings')
    })

    it('falls back to /dashboard when no team available', () => {
      mockRoute.mockReturnValue({
        path: '/super-admin',
        params: {}
      })

      const { buildDashboardUrl } = useTeamContext()
      expect(buildDashboardUrl('/settings')).toBe('/dashboard/settings')
    })
  })

  describe('buildApiUrl', () => {
    it('includes team id in path', () => {
      const { buildApiUrl } = useTeamContext()
      expect(buildApiUrl('/bookings')).toBe('/api/teams/test-team/bookings')
    })

    it('handles path without leading slash', () => {
      const { buildApiUrl } = useTeamContext()
      expect(buildApiUrl('products')).toBe('/api/teams/test-team/products')
    })

    it('allows team id override', () => {
      const { buildApiUrl } = useTeamContext()
      expect(buildApiUrl('/settings', 'custom-team-id')).toBe('/api/teams/custom-team-id/settings')
    })

    it('returns path without team when no team context', () => {
      mockRoute.mockReturnValue({
        path: '/super-admin',
        params: {}
      })

      const { buildApiUrl } = useTeamContext()
      expect(buildApiUrl('/users')).toBe('/api/users')
    })
  })

  describe('integration with useTeam()', () => {
    it('prioritizes useTeam() over route params', () => {
      mockRoute.mockReturnValue({
        path: '/dashboard/route-team/products',
        params: { team: 'route-team' }
      })
      mockUseTeam.mockReturnValue({
        currentTeam: { value: { id: 'auth-team-id', slug: 'auth-team-slug' } }
      })

      const { getTeamId, getTeamSlug } = useTeamContext()

      expect(getTeamId()).toBe('auth-team-id')
      expect(getTeamSlug()).toBe('auth-team-slug')
    })

    it('handles useTeam() returning null currentTeam', () => {
      mockUseTeam.mockReturnValue({
        currentTeam: { value: null }
      })
      mockRoute.mockReturnValue({
        path: '/dashboard/fallback/products',
        params: { team: 'fallback' }
      })

      const { getTeamId } = useTeamContext()
      expect(getTeamId()).toBe('fallback')
    })
  })
})
