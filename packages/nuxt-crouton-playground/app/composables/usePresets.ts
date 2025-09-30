import type { ThemeColors } from './useThemeState'

export interface ThemePreset {
  id: string
  name: string
  description: string
  colors: ThemeColors
}

export const usePresets = () => {
  const presets: ThemePreset[] = [
    {
      id: 'default',
      name: 'Default',
      description: 'Clean and modern green theme',
      colors: {
        primary: 'green',
        secondary: 'blue',
        success: 'green',
        info: 'blue',
        warning: 'yellow',
        error: 'red',
        neutral: 'slate'
      }
    },
    {
      id: 'midnight',
      name: 'Midnight',
      description: 'Dark blue professional theme',
      colors: {
        primary: 'blue',
        secondary: 'indigo',
        success: 'emerald',
        info: 'sky',
        warning: 'amber',
        error: 'rose',
        neutral: 'slate'
      }
    },
    {
      id: 'ocean',
      name: 'Ocean',
      description: 'Refreshing cyan and teal',
      colors: {
        primary: 'cyan',
        secondary: 'teal',
        success: 'emerald',
        info: 'sky',
        warning: 'amber',
        error: 'red',
        neutral: 'slate'
      }
    },
    {
      id: 'forest',
      name: 'Forest',
      description: 'Natural green tones',
      colors: {
        primary: 'emerald',
        secondary: 'teal',
        success: 'green',
        info: 'cyan',
        warning: 'yellow',
        error: 'red',
        neutral: 'stone'
      }
    },
    {
      id: 'sunset',
      name: 'Sunset',
      description: 'Warm orange and pink',
      colors: {
        primary: 'orange',
        secondary: 'pink',
        success: 'green',
        info: 'blue',
        warning: 'amber',
        error: 'red',
        neutral: 'neutral'
      }
    },
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'Professional blue and gray',
      colors: {
        primary: 'blue',
        secondary: 'slate',
        success: 'green',
        info: 'sky',
        warning: 'yellow',
        error: 'red',
        neutral: 'gray'
      }
    },
    {
      id: 'neon',
      name: 'Neon',
      description: 'Vibrant purple and pink',
      colors: {
        primary: 'purple',
        secondary: 'fuchsia',
        success: 'lime',
        info: 'cyan',
        warning: 'yellow',
        error: 'rose',
        neutral: 'zinc'
      }
    },
    {
      id: 'nature',
      name: 'Nature',
      description: 'Earthy greens and browns',
      colors: {
        primary: 'lime',
        secondary: 'green',
        success: 'emerald',
        info: 'teal',
        warning: 'orange',
        error: 'red',
        neutral: 'stone'
      }
    }
  ]

  /**
   * Generate random theme colors
   */
  const generateRandomTheme = (): ThemeColors => {
    const tailwindColors = [
      'slate', 'gray', 'zinc', 'neutral', 'stone',
      'red', 'orange', 'amber', 'yellow', 'lime', 'green',
      'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo',
      'violet', 'purple', 'fuchsia', 'pink', 'rose'
    ]

    const getRandomColor = () => tailwindColors[Math.floor(Math.random() * tailwindColors.length)] || 'blue'

    return {
      primary: getRandomColor(),
      secondary: getRandomColor(),
      success: getRandomColor(),
      info: getRandomColor(),
      warning: getRandomColor(),
      error: getRandomColor(),
      neutral: getRandomColor()
    }
  }

  /**
   * Apply a preset theme
   */
  const applyPreset = (presetId: string) => {
    const { updateAllColors } = useThemeState()
    const preset = presets.find(p => p.id === presetId)

    if (preset) {
      updateAllColors(preset.colors)
    }
  }

  /**
   * Apply random theme
   */
  const applyRandomTheme = () => {
    const { updateAllColors } = useThemeState()
    const randomColors = generateRandomTheme()
    updateAllColors(randomColors)
  }

  return {
    presets,
    generateRandomTheme,
    applyPreset,
    applyRandomTheme
  }
}