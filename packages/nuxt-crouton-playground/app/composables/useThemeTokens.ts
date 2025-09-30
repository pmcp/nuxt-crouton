export interface ThemeTokens {
  // Backgrounds
  bg: string
  bgElevated: string
  bgInverted: string
  
  // Text
  text: string
  textMuted: string
  textDimmed: string
  textInverted: string
  
  // Borders
  border: string
  borderDimmed: string
  
  // Other
  ring: string
  radius: string
}

export const useThemeTokens = () => {
  const tokens = useState<ThemeTokens>('theme-tokens', () => ({
    // Default light theme values (Nuxt UI defaults)
    bg: 'white',
    bgElevated: 'white',
    bgInverted: 'zinc-900',
    
    text: 'zinc-900',
    textMuted: 'zinc-500',
    textDimmed: 'zinc-400',
    textInverted: 'white',
    
    border: 'zinc-200',
    borderDimmed: 'zinc-100',
    
    ring: 'blue-500',
    radius: '0.5rem'
  }))

  // Apply tokens as CSS variables
  const applyTokens = () => {
    if (import.meta.client) {
      const root = document.documentElement
      
      // Backgrounds
      root.style.setProperty('--ui-bg', `var(--color-${tokens.value.bg.replace('-', '-')})`)
      root.style.setProperty('--ui-bg-elevated', `var(--color-${tokens.value.bgElevated.replace('-', '-')})`)
      root.style.setProperty('--ui-bg-inverted', `var(--color-${tokens.value.bgInverted.replace('-', '-')})`)
      
      // Text
      root.style.setProperty('--ui-text', `var(--color-${tokens.value.text.replace('-', '-')})`)
      root.style.setProperty('--ui-text-muted', `var(--color-${tokens.value.textMuted.replace('-', '-')})`)
      root.style.setProperty('--ui-text-dimmed', `var(--color-${tokens.value.textDimmed.replace('-', '-')})`)
      root.style.setProperty('--ui-text-inverted', `var(--color-${tokens.value.textInverted.replace('-', '-')})`)
      
      // Borders
      root.style.setProperty('--ui-border', `var(--color-${tokens.value.border.replace('-', '-')})`)
      root.style.setProperty('--ui-border-dimmed', `var(--color-${tokens.value.borderDimmed.replace('-', '-')})`)
      
      // Ring
      root.style.setProperty('--ui-ring', `var(--color-${tokens.value.ring.replace('-', '-')})`)
      
      // Radius
      root.style.setProperty('--ui-radius', tokens.value.radius)
    }
  }

  const updateToken = (key: keyof ThemeTokens, value: string) => {
    tokens.value[key] = value
    applyTokens()
  }

  const updateAllTokens = (newTokens: Partial<ThemeTokens>) => {
    tokens.value = { ...tokens.value, ...newTokens }
    applyTokens()
  }

  // Apply on mount
  onMounted(() => {
    applyTokens()
  })

  return {
    tokens: readonly(tokens),
    updateToken,
    updateAllTokens,
    applyTokens
  }
}
