/**
 * Team Theme Composable
 *
 * Fetches and applies team-specific theme settings (primary color, neutral color, radius).
 * Uses Nuxt's updateAppConfig to apply theme changes at runtime.
 * Integrates with useAppReady to prevent FOUC by gating app readiness until theme loads.
 *
 * @example
 * ```typescript
 * const { theme, isLoading, updateTheme, refresh } = useTeamTheme()
 *
 * // Update theme (admin only)
 * await updateTheme({ primary: 'blue', neutral: 'slate', radius: 0.25 })
 * ```
 */
import { ref, computed, watch, readonly } from 'vue'
import { useRoute, updateAppConfig } from '#imports'

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
  const route = useRoute()
  const { registerGate, resolveGate } = useAppReady()

  // Register readiness gate
  registerGate('team-theme')

  // Get team ID from route params
  const teamId = computed(() => {
    // Check common param names: id, team, teamId
    return (route.params.id as string)
      || (route.params.team as string)
      || (route.params.teamId as string)
      || null
  })

  // If no team context, resolve gate immediately
  if (!teamId.value) {
    resolveGate('team-theme')
  }

  // Fetch team theme settings
  const themeData = ref<TeamThemeSettings>({})
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<Error | null>(null)

  // Fetch function
  async function fetchTheme() {
    if (!teamId.value) return

    status.value = 'pending'
    error.value = null

    try {
      const data = await $fetch<TeamThemeSettings>(
        `/api/teams/${teamId.value}/settings/theme`
      )
      themeData.value = data ?? {}
      status.value = 'success'
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to fetch theme')
      status.value = 'error'
    } finally {
      // Resolve gate on success or error — never block the app for a theme failure
      resolveGate('team-theme')
    }
  }

  // Refresh function
  async function refresh() {
    await fetchTheme()
  }

  // Watch for team changes and fetch
  watch(teamId, () => {
    if (teamId.value) {
      fetchTheme()
    } else {
      resolveGate('team-theme')
    }
  }, { immediate: true })

  // Computed theme with defaults
  const theme = computed<Required<TeamThemeSettings>>(() => ({
    primary: themeData.value.primary ?? DEFAULT_THEME.primary,
    neutral: themeData.value.neutral ?? DEFAULT_THEME.neutral,
    radius: themeData.value.radius ?? DEFAULT_THEME.radius
  }))

  // Loading state
  const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')

  // Apply theme to Nuxt UI via updateAppConfig
  function applyTheme(settings: TeamThemeSettings) {
    const primary = settings.primary ?? DEFAULT_THEME.primary
    const neutral = settings.neutral ?? DEFAULT_THEME.neutral
    const radius = settings.radius ?? DEFAULT_THEME.radius

    // Update Nuxt UI colors via app config
    updateAppConfig({
      ui: {
        colors: {
          primary,
          neutral
        }
      }
    })

    // Apply radius via CSS custom property
    if (import.meta.client) {
      document.documentElement.style.setProperty('--ui-radius', `${radius}rem`)
    }
  }

  // Watch for theme changes and apply them
  watch(theme, (newTheme) => {
    applyTheme(newTheme)
  }, { immediate: true })

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

    // Refresh the cached data
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
    // State
    theme: readonly(theme),
    isLoading,
    error,
    teamId,

    // Actions
    updateTheme,
    resetTheme,
    refresh,
    applyTheme
  }
}
