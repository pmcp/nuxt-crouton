import { useClipboard } from '@vueuse/core'
import type { ThemeColors } from './useTheme'

export const useExport = () => {
  const { copy, copied } = useClipboard()

  const generateAppConfig = (colors: ThemeColors): string => {
    return `export default defineAppConfig({
  ui: {
    colors: {
      primary: '${colors.primary}',
      secondary: '${colors.secondary}',
      success: '${colors.success}',
      warning: '${colors.warning}',
      error: '${colors.error}',
      neutral: '${colors.neutral}'
    }
  }
})`
  }

  const generateJSON = (colors: ThemeColors): string => {
    return JSON.stringify(colors, null, 2)
  }

  const copyCode = async (code: string) => {
    await copy(code)
  }

  return {
    generateAppConfig,
    generateJSON,
    copyCode,
    copied
  }
}