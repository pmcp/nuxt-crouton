/**
 * Mock Nuxt auto-imports for testing
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

export { ref, computed, onMounted, onUnmounted, watch }

// Mock $fetch
export const $fetch = vi.fn()

// Mock useFetch
export const useFetch = vi.fn()

// Mock useRuntimeConfig
export const useRuntimeConfig = vi.fn(() => ({
  public: {}
}))
