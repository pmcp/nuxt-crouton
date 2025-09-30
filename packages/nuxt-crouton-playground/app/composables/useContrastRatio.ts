export interface ContrastResult {
  ratio: number
  AA: boolean
  AALarge: boolean
  AAA: boolean
  AAALarge: boolean
}

export const useContrastRatio = () => {
  /**
   * Convert hex color to RGB
   */
  const hexToRgb = (hex: string): [number, number, number] | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result || !result[1] || !result[2] || !result[3]) return null

    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ]
  }

  /**
   * Calculate relative luminance
   */
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    if (rs === undefined || gs === undefined || bs === undefined) return 0

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  /**
   * Calculate contrast ratio between two colors
   */
  const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1)
    const rgb2 = hexToRgb(color2)

    if (!rgb1 || !rgb2) return 0

    const lum1 = getLuminance(...rgb1)
    const lum2 = getLuminance(...rgb2)

    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * Check WCAG compliance for a contrast ratio
   */
  const checkWCAG = (ratio: number): ContrastResult => {
    return {
      ratio: Math.round(ratio * 100) / 100,
      AA: ratio >= 4.5,
      AALarge: ratio >= 3,
      AAA: ratio >= 7,
      AAALarge: ratio >= 4.5
    }
  }

  /**
   * Get contrast result between two colors
   */
  const checkContrast = (foreground: string, background: string): ContrastResult => {
    const ratio = getContrastRatio(foreground, background)
    return checkWCAG(ratio)
  }

  return {
    getContrastRatio,
    checkContrast,
    checkWCAG
  }
}