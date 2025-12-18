import { vi } from 'vitest'

// Mock nuxt app instance
export const mockNuxtApp = {
  $authClient: null as unknown,
}

export function useNuxtApp() {
  return mockNuxtApp
}

export function useRuntimeConfig() {
  return {
    public: {
      crouton: {
        auth: {
          mode: 'multi-tenant',
          methods: {
            password: true,
            oauth: {
              github: { clientId: 'test-github', clientSecret: 'test' },
              google: { clientId: 'test-google', clientSecret: 'test' },
            },
            passkeys: { enabled: true },
            twoFactor: { enabled: true },
            magicLink: { enabled: true },
          },
        },
      },
    },
  }
}

// Vue reactivity imports
export { ref, computed, readonly } from 'vue'
