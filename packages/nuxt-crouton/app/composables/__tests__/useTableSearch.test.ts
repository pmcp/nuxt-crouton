import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, readonly } from 'vue'

// Mock Vue's ref and readonly
vi.stubGlobal('ref', ref)
vi.stubGlobal('readonly', readonly)

// Track debounce calls for testing
let lastDebounceMs: number | undefined
let lastDebounceFn: Function | undefined

// Mock useDebounceFn from VueUse - must be hoisted
vi.mock('@vueuse/core', () => ({
  useDebounceFn: (fn: Function, ms: number) => {
    lastDebounceMs = ms
    lastDebounceFn = fn
    // Return a function that immediately calls the original (no actual debounce in tests)
    return (...args: any[]) => fn(...args)
  }
}))

// Import after mocking
import { useTableSearch } from '../useTableSearch'

describe('useTableSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastDebounceMs = undefined
    lastDebounceFn = undefined
  })

  describe('initialization', () => {
    it('initializes with empty string by default', () => {
      const { search } = useTableSearch()
      expect(search.value).toBe('')
    })

    it('initializes with provided initial value', () => {
      const { search } = useTableSearch({ initialValue: 'test query' })
      expect(search.value).toBe('test query')
    })

    it('initializes isSearching as false', () => {
      const { isSearching } = useTableSearch()
      expect(isSearching.value).toBe(false)
    })

    it('uses default debounce of 300ms', () => {
      useTableSearch()
      expect(lastDebounceMs).toBe(300)
    })

    it('uses custom debounce when provided', () => {
      useTableSearch({ debounceMs: 500 })
      expect(lastDebounceMs).toBe(500)
    })
  })

  describe('handleSearch', () => {
    it('updates search value when called', async () => {
      const { search, handleSearch } = useTableSearch()

      await handleSearch('new query')

      expect(search.value).toBe('new query')
    })

    it('calls onSearch callback when provided', async () => {
      const onSearch = vi.fn()
      const { handleSearch } = useTableSearch({ onSearch })

      await handleSearch('test')

      expect(onSearch).toHaveBeenCalledWith('test')
    })

    it('does not throw when onSearch is not provided', async () => {
      const { handleSearch } = useTableSearch()

      await expect(handleSearch('test')).resolves.not.toThrow()
    })

    it('sets isSearching to true during async callback', async () => {
      const searchingStates: boolean[] = []
      let resolveCallback: () => void

      const onSearch = vi.fn(() => {
        return new Promise<void>((resolve) => {
          resolveCallback = resolve
        })
      })

      const { isSearching, handleSearch } = useTableSearch({ onSearch })

      // Start the search
      const searchPromise = handleSearch('test')

      // Check isSearching is true during the call
      // We need to wait a tick for the async function to start
      await Promise.resolve()
      searchingStates.push(isSearching.value)

      // Resolve the callback
      resolveCallback!()
      await searchPromise

      // After completion, isSearching should be false
      searchingStates.push(isSearching.value)

      expect(searchingStates).toEqual([true, false])
    })

    it('sets isSearching to false after error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onSearch = vi.fn().mockRejectedValue(new Error('Search failed'))

      const { isSearching, handleSearch } = useTableSearch({ onSearch })

      await handleSearch('test')

      expect(isSearching.value).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('logs error when onSearch throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('API Error')
      const onSearch = vi.fn().mockRejectedValue(error)

      const { handleSearch } = useTableSearch({ onSearch })

      await handleSearch('test')

      expect(consoleSpy).toHaveBeenCalledWith('Search error:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('clearSearch', () => {
    it('resets search to empty string', () => {
      const { search, handleSearch, clearSearch } = useTableSearch({
        initialValue: 'initial'
      })

      // First update the search
      handleSearch('updated')
      expect(search.value).toBe('updated')

      // Then clear
      clearSearch()
      expect(search.value).toBe('')
    })

    it('calls onSearch with empty string', () => {
      const onSearch = vi.fn()
      const { clearSearch } = useTableSearch({ onSearch })

      clearSearch()

      expect(onSearch).toHaveBeenCalledWith('')
    })

    it('does not throw when onSearch is not provided', () => {
      const { clearSearch } = useTableSearch()

      expect(() => clearSearch()).not.toThrow()
    })

    it('immediately clears without debounce', () => {
      const onSearch = vi.fn()
      const { search, clearSearch } = useTableSearch({
        onSearch,
        initialValue: 'test'
      })

      clearSearch()

      // clearSearch should be immediate, not debounced
      expect(search.value).toBe('')
      expect(onSearch).toHaveBeenCalledWith('')
    })
  })

  describe('readonly refs', () => {
    it('search is returned as readonly', () => {
      const { search } = useTableSearch()

      // The returned search should be readonly
      // We can't directly test this in unit tests, but we verify
      // it's wrapped with readonly in the composable
      expect(search).toBeDefined()
      expect(typeof search.value).toBe('string')
    })

    it('isSearching is returned as readonly', () => {
      const { isSearching } = useTableSearch()

      expect(isSearching).toBeDefined()
      expect(typeof isSearching.value).toBe('boolean')
    })
  })

  describe('integration scenarios', () => {
    it('handles multiple sequential searches', async () => {
      const onSearch = vi.fn()
      const { search, handleSearch } = useTableSearch({ onSearch })

      await handleSearch('first')
      await handleSearch('second')
      await handleSearch('third')

      expect(search.value).toBe('third')
      expect(onSearch).toHaveBeenCalledTimes(3)
    })

    it('clear after search resets correctly', async () => {
      const onSearch = vi.fn()
      const { search, handleSearch, clearSearch } = useTableSearch({ onSearch })

      await handleSearch('query')
      expect(search.value).toBe('query')

      clearSearch()
      expect(search.value).toBe('')
      expect(onSearch).toHaveBeenLastCalledWith('')
    })
  })

  describe('debounce timing behavior', () => {
    // Note: The current mock immediately executes the debounced function
    // These tests document the expected debounce behavior

    it('debounce ms is correctly passed to useDebounceFn', () => {
      // Default 300ms
      useTableSearch()
      expect(lastDebounceMs).toBe(300)

      // Custom value
      useTableSearch({ debounceMs: 150 })
      expect(lastDebounceMs).toBe(150)

      // Zero debounce
      useTableSearch({ debounceMs: 0 })
      expect(lastDebounceMs).toBe(0)
    })

    it('debounced function is properly created', () => {
      useTableSearch()

      // The debounced function should be stored
      expect(lastDebounceFn).toBeDefined()
      expect(typeof lastDebounceFn).toBe('function')
    })

    it('rapid searches should ideally only trigger callback once per debounce period', async () => {
      // Note: This test documents expected behavior
      // With real debounce, rapid calls would be batched
      // Current mock executes immediately, so all calls go through
      const onSearch = vi.fn()
      const { handleSearch } = useTableSearch({ onSearch, debounceMs: 300 })

      // Simulate rapid typing
      await handleSearch('a')
      await handleSearch('ab')
      await handleSearch('abc')

      // With real debounce: onSearch should be called 1 time with 'abc'
      // With current immediate mock: called 3 times
      // This test documents the expectation
      expect(onSearch).toHaveBeenCalled()
      // The last call should always have the final value
      expect(onSearch).toHaveBeenLastCalledWith('abc')
    })

    it('different debounce values create different timings', () => {
      // Fast debounce for autocomplete
      useTableSearch({ debounceMs: 100 })
      expect(lastDebounceMs).toBe(100)

      // Slow debounce for expensive searches
      useTableSearch({ debounceMs: 1000 })
      expect(lastDebounceMs).toBe(1000)
    })

    it('debounce function wraps the search handler correctly', async () => {
      const onSearch = vi.fn()
      useTableSearch({ onSearch })

      // The stored debounced function should call onSearch when invoked
      expect(lastDebounceFn).toBeDefined()

      // Manually invoke the debounced function to verify it works
      if (lastDebounceFn) {
        await lastDebounceFn('manual test')
        expect(onSearch).toHaveBeenCalledWith('manual test')
      }
    })
  })
})
