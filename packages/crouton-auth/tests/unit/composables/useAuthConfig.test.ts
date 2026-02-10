import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import after mocks
import { useAuthConfig, useAuthMode, useIsMultiTenant, useAuthRedirects } from '../../../app/composables/useAuthConfig'

describe('useAuthConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('useAuthConfig', () => {
    it('should return config when configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: {
              mode: 'multi-tenant',
              appName: 'Test App'
            }
          }
        }
      }))

      const config = useAuthConfig()
      expect(config?.mode).toBe('multi-tenant')
      expect(config?.appName).toBe('Test App')
    })

    it('should return undefined when not configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {}
      }))

      const config = useAuthConfig()
      expect(config).toBeUndefined()
    })

    it('should return undefined when crouton.auth is missing', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {}
        }
      }))

      const config = useAuthConfig()
      expect(config).toBeUndefined()
    })
  })

  describe('useAuthMode (deprecated - infers mode from flags)', () => {
    it('should infer multi-tenant when allowCreate is true', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { teams: { allowCreate: true, showSwitcher: true } }
          }
        }
      }))

      const mode = useAuthMode()
      expect(mode).toBe('multi-tenant')
    })

    it('should infer single-tenant when defaultTeamSlug is set and allowCreate is false', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { teams: { defaultTeamSlug: 'acme', allowCreate: false } }
          }
        }
      }))

      const mode = useAuthMode()
      expect(mode).toBe('single-tenant')
    })

    it('should return multi-tenant as default when not configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {}
      }))

      const mode = useAuthMode()
      // Default behavior is multi-tenant (allowCreate: true by default)
      expect(mode).toBe('multi-tenant')
    })

    it('should infer personal when autoCreateOnSignup is true and allowCreate is false', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { teams: { autoCreateOnSignup: true, allowCreate: false } }
          }
        }
      }))

      const mode = useAuthMode()
      expect(mode).toBe('personal')
    })
  })

  describe('useIsMultiTenant (deprecated - checks allowCreate flag)', () => {
    it('should return true when allowCreate is true', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { teams: { allowCreate: true } }
          }
        }
      }))

      expect(useIsMultiTenant()).toBe(true)
    })

    it('should return false when allowCreate is false', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { teams: { allowCreate: false } }
          }
        }
      }))

      expect(useIsMultiTenant()).toBe(false)
    })

    it('should return true by default (allowCreate defaults to true)', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: {}
          }
        }
      }))

      // allowCreate is not explicitly false, so it's considered true
      expect(useIsMultiTenant()).toBe(true)
    })
  })

  describe('useAuthRedirects', () => {
    it('should return configured redirects', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: {
              ui: {
                redirects: {
                  afterLogin: '/custom-dashboard',
                  afterLogout: '/goodbye',
                  afterRegister: '/welcome',
                  unauthenticated: '/please-login',
                  authenticated: '/home'
                }
              }
            }
          }
        }
      }))

      const redirects = useAuthRedirects()
      expect(redirects.afterLogin).toBe('/custom-dashboard')
      expect(redirects.afterLogout).toBe('/goodbye')
      expect(redirects.afterRegister).toBe('/welcome')
      expect(redirects.unauthenticated).toBe('/please-login')
      expect(redirects.authenticated).toBe('/home')
    })

    it('should return defaults when not configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {}
      }))

      const redirects = useAuthRedirects()
      expect(redirects.afterLogin).toBe('/')
      expect(redirects.afterLogout).toBe('/')
      expect(redirects.afterRegister).toBe('/')
      expect(redirects.unauthenticated).toBe('/auth/login')
      expect(redirects.authenticated).toBe('/')
    })

    it('should use defaults for missing redirect values', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: {
              ui: {
                redirects: {
                  afterLogin: '/my-dashboard'
                  // Other redirects not specified
                }
              }
            }
          }
        }
      }))

      const redirects = useAuthRedirects()
      expect(redirects.afterLogin).toBe('/my-dashboard')
      expect(redirects.afterLogout).toBe('/') // default
    })
  })
})
