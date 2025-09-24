import { useDebounceFn } from '@vueuse/core'
import type { Ref } from 'vue'

interface UseTableSearchOptions {
  initialValue?: string
  debounceMs?: number
  onSearch?: (value: string) => void | Promise<void>
}

export function useTableSearch(options: UseTableSearchOptions = {}) {
  const { initialValue = '', debounceMs = 300, onSearch } = options

  const search = ref(initialValue)
  const isSearching = ref(false)

  // Debounced search handler with error handling
  const handleSearch = useDebounceFn(async (value: string) => {
    search.value = value

    if (onSearch) {
      isSearching.value = true
      try {
        await onSearch(value)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        isSearching.value = false
      }
    }
  }, debounceMs)

  const clearSearch = () => {
    search.value = ''
    if (onSearch) {
      onSearch('')
    }
  }

  return {
    search: readonly(search),
    isSearching: readonly(isSearching),
    handleSearch,
    clearSearch
  }
}