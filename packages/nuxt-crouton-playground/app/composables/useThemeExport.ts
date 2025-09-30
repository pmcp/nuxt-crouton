import { useClipboard } from '@vueuse/core'
import type { ThemeColors } from './useThemeState'
import type { ColorPalette } from './useColorPalette'

export const useThemeExport = () => {
  const { theme } = useThemeState()
  const { advanced } = useAdvancedTheme()

  /**
   * Generate app.config.ts code
   */
  const generateAppConfig = (colors: ThemeColors = theme.value.colors): string => {
    return `export default defineAppConfig({
  ui: {
    colors: {
      primary: '${colors.primary}',
      secondary: '${colors.secondary}',
      success: '${colors.success}',
      info: '${colors.info}',
      warning: '${colors.warning}',
      error: '${colors.error}',
      neutral: '${colors.neutral}'
    }
  }
})`
  }

  /**
   * Generate CSS for advanced settings
   */
  const generateAdvancedCSS = (): string => {
    const hasAdvanced = advanced.value.typography.fontFamily !== 'system-ui, sans-serif' ||
                       advanced.value.spacing.radius !== '0.5rem'

    if (!hasAdvanced) {
      return '// No advanced settings configured'
    }

    const css: string[] = []

    css.push(':root {')

    if (advanced.value.typography.fontFamily !== 'system-ui, sans-serif') {
      css.push(`  --ui-font-family: ${advanced.value.typography.fontFamily};`)
    }

    if (advanced.value.spacing.radius !== '0.5rem') {
      css.push(`  --ui-radius: ${advanced.value.spacing.radius};`)
    }

    css.push('}')

    return css.join('\n')
  }

  /**
   * Generate Tailwind config for custom palettes
   */
  const generateTailwindConfig = (palettes: Record<string, ColorPalette>): string => {
    if (Object.keys(palettes).length === 0) {
      return `// No custom palettes defined`
    }

    const paletteEntries = Object.entries(palettes)
      .map(([name, palette]) => {
        const colors = Object.entries(palette)
          .map(([shade, color]) => `          ${shade}: '${color}'`)
          .join(',\n')

        return `        ${name}: {
${colors}
        }`
      })
      .join(',\n')

    return `export default {
  theme: {
    extend: {
      colors: {
${paletteEntries}
      }
    }
  }
}`
  }

  /**
   * Export theme as JSON
   */
  const exportAsJSON = (): string => {
    const data = {
      colors: theme.value.colors,
      customPalettes: theme.value.customPalettes,
      advanced: {
        typography: advanced.value.typography,
        spacing: advanced.value.spacing
      }
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * Copy text to clipboard
   */
  const { copy, copied, isSupported } = useClipboard()

  const copyToClipboard = async (text: string) => {
    if (isSupported) {
      await copy(text)
    }
  }

  return {
    generateAppConfig,
    generateAdvancedCSS,
    generateTailwindConfig,
    exportAsJSON,
    copyToClipboard,
    copied
  }
}
