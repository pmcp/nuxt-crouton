// Theme Toggle Composable
// Provides reactive theme switching across the entire UI

export type ThemeName = 'ko' | 'minimal' | 'kr11' | 'default'

export interface ThemeConfig {
  name: ThemeName
  label: string
  description?: string
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  { name: 'default', label: 'Default', description: 'Nuxt UI default styling' },
  { name: 'ko', label: 'KO', description: 'Hardware-inspired (Teenage Engineering)' },
  { name: 'minimal', label: 'Minimal', description: 'Clean, Bauhaus-inspired' },
  { name: 'kr11', label: 'KR-11', description: 'Friendly drum machine aesthetic' }
]

const STORAGE_KEY = 'nuxt-crouton-theme'

export function useThemeToggle() {
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
  }

  // Cycle through themes
  function cycleTheme() {
    const currentIndex = AVAILABLE_THEMES.findIndex(t => t.name === currentTheme.value)
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length
    setTheme(AVAILABLE_THEMES[nextIndex].name)
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

  // Initialize body class on client
  if (import.meta.client) {
    updateBodyClass(currentTheme.value)
  }

  return {
    // State
    currentTheme: readonly(currentTheme),
    currentThemeConfig,
    variant,
    themes: AVAILABLE_THEMES,

    // Actions
    setTheme,
    cycleTheme
  }
}