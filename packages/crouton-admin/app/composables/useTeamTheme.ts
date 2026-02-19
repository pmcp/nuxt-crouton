/**
 * Team Theme Composable
 *
 * Provides reactive access to the team theme and methods to update it.
 * The theme is initially fetched by the team-theme plugin (during SSR).
 * This composable reads from the shared useState and handles live updates.
 *
 * @example
 * ```typescript
 * const { theme, isLoading, updateTheme, refresh } = useTeamTheme()
 *
 * // Apply a preset (admin only)
 * await updateTheme({ preset: 'blackandwhite' })
 *
 * // Apply custom colors (admin only)
 * await updateTheme({ preset: 'custom', primary: 'blue', neutral: 'slate', radius: 0.25 })
 * ```
 */
import { computed, watch, readonly } from 'vue'
import { updateAppConfig } from '#imports'

/**
 * Primary color options (Tailwind CSS colors)
 */
export type ThemePrimaryColor =
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green'
  | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo'
  | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

/**
 * Neutral color options
 */
export type ThemeNeutralColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'

/**
 * Border radius options (in rem)
 */
export type ThemeRadius = 0 | 0.125 | 0.25 | 0.375 | 0.5

/**
 * Named theme presets
 */
export type ThemePreset = 'custom' | 'blackandwhite' | 'ko'

/**
 * Team theme settings
 */
export interface TeamThemeSettings {
  preset?: ThemePreset
  primary?: ThemePrimaryColor
  neutral?: ThemeNeutralColor
  radius?: ThemeRadius
  /** Whether non-admin users can switch the global UI theme themselves. Default: true */
  allowUserThemes?: boolean
}

/**
 * Preset configuration — visual metadata + what gets applied to Nuxt UI
 */
export interface ThemePresetConfig {
  label: string
  description: string
  /** Hex color for the primary preview swatch */
  previewPrimary: string
  /** Hex color for the neutral preview swatch */
  previewNeutral: string
  /** Config passed to updateAppConfig({ ui: ... }) */
  ui: Record<string, unknown>
}

/**
 * Available primary colors for the picker
 */
export const PRIMARY_COLORS: ThemePrimaryColor[] = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo',
  'violet', 'purple', 'fuchsia', 'pink', 'rose'
]

/**
 * Available neutral colors for the picker
 */
export const NEUTRAL_COLORS: ThemeNeutralColor[] = [
  'slate', 'gray', 'zinc', 'neutral', 'stone'
]

/**
 * Available radius options for the picker
 */
export const RADIUS_OPTIONS: ThemeRadius[] = [0, 0.125, 0.25, 0.375, 0.5]

/**
 * Default theme values
 */
export const DEFAULT_THEME: Required<TeamThemeSettings> = {
  preset: 'custom',
  primary: 'emerald',
  neutral: 'slate',
  radius: 0.25
}

/**
 * Nuxt UI v4 structural defaults.
 * Applied when switching to 'custom' to undo any preset overrides.
 * Must explicitly cover every key that any preset touches.
 */
const NUXT_UI_STRUCTURAL_DEFAULTS = {
  theme: { defaultVariants: { size: 'md' } },
  button: { defaultVariants: { variant: 'solid' } },
  input: { defaultVariants: { variant: 'outline' } },
  select: { defaultVariants: { variant: 'outline' } },
  card: { defaultVariants: { variant: 'outline' } },
  alert: { defaultVariants: { variant: 'soft' } },
  textarea: { defaultVariants: { variant: 'outline' } }
}

/**
 * Named theme presets with their Nuxt UI configurations.
 * Each preset fully declares the keys it touches so switching between
 * presets always produces correct results.
 */
export const THEME_PRESETS: Record<ThemePreset, ThemePresetConfig> = {
  custom: {
    label: 'Custom',
    description: 'Choose your own colors and radius',
    previewPrimary: '#10b981', // emerald-500
    previewNeutral: '#64748b', // slate-500
    ui: {} // handled via individual color/radius settings
  },
  blackandwhite: {
    label: 'Black & White',
    description: 'Compact, monochrome dashboard with subtle form variants',
    previewPrimary: '#171717', // neutral-900
    previewNeutral: '#737373', // neutral-500
    ui: {
      colors: { primary: 'neutral', neutral: 'neutral' },
      theme: { defaultVariants: { size: 'sm' } },
      // Override button variant base classes to inject bw-* CSS classes.
      // The blackandwhite layer bundles main.css which defines these with
      // !important to reliably override Nuxt UI's CSS-variable-based defaults
      // and ensure proper contrast in both light and dark modes.
      button: {
        defaultVariants: { variant: 'solid' },
        variants: {
          variant: {
            solid: 'bw-solid',
            outline: 'bw-outline',
            soft: 'bw-soft',
            ghost: 'bw-ghost',
            link: 'bw-link'
          }
        }
      },
      input: { defaultVariants: { variant: 'subtle' } },
      select: { defaultVariants: { variant: 'subtle' } },
      card: { defaultVariants: { variant: 'outline' } },
      alert: { defaultVariants: { variant: 'subtle' } },
      textarea: { defaultVariants: { variant: 'subtle' } }
    }
  },

  ko: {
    label: 'KO',
    description: 'Hardware-inspired with tactile bezels and orange accents',
    previewPrimary: '#FA5F28', // ko-accent-orange
    previewNeutral: '#78716c', // stone-500
    ui: {
      colors: { primary: 'orange', neutral: 'stone' },
      theme: { defaultVariants: { size: 'md' } },
      button: {
        defaultVariants: { variant: 'ko' },
        variants: {
          variant: {
            ko: '',
            'ko-solid': '',
            'ko-outline': '',
            'ko-soft': '',
            'ko-ghost': '',
            'ko-link': ''
          }
        },
        compoundVariants: [
          { color: 'primary', variant: 'ko', class: 'ko-bezel ko-bezel--orange' },
          { color: 'neutral', variant: 'ko', class: 'ko-bezel ko-bezel--dark' },
          { color: 'error', variant: 'ko', class: 'ko-bezel ko-bezel--red' },
          { color: 'secondary', variant: 'ko', class: 'ko-bezel ko-bezel--pink' },
          { color: 'info', variant: 'ko', class: 'ko-bezel ko-bezel--blue' },
          { variant: 'ko', class: 'ko-bezel' },
          { variant: 'ko-solid', color: 'primary', class: 'ko-bezel ko-bezel--orange' },
          { variant: 'ko-solid', color: 'neutral', class: 'ko-bezel ko-bezel--dark' },
          { variant: 'ko-solid', class: 'ko-bezel' },
          { variant: 'ko-outline', color: 'primary', class: 'ko-outline ko-outline--orange' },
          { variant: 'ko-outline', color: 'neutral', class: 'ko-outline ko-outline--dark' },
          { variant: 'ko-outline', class: 'ko-outline' },
          { variant: 'ko-soft', color: 'primary', class: 'ko-soft ko-soft--orange' },
          { variant: 'ko-soft', color: 'neutral', class: 'ko-soft ko-soft--dark' },
          { variant: 'ko-soft', class: 'ko-soft' },
          { variant: 'ko-ghost', color: 'primary', class: 'ko-ghost ko-ghost--orange' },
          { variant: 'ko-ghost', color: 'neutral', class: 'ko-ghost ko-ghost--dark' },
          { variant: 'ko-ghost', class: 'ko-ghost' },
          { variant: 'ko-link', color: 'primary', class: 'ko-link ko-link--orange' },
          { variant: 'ko-link', color: 'neutral', class: 'ko-link ko-link--dark' },
          { variant: 'ko-link', class: 'ko-link' }
        ]
      },
      input: {
        defaultVariants: { variant: 'ko' },
        variants: { variant: { ko: { root: 'ko-input', base: 'ko-input-base' } } }
      },
      card: {
        defaultVariants: { variant: 'ko' },
        variants: { variant: { ko: { root: 'ko-card', header: 'ko-card-header', body: 'ko-card-body', footer: 'ko-card-footer' } } }
      }
    }
  }
}

/**
 * Apply theme settings to Nuxt UI via updateAppConfig.
 * Exported as a standalone function so the plugin can use it too.
 */
export function applyThemeSettings(settings: TeamThemeSettings) {
  const preset = settings.preset ?? 'custom'
  const radius = settings.radius ?? DEFAULT_THEME.radius

  if (preset !== 'custom') {
    updateAppConfig({ ui: THEME_PRESETS[preset].ui })
  }
  else {
    const primary = settings.primary ?? DEFAULT_THEME.primary
    const neutral = settings.neutral ?? DEFAULT_THEME.neutral
    updateAppConfig({
      ui: {
        ...NUXT_UI_STRUCTURAL_DEFAULTS,
        colors: { primary, neutral }
      }
    })
  }

  if (import.meta.client) {
    document.documentElement.style.setProperty('--ui-radius', `${radius}rem`)
    // Set data-theme for ambient CSS (e.g. background colors, global font overrides)
    if (preset === 'custom') {
      document.documentElement.removeAttribute('data-theme')
    }
    else {
      document.documentElement.dataset.theme = preset
    }
  }
}

export function useTeamTheme() {
  const { teamId } = useTeamContext()

  // Shared state with the plugin (populated during SSR)
  const themeData = useState<TeamThemeSettings>('team-theme-data', () => ({}))
  // Tracks whether the initial fetch has completed (avoids re-fetch on hydration)
  const themeFetched = useState<boolean>('team-theme-fetched', () => false)

  // Computed theme with defaults applied
  const theme = computed<Required<TeamThemeSettings>>(() => ({
    preset: themeData.value.preset ?? DEFAULT_THEME.preset,
    primary: themeData.value.primary ?? DEFAULT_THEME.primary,
    neutral: themeData.value.neutral ?? DEFAULT_THEME.neutral,
    radius: themeData.value.radius ?? DEFAULT_THEME.radius,
    allowUserThemes: themeData.value.allowUserThemes ?? true
  }))

  const isLoading = computed(() => !themeFetched.value)

  // Watch for live theme changes (e.g. admin editing theme settings)
  watch(theme, (newTheme) => {
    applyThemeSettings(newTheme)
  })

  // Refresh theme from API
  async function refresh() {
    if (!teamId.value) return
    try {
      const data = await $fetch<TeamThemeSettings>(
        `/api/teams/${teamId.value}/settings/theme`
      )
      themeData.value = data ?? {}
      themeFetched.value = true
      applyThemeSettings(theme.value)
    }
    catch {
      themeFetched.value = true
    }
  }

  // Update theme (for admin UI)
  async function updateTheme(settings: Partial<TeamThemeSettings>) {
    if (!teamId.value) {
      throw new Error('No team context available')
    }

    const response = await $fetch<TeamThemeSettings>(
      `/api/teams/${teamId.value}/settings/theme`,
      {
        method: 'PATCH',
        body: settings
      }
    )

    await refresh()
    return response
  }

  // Reset to defaults
  async function resetTheme() {
    return updateTheme({
      preset: DEFAULT_THEME.preset,
      primary: DEFAULT_THEME.primary,
      neutral: DEFAULT_THEME.neutral,
      radius: DEFAULT_THEME.radius
    })
  }

  return {
    theme: readonly(theme),
    isLoading,
    teamId,
    updateTheme,
    resetTheme,
    refresh,
    /** Apply theme settings immediately (for live preview) */
    applyTheme: applyThemeSettings
  }
}
