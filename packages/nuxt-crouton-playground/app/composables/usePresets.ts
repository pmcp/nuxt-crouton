import type { ThemeColors, ThemePreset } from './useTheme'

export const usePresets = () => {
  const presets: ThemePreset[] = [
    {
      name: 'Midnight',
      colors: {
        primary: 'indigo',
        secondary: 'purple',
        success: 'emerald',
        warning: 'amber',
        error: 'rose',
        neutral: 'slate'
      }
    },
    {
      name: 'Ocean',
      colors: {
        primary: 'cyan',
        secondary: 'blue',
        success: 'teal',
        warning: 'orange',
        error: 'red',
        neutral: 'gray'
      }
    },
    {
      name: 'Forest',
      colors: {
        primary: 'green',
        secondary: 'lime',
        success: 'emerald',
        warning: 'yellow',
        error: 'red',
        neutral: 'stone'
      }
    },
    {
      name: 'Sunset',
      colors: {
        primary: 'orange',
        secondary: 'pink',
        success: 'green',
        warning: 'amber',
        error: 'red',
        neutral: 'warmGray'
      }
    },
    {
      name: 'Neon',
      colors: {
        primary: 'fuchsia',
        secondary: 'violet',
        success: 'lime',
        warning: 'yellow',
        error: 'rose',
        neutral: 'zinc'
      }
    }
  ]

  // Available Tailwind colors
  const tailwindColors = [
    'slate', 'gray', 'zinc', 'neutral', 'stone',
    'red', 'orange', 'amber', 'yellow', 'lime',
    'green', 'emerald', 'teal', 'cyan', 'sky',
    'blue', 'indigo', 'violet', 'purple', 'fuchsia',
    'pink', 'rose'
  ]

  // Random theme generator
  const generateRandom = (): ThemeColors => {
    const getRandomColor = () => {
      const color = tailwindColors[Math.floor(Math.random() * tailwindColors.length)]
      return color || 'blue'
    }

    return {
      primary: getRandomColor(),
      secondary: getRandomColor(),
      success: getRandomColor(),
      warning: getRandomColor(),
      error: getRandomColor(),
      neutral: getRandomColor()
    }
  }

  return {
    presets,
    tailwindColors,
    generateRandom
  }
}