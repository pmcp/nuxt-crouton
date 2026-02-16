/**
 * Team Theme Client Plugin
 *
 * Automatically initializes team theme when app mounts and team context is available.
 * This ensures the team's custom colors are applied as soon as possible.
 */
import { useTeamTheme } from '../composables/useTeamTheme'

export default defineNuxtPlugin({
  name: 'team-theme',
  enforce: 'post', // Run after other plugins
  setup() {
    // Use useTeamContext to properly resolve team identity
    // (avoids false positives from [id] params that aren't team IDs)
    const { hasTeamContext } = useTeamContext()

    // Watch for team context and initialize theme
    watch(hasTeamContext, (hasContext) => {
      if (hasContext) {
        // Initialize the composable which will fetch and apply the theme
        const { theme, applyTheme } = useTeamTheme()

        // Apply theme immediately with current values
        applyTheme(theme.value)
      }
    }, { immediate: true })
  }
})
