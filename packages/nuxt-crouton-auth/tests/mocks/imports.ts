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
  clear: async () => {},
})
