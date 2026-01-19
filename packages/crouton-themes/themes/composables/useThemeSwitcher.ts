// Theme Switcher Composable
// Provides reactive theme switching across the entire UI
// Uses updateAppConfig() to swap Nuxt UI component styles at runtime

import { THEME_UI_CONFIGS } from '../configs/themeConfigs'

export type ThemeName = 'ko' | 'minimal' | 'kr11' | 'default'

export type BaseVariant = 'solid' | 'outline' | 'soft' | 'ghost' | 'link'

export interface ThemeConfig {
  name: ThemeName
  label: string
  description?: string
  /** Color swatches to preview the theme's vibe */
  colors: string[]
  /** Default base variant for this theme (solid, outline, ghost, etc.) */
  defaultVariant: BaseVariant
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    name: 'default',
    label: 'Default',
    description: 'Nuxt UI default styling',
    colors: ['#10b981', '#6b7280', '#f3f4f6'], // emerald, gray, light gray
    defaultVariant: 'solid'
  },
  {
    name: 'ko',
    label: 'KO',
    description: 'Hardware-inspired (Teenage Engineering)',
    colors: ['#f97316', '#1c1917', '#faf5f0'], // orange, dark, cream
    defaultVariant: 'solid' // KO uses solid tactile buttons
  },
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Clean, Bauhaus-inspired',
    colors: ['#000000', '#ffffff', '#e5e5e5'], // black, white, light gray
    defaultVariant: 'outline' // Minimal uses clean outlined style
  },
  {
    name: 'kr11',
    label: 'KR-11',
    description: 'Friendly drum machine aesthetic',
    colors: ['#6ee7b7', '#fcd34d', '#fca5a5'], // mint, gold, coral
    defaultVariant: 'soft' // KR-11 uses soft tactile pads
  }
]

const STORAGE_KEY = 'nuxt-crouton-theme'

export function useThemeSwitcher() {
  const appConfig = useAppConfig()

  // Reactive theme state - uses useState for SSR compatibility
  const currentTheme = useState<ThemeName>('crouton-theme', () => 'default')

  // Initialize from localStorage on client
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null
    if (stored && AVAILABLE_THEMES.some(t => t.name === stored)) {
      currentTheme.value = stored
    }
  }

  // Computed for current theme config
  const currentThemeConfig = computed(() =>
    AVAILABLE_THEMES.find(t => t.name === currentTheme.value) ?? AVAILABLE_THEMES[0]
  )

  // Get the variant name for Nuxt UI components
  // 'default' returns undefined to use Nuxt UI's default variant
  const variant = computed(() =>
    currentTheme.value === 'default' ? undefined : currentTheme.value
  )

  // Set theme and persist
  function setTheme(theme: ThemeName) {
    currentTheme.value = theme

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, theme)
      // Update body class for CSS custom properties
      updateBodyClass(theme)
    }

    // Swap Nuxt UI component styles via updateAppConfig
    // Using 'as any' because Nuxt UI's auto-generated types are complex
    // and don't match our simplified ThemeUIConfig interface
    const themeUIConfig = THEME_UI_CONFIGS[theme]
    if (themeUIConfig) {
      updateAppConfig({
        ui: themeUIConfig as any
      })
    }
  }

  // Cycle through themes
  function cycleTheme() {
    const currentIndex = AVAILABLE_THEMES.findIndex(t => t.name === currentTheme.value)
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length
    setTheme(AVAILABLE_THEMES[nextIndex]!.name)
  }

  // Update body class for theme-specific CSS variables
  function updateBodyClass(theme: ThemeName) {
    if (!import.meta.client) return

    // Remove all theme classes
    AVAILABLE_THEMES.forEach(t => {
      document.body.classList.remove(`theme-${t.name}`)
    })

    // Add current theme class
    if (theme !== 'default') {
      document.body.classList.add(`theme-${theme}`)
    }
  }

  // Initialize on client
  if (import.meta.client) {
    updateBodyClass(currentTheme.value)

    // Apply theme UI config on initialization
    const themeUIConfig = THEME_UI_CONFIGS[currentTheme.value]
    if (themeUIConfig) {
      updateAppConfig({
        ui: themeUIConfig as any
      })
    }
  }

  // Get variant with theme prefix for compound variants
  // e.g., getVariant('ghost') returns 'ko-ghost' when KO theme is active
  function getVariant(baseVariant: string = 'solid'): string {
    if (currentTheme.value === 'default') return baseVariant
    return `${currentTheme.value}-${baseVariant}`
  }

  return {
    // State
    currentTheme: readonly(currentTheme),
    currentThemeConfig,
    variant,
    themes: AVAILABLE_THEMES,

    // Actions
    setTheme,
    cycleTheme,
    getVariant
  }
}