import { useClipboard, useLocalStorage } from '@vueuse/core'

export type ColorName = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'

export interface ThemeColors {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  neutral: string
}

export interface ThemePreset {
  name: string
  colors: ThemeColors
}

const defaultColors: ThemeColors = {
  primary: 'blue',
  secondary: 'purple',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  neutral: 'slate'
}

export const useTheme = () => {
  const route = useRoute()
  const router = useRouter()
  const appConfig = useAppConfig()

  // State with localStorage persistence
  const colors = useLocalStorage<ThemeColors>('theme-playground-colors', defaultColors)

  // Load from URL on mount
  onMounted(() => {
    const urlTheme = route.query.theme as string
    if (urlTheme) {
      try {
        const decoded = JSON.parse(decodeURIComponent(urlTheme))
        colors.value = { ...defaultColors, ...decoded }
      } catch (e) {
        console.warn('Failed to parse theme from URL')
      }
    }
  })

  // Update app config when colors change
  watchEffect(() => {
    updateAppConfig({
      ui: {
        ...appConfig.ui,
        colors: colors.value
      }
    })
  })

  // Update color
  const setColor = (name: ColorName, value: string) => {
    colors.value[name] = value
  }

  // Reset to defaults
  const reset = () => {
    colors.value = { ...defaultColors }
    router.replace({ query: {} })
  }

  // Apply preset
  const applyPreset = (preset: ThemeColors) => {
    colors.value = { ...preset }
  }

  // Get shareable URL
  const getShareUrl = () => {
    const encoded = encodeURIComponent(JSON.stringify(colors.value))
    const url = new URL(window.location.href)
    url.searchParams.set('theme', encoded)
    return url.toString()
  }

  // Copy share URL to clipboard
  const { copy, copied } = useClipboard()
  const shareTheme = async () => {
    const url = getShareUrl()
    await copy(url)
  }

  return {
    colors: readonly(colors),
    setColor,
    reset,
    applyPreset,
    getShareUrl,
    shareTheme,
    copied
  }
}