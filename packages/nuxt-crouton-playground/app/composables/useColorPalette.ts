export interface ColorPalette {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950: string
}

export interface HSLColor {
  h: number
  s: number
  l: number
}

export const useColorPalette = () => {
  /**
   * Generate a full Tailwind color palette (50-950) from a single HSL color
   */
  const generatePalette = (h: number, s: number, l: number): ColorPalette => {
    return {
      50: `hsl(${h}, ${s}%, ${Math.min(l + 40, 95)}%)`,
      100: `hsl(${h}, ${s}%, ${Math.min(l + 35, 90)}%)`,
      200: `hsl(${h}, ${s}%, ${Math.min(l + 25, 80)}%)`,
      300: `hsl(${h}, ${s}%, ${Math.min(l + 15, 70)}%)`,
      400: `hsl(${h}, ${s}%, ${Math.min(l + 5, 60)}%)`,
      500: `hsl(${h}, ${s}%, ${l}%)`,
      600: `hsl(${h}, ${s}%, ${Math.max(l - 10, 20)}%)`,
      700: `hsl(${h}, ${s}%, ${Math.max(l - 20, 15)}%)`,
      800: `hsl(${h}, ${s}%, ${Math.max(l - 30, 10)}%)`,
      900: `hsl(${h}, ${s}%, ${Math.max(l - 40, 5)}%)`,
      950: `hsl(${h}, ${s}%, ${Math.max(l - 45, 3)}%)`
    }
  }

  /**
   * Parse HSL color string to HSL object
   */
  const parseHSL = (hslString: string): HSLColor | null => {
    const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!match || !match[1] || !match[2] || !match[3]) return null

    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3])
    }
  }

  /**
   * Convert HSL to hex color
   */
  const hslToHex = (h: number, s: number, l: number): string => {
    const sNorm = s / 100
    const lNorm = l / 100

    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = lNorm - c / 2

    let r = 0, g = 0, b = 0

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x
    }

    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0')
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0')
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0')

    return `#${rHex}${gHex}${bHex}`
  }

  return {
    generatePalette,
    parseHSL,
    hslToHex
  }
}
