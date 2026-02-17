/**
 * Team Theme Plugin (Universal, Async)
 *
 * Fetches the team theme during SSR so the HTML renders with the correct colors.
 * Uses useState to transfer the theme data to the client (no double fetch).
 * On client hydration, applies the already-fetched theme immediately.
 */
import type { TeamThemeSettings } from '../composables/useTeamTheme'

export default defineNuxtPlugin({
  name: 'team-theme',
  enforce: 'post',
  async setup() {
    const { teamId } = useTeamContext()
    if (!teamId.value) return

    // Shared state — SSR result is serialized and hydrated on client
    const themeState = useState<TeamThemeSettings>('team-theme-data', () => ({}))

    // Only fetch if not already populated (client gets hydrated SSR value)
    if (!themeState.value.primary) {
      try {
        const data = await $fetch<TeamThemeSettings>(
          `/api/teams/${teamId.value}/settings/theme`
        )
        themeState.value = data ?? {}
      } catch {
        // Theme fetch failed, use defaults
      }
    }

    // Apply theme to Nuxt UI
    const primary = themeState.value.primary || 'emerald'
    const neutral = themeState.value.neutral || 'slate'
    const radius = themeState.value.radius ?? 0.25

    updateAppConfig({
      ui: {
        colors: { primary, neutral }
      }
    })

    if (import.meta.client) {
      document.documentElement.style.setProperty('--ui-radius', `${radius}rem`)
    }
  }
})
