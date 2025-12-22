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
              appName: 'Test App',
              billing: { enabled: true }
            }
          }
        }
      }))

      const config = useAuthConfig()
      expect(config?.mode).toBe('multi-tenant')
      expect(config?.appName).toBe('Test App')
      expect(config?.billing?.enabled).toBe(true)
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

  describe('useAuthMode', () => {
    it('should return multi-tenant when configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { mode: 'multi-tenant' }
          }
        }
      }))

      const mode = useAuthMode()
      expect(mode).toBe('multi-tenant')
    })

    it('should return single-tenant when configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { mode: 'single-tenant' }
          }
        }
      }))

      const mode = useAuthMode()
      expect(mode).toBe('single-tenant')
    })

    it('should return personal as default when not configured', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {}
      }))

      const mode = useAuthMode()
      expect(mode).toBe('personal')
    })

    it('should return personal for invalid mode', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { mode: 'invalid-mode' }
          }
        }
      }))

      const mode = useAuthMode()
      expect(mode).toBe('personal')
    })
  })

  describe('useIsMultiTenant', () => {
    it('should return true for multi-tenant mode', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { mode: 'multi-tenant' }
          }
        }
      }))

      expect(useIsMultiTenant()).toBe(true)
    })

    it('should return false for single-tenant mode', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { mode: 'single-tenant' }
          }
        }
      }))

      expect(useIsMultiTenant()).toBe(false)
    })

    it('should return false for personal mode', () => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        public: {
          crouton: {
            auth: { mode: 'personal' }
          }
        }
      }))

      expect(useIsMultiTenant()).toBe(false)
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
      expect(redirects.afterLogin).toBe('/dashboard')
      expect(redirects.afterLogout).toBe('/')
      expect(redirects.afterRegister).toBe('/dashboard')
      expect(redirects.unauthenticated).toBe('/auth/login')
      expect(redirects.authenticated).toBe('/dashboard')
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
