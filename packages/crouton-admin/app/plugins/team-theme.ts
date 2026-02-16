/**
 * Team Theme Plugin (Universal)
 *
 * Runs during SSR and client. Initializes useTeamTheme which registers its
 * readiness gate and fetches/applies the team theme via useFetch.
 * During SSR, the fetch resolves before rendering so HTML arrives with
 * correct team colors — no FOUC.
 */
export default defineNuxtPlugin({
  name: 'team-theme',
  enforce: 'post',
  setup() {
    useTeamTheme()
  }
})
