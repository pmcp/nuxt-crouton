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
 * // Update theme (admin only)
 * await updateTheme({ primary: 'blue', neutral: 'slate', radius: 0.25 })
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
 * Team theme settings
 */
export interface TeamThemeSettings {
  primary?: ThemePrimaryColor
  neutral?: ThemeNeutralColor
  radius?: ThemeRadius
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
  primary: 'emerald',
  neutral: 'slate',
  radius: 0.25
}

export function useTeamTheme() {
  const { teamId } = useTeamContext()

  // Shared state with the plugin (populated during SSR)
  const themeData = useState<TeamThemeSettings>('team-theme-data', () => ({}))

  // Computed theme with defaults
  const theme = computed<Required<TeamThemeSettings>>(() => ({
    primary: themeData.value.primary ?? DEFAULT_THEME.primary,
    neutral: themeData.value.neutral ?? DEFAULT_THEME.neutral,
    radius: themeData.value.radius ?? DEFAULT_THEME.radius
  }))

  // Loading state
  const isLoading = computed(() => !themeData.value.primary)

  // Apply theme to Nuxt UI via updateAppConfig
  function applyTheme(settings: TeamThemeSettings) {
    const primary = settings.primary ?? DEFAULT_THEME.primary
    const neutral = settings.neutral ?? DEFAULT_THEME.neutral
    const radius = settings.radius ?? DEFAULT_THEME.radius

    updateAppConfig({
      ui: {
        colors: {
          primary,
          neutral
        }
      }
    })

    if (import.meta.client) {
      document.documentElement.style.setProperty('--ui-radius', `${radius}rem`)
    }
  }

  // Watch for live theme changes (e.g. admin editing theme settings)
  watch(theme, (newTheme) => {
    applyTheme(newTheme)
  })

  // Refresh theme from API
  async function refresh() {
    if (!teamId.value) return
    try {
      const data = await $fetch<TeamThemeSettings>(
        `/api/teams/${teamId.value}/settings/theme`
      )
      themeData.value = data ?? {}
      applyTheme(theme.value)
    } catch {
      // Refresh failed, keep current theme
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
    applyTheme
  }
}
