import type { ColorPalette } from './useColorPalette'

export interface TypographySettings {
  fontFamily: string
}

export interface SpacingSettings {
  radius: string
}

export interface AdvancedThemeState {
  typography: TypographySettings
  spacing: SpacingSettings
  customShades: Record<string, ColorPalette>
}

export const useAdvancedTheme = () => {
  const advanced = useState<AdvancedThemeState>('advanced-theme', () => ({
    typography: {
      fontFamily: 'system-ui, sans-serif'
    },
    spacing: {
      radius: '0.5rem'
    },
    customShades: {}
  }))

  // Apply advanced theme settings
  const applyAdvancedTheme = () => {
    if (!import.meta.client) return

    const root = document.documentElement

    // Typography
    root.style.setProperty('--ui-font-family', advanced.value.typography.fontFamily)

    // Spacing
    root.style.setProperty('--ui-radius', advanced.value.spacing.radius)
  }

  // Update typography
  const updateTypography = (settings: Partial<TypographySettings>) => {
    advanced.value.typography = { ...advanced.value.typography, ...settings }
    applyAdvancedTheme()
  }

  // Update spacing
  const updateSpacing = (settings: Partial<SpacingSettings>) => {
    advanced.value.spacing = { ...advanced.value.spacing, ...settings }
    applyAdvancedTheme()
  }

  // Add custom color shade palette
  const addCustomShade = (colorName: string, palette: ColorPalette) => {
    advanced.value.customShades[colorName] = palette

    if (!import.meta.client) return

    // Apply as CSS variables
    const root = document.documentElement
    Object.entries(palette).forEach(([shade, color]) => {
      root.style.setProperty(`--color-${colorName}-${shade}`, color)
    })
  }

  // Remove custom shade
  const removeCustomShade = (colorName: string) => {
    delete advanced.value.customShades[colorName]

    if (!import.meta.client) return

    // Remove CSS variables
    const root = document.documentElement
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
    shades.forEach(shade => {
      root.style.removeProperty(`--color-${colorName}-${shade}`)
    })
  }

  // Apply on mount
  onMounted(() => {
    applyAdvancedTheme()
  })

  // Font family options
  const fontFamilyOptions = [
    { label: 'System UI', value: 'system-ui, sans-serif' },
    { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { label: 'Roboto', value: 'Roboto, system-ui, sans-serif' },
    { label: 'Open Sans', value: '"Open Sans", system-ui, sans-serif' },
    { label: 'Monospace', value: 'ui-monospace, monospace' }
  ]

  // Radius options
  const radiusOptions = [
    { label: 'None', value: '0' },
    { label: 'Small', value: '0.25rem' },
    { label: 'Default', value: '0.5rem' },
    { label: 'Medium', value: '0.75rem' },
    { label: 'Large', value: '1rem' },
    { label: 'XLarge', value: '1.5rem' }
  ]

  return {
    advanced: readonly(advanced),
    updateTypography,
    updateSpacing,
    addCustomShade,
    removeCustomShade,
    applyAdvancedTheme,
    fontFamilyOptions,
    radiusOptions
  }
}
