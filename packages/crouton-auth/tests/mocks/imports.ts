// Mock Nuxt auto-imports
export { ref, computed, readonly } from 'vue'
export { useNuxtApp, useRuntimeConfig } from './nuxt-app'

// These will be mocked per-test
export const useSession = () => ({
  user: { value: null },
  isAuthenticated: { value: false },
  isPending: { value: false },
  error: { value: null },
  refresh: async () => {},
  clear: async () => {}
})

// Default mock for useAuthConfig - can be overridden in tests via vi.stubGlobal
export const useAuthConfig = () => ({
  mode: 'multi-tenant' as const,
  billing: {
    enabled: true,
    stripe: {
      publishableKey: 'pk_test_123',
      plans: []
    }
  },
  methods: {
    password: true,
    oauth: { github: { clientId: 'test' }, google: { clientId: 'test' } },
    passkeys: { enabled: true },
    twoFactor: { enabled: true },
    magicLink: { enabled: true }
  },
  ui: {
    redirects: {
      afterLogin: '/',
      afterLogout: '/',
      afterRegister: '/',
      unauthenticated: '/auth/login',
      authenticated: '/'
    }
  }
})
