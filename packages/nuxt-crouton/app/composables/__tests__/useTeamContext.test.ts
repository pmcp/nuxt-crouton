import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'

// Mock route
let mockRoute = {
  path: '/dashboard/test-team/products',
  params: { team: 'test-team' }
}

// Mock runtime config
let mockRuntimeConfig = {
  public: {
    crouton: { auth: { mode: 'multi-tenant' } }
  }
}

// Mock useTeam (throws by default)
let mockUseTeam: (() => { currentTeam: any }) | null = null

// Set up global mocks
vi.stubGlobal('computed', computed)

vi.stubGlobal('useRoute', () => mockRoute)

vi.stubGlobal('useRuntimeConfig', () => mockRuntimeConfig)

vi.stubGlobal('useTeam', () => {
  if (mockUseTeam) {
    return mockUseTeam()
  }
  throw new Error('useTeam not available')
})

// Import after mocking
import { useTeamContext } from '../useTeamContext'

describe('useTeamContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute = {
      path: '/dashboard/test-team/products',
      params: { team: 'test-team' }
    }
    mockRuntimeConfig = {
      public: {
        crouton: { auth: { mode: 'multi-tenant' } }
      }
    }
    mockUseTeam = null
  })

  describe('getTeamId', () => {
    it('extracts teamId from route params', () => {
      const { getTeamId } = useTeamContext()

      expect(getTeamId()).toBe('test-team')
    })

    it('returns team ID from useTeam() when available', () => {
      mockUseTeam = () => ({
        currentTeam: { value: { id: 'team-123', slug: 'acme' } }
      })

      const { getTeamId } = useTeamContext()

      expect(getTeamId()).toBe('team-123')
    })

    it('falls back to route param when useTeam() throws', () => {
      mockRoute = {
        path: '/dashboard/my-team/products',
        params: { team: 'my-team' }
      }
      mockUseTeam = null // Will throw

      const { getTeamId } = useTeamContext()

      expect(getTeamId()).toBe('my-team')
    })

    it('returns undefined when no team param', () => {
      mockRoute = {
        path: '/super-admin/products',
        params: {}
      }

      const { getTeamId } = useTeamContext()

      expect(getTeamId()).toBeUndefined()
    })

    it('handles array route params', () => {
      mockRoute = {
        path: '/dashboard/team/products',
        params: { team: ['first', 'second'] } // Array params
      }

      const { getTeamId } = useTeamContext()

      // Should return undefined for non-string params
      expect(getTeamId()).toBeUndefined()
    })
  })

  describe('getTeamSlug', () => {
    it('returns team slug from route', () => {
      mockRoute = {
        path: '/dashboard/acme-corp/products',
        params: { team: 'acme-corp' }
      }

      const { getTeamSlug } = useTeamContext()

      expect(getTeamSlug()).toBe('acme-corp')
    })

    it('returns slug from useTeam() when available', () => {
      mockUseTeam = () => ({
        currentTeam: { value: { id: 'team-123', slug: 'acme-slug' } }
      })

      const { getTeamSlug } = useTeamContext()

      expect(getTeamSlug()).toBe('acme-slug')
    })

    it('falls back to route param when useTeam() throws', () => {
      mockRoute = {
        path: '/dashboard/fallback-slug/products',
        params: { team: 'fallback-slug' }
      }

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
      mockRoute = {
        path: '/super-admin',
        params: {}
      }

      const { teamId } = useTeamContext()

      expect(teamId.value).toBeNull()
    })

    it('hasTeamContext is true when team exists', () => {
      const { hasTeamContext } = useTeamContext()

      expect(hasTeamContext.value).toBe(true)
    })

    it('hasTeamContext is false when no team', () => {
      mockRoute = {
        path: '/super-admin',
        params: {}
      }

      const { hasTeamContext } = useTeamContext()

      expect(hasTeamContext.value).toBe(false)
    })
  })

  describe('useTeamInUrl', () => {
    it('returns true for multi-tenant mode', () => {
      mockRuntimeConfig = {
        public: {
          crouton: { auth: { mode: 'multi-tenant' } }
        }
      }

      const { useTeamInUrl } = useTeamContext()

      expect(useTeamInUrl.value).toBe(true)
    })

    it('returns false for single-tenant mode', () => {
      mockRuntimeConfig = {
        public: {
          crouton: { auth: { mode: 'single-tenant' } }
        }
      }

      const { useTeamInUrl } = useTeamContext()

      expect(useTeamInUrl.value).toBe(false)
    })

    it('returns false when mode not set', () => {
      mockRuntimeConfig = {
        public: {
          crouton: {}
        }
      }

      const { useTeamInUrl } = useTeamContext()

      expect(useTeamInUrl.value).toBe(false)
    })
  })

  describe('buildDashboardUrl', () => {
    it('includes team slug in multi-tenant mode', () => {
      mockRuntimeConfig = {
        public: {
          crouton: { auth: { mode: 'multi-tenant' } }
        }
      }

      const { buildDashboardUrl } = useTeamContext()

      expect(buildDashboardUrl('/settings')).toBe('/dashboard/test-team/settings')
    })

    it('excludes team in single-tenant mode', () => {
      mockRuntimeConfig = {
        public: {
          crouton: { auth: { mode: 'single-tenant' } }
        }
      }

      const { buildDashboardUrl } = useTeamContext()

      expect(buildDashboardUrl('/settings')).toBe('/dashboard/settings')
    })

    it('handles path without leading slash', () => {
      mockRuntimeConfig = {
        public: {
          crouton: { auth: { mode: 'multi-tenant' } }
        }
      }

      const { buildDashboardUrl } = useTeamContext()

      expect(buildDashboardUrl('bookings')).toBe('/dashboard/test-team/bookings')
    })

    it('allows team slug override', () => {
      mockRuntimeConfig = {
        public: {
          crouton: { auth: { mode: 'multi-tenant' } }
        }
      }

      const { buildDashboardUrl } = useTeamContext()

      expect(buildDashboardUrl('/settings', 'other-team')).toBe('/dashboard/other-team/settings')
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
      mockRoute = {
        path: '/super-admin',
        params: {}
      }

      const { buildApiUrl } = useTeamContext()

      expect(buildApiUrl('/users')).toBe('/api/users')
    })
  })

  describe('integration with useTeam()', () => {
    it('prioritizes useTeam() over route params', () => {
      mockRoute = {
        path: '/dashboard/route-team/products',
        params: { team: 'route-team' }
      }
      mockUseTeam = () => ({
        currentTeam: { value: { id: 'auth-team-id', slug: 'auth-team-slug' } }
      })

      const { getTeamId, getTeamSlug } = useTeamContext()

      expect(getTeamId()).toBe('auth-team-id')
      expect(getTeamSlug()).toBe('auth-team-slug')
    })

    it('handles useTeam() returning null currentTeam', () => {
      mockUseTeam = () => ({
        currentTeam: { value: null }
      })
      mockRoute = {
        path: '/dashboard/fallback/products',
        params: { team: 'fallback' }
      }

      const { getTeamId } = useTeamContext()

      expect(getTeamId()).toBe('fallback')
    })
  })
})
