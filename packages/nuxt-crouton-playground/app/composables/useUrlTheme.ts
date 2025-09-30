import type { ThemeColors } from './useThemeState'

export const useUrlTheme = () => {
  const route = useRoute()
  const router = useRouter()
  const { updateAllColors } = useThemeState()

  /**
   * Encode theme to base64 string for URL sharing
   */
  const encodeTheme = (theme: ThemeColors): string => {
    try {
      const json = JSON.stringify(theme)
      return btoa(json)
    } catch (error) {
      console.error('Failed to encode theme:', error)
      return ''
    }
  }

  /**
   * Decode theme from base64 string
   */
  const decodeTheme = (encoded: string): ThemeColors | null => {
    try {
      const json = atob(encoded)
      return JSON.parse(json)
    } catch (error) {
      console.error('Failed to decode theme:', error)
      return null
    }
  }

  /**
   * Generate shareable URL with current theme
   */
  const shareableUrl = computed(() => {
    const { theme } = useThemeState()
    const encoded = encodeTheme(theme.value.colors)

    if (!encoded) return ''

    // Use window.location if available, otherwise construct from route
    if (import.meta.client && typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}${route.path}?t=${encoded}`
    }

    return `?t=${encoded}`
  })

  /**
   * Update URL with current theme without page reload
   */
  const updateUrl = (theme: ThemeColors) => {
    const encoded = encodeTheme(theme)
    if (encoded) {
      router.push({ query: { t: encoded } })
    }
  }

  /**
   * Load theme from URL query parameter
   */
  const loadThemeFromUrl = () => {
    const encoded = route.query.t as string
    if (encoded) {
      const decoded = decodeTheme(encoded)
      if (decoded) {
        updateAllColors(decoded)
        return true
      }
    }
    return false
  }

  // Load theme from URL on mount
  onMounted(() => {
    loadThemeFromUrl()
  })

  return {
    shareableUrl,
    encodeTheme,
    decodeTheme,
    updateUrl,
    loadThemeFromUrl
  }
}