/**
 * Team Theme Client Plugin
 *
 * Initializes useTeamTheme which registers its readiness gate and
 * fetches/applies the team theme. The composable self-manages gate resolution.
 */
export default defineNuxtPlugin({
  name: 'team-theme',
  enforce: 'post',
  setup() {
    useTeamTheme()
  }
})
