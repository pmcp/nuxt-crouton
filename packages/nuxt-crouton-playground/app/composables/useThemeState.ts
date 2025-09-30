import type { ColorPalette } from './useColorPalette'

export type ColorName = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export interface ThemeColors {
  primary: string
  secondary: string
  success: string
  info: string
  warning: string
  error: string
  neutral: string
}

export interface ThemeState {
  colors: ThemeColors
  customPalettes: Record<string, ColorPalette>
  history: ThemeColors[]
  historyIndex: number
}

export const useThemeState = () => {
  const theme = useState<ThemeState>('playground-theme', () => ({
    colors: {
      primary: 'green',
      secondary: 'blue',
      success: 'green',
      info: 'blue',
      warning: 'yellow',
      error: 'red',
      neutral: 'slate'
    },
    customPalettes: {},
    history: [],
    historyIndex: -1
  }))

  // Apply theme changes to runtime app.config
  const applyTheme = () => {
    const appConfig = useAppConfig()
    if (!appConfig.ui) {
      appConfig.ui = { colors: theme.value.colors } as any
    } else if (!appConfig.ui.colors) {
      appConfig.ui.colors = theme.value.colors as any
    } else {
      appConfig.ui.colors = { ...theme.value.colors } as any
    }
  }

  // Update a single color
  const updateColor = (colorName: ColorName, colorValue: string) => {
    // Save current state to history before making changes
    if (theme.value.historyIndex < theme.value.history.length - 1) {
      // Clear forward history if we're not at the end
      theme.value.history = theme.value.history.slice(0, theme.value.historyIndex + 1)
    }

    theme.value.history.push({ ...theme.value.colors })
    theme.value.historyIndex++

    // Limit history to 50 items
    if (theme.value.history.length > 50) {
      theme.value.history.shift()
      theme.value.historyIndex--
    }

    theme.value.colors[colorName] = colorValue
    applyTheme()
  }

  // Update all colors at once (for preset loading)
  const updateAllColors = (colors: Partial<ThemeColors>) => {
    // Save current state to history
    if (theme.value.historyIndex < theme.value.history.length - 1) {
      theme.value.history = theme.value.history.slice(0, theme.value.historyIndex + 1)
    }

    theme.value.history.push({ ...theme.value.colors })
    theme.value.historyIndex++

    if (theme.value.history.length > 50) {
      theme.value.history.shift()
      theme.value.historyIndex--
    }

    theme.value.colors = { ...theme.value.colors, ...colors }
    applyTheme()
  }

  // Undo last change
  const undo = () => {
    if (theme.value.historyIndex > 0) {
      theme.value.historyIndex--
      const historyItem = theme.value.history[theme.value.historyIndex]
      if (historyItem) {
        theme.value.colors = { ...historyItem }
        applyTheme()
      }
    }
  }

  // Redo last undone change
  const redo = () => {
    if (theme.value.historyIndex < theme.value.history.length - 1) {
      theme.value.historyIndex++
      const historyItem = theme.value.history[theme.value.historyIndex]
      if (historyItem) {
        theme.value.colors = { ...historyItem }
        applyTheme()
      }
    }
  }

  // Reset to default theme
  const resetTheme = () => {
    const defaultColors: ThemeColors = {
      primary: 'green',
      secondary: 'blue',
      success: 'green',
      info: 'blue',
      warning: 'yellow',
      error: 'red',
      neutral: 'slate'
    }
    updateAllColors(defaultColors)
  }

  // Add custom palette
  const addCustomPalette = (name: string, palette: ColorPalette) => {
    theme.value.customPalettes[name] = palette
  }

  // Check if we can undo/redo
  const canUndo = computed(() => theme.value.historyIndex > 0)
  const canRedo = computed(() => theme.value.historyIndex < theme.value.history.length - 1)

  // Initialize theme on mount
  onMounted(() => {
    applyTheme()
  })

  return {
    theme: readonly(theme),
    updateColor,
    updateAllColors,
    resetTheme,
    addCustomPalette,
    undo,
    redo,
    canUndo,
    canRedo
  }
}