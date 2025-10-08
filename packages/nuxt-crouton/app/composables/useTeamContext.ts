/**
 * Team Context Resolution
 *
 * Smart helper to resolve team identifiers for API paths.
 * Tries to use the app's useTeam() composable if available (returns team ID),
 * otherwise falls back to route.params.team (might be slug or ID).
 *
 * This allows nuxt-crouton to work seamlessly with SuperSaaS-style apps
 * that use team slugs in routes but need team IDs for API calls.
 */

/**
 * Get the team identifier for building API paths
 *
 * Resolution strategy:
 * 1. Try to use app's useTeam() composable → returns currentTeam.id
 * 2. Fall back to route.params.team (direct from URL)
 *
 * @returns Team ID (preferred) or team slug/param, or undefined if not available
 *
 * @example
 * ```typescript
 * const { getTeamId } = useTeamContext()
 * const teamId = getTeamId()
 * const apiPath = `/api/teams/${teamId}/members`
 * ```
 */
export function useTeamContext() {
  const route = useRoute()

  /**
   * Get team identifier for API calls
   * Prefers team ID from useTeam() composable (if available), falls back to route param
   */
  const getTeamId = (): string | undefined => {
    // Try to call useTeam() if the consuming app provides it
    // This works because Nuxt auto-imports composables globally
    try {
      const { currentTeam } = useTeam()
      if (currentTeam?.value?.id) {
        console.debug('[useTeamContext] Found team ID from useTeam():', currentTeam.value.id)
        return currentTeam.value.id
      }
    } catch (error) {
      // useTeam not available in this app, that's fine
      console.debug('[useTeamContext] useTeam() not available, using route param')
    }

    // Fallback to route param (might be ID or slug, depending on app)
    const teamParam = route.params.team
    return typeof teamParam === 'string' ? teamParam : undefined
  }

  /**
   * Get team slug from route or useTeam()
   * Useful for displaying team info in UI
   */
  const getTeamSlug = (): string | undefined => {
    try {
      const { currentTeam } = useTeam()
      if (currentTeam?.value?.slug) {
        return currentTeam.value.slug
      }
    } catch {
      // useTeam not available
    }

    // Fallback to route param (might be slug or ID)
    const teamParam = route.params.team
    return typeof teamParam === 'string' ? teamParam : undefined
  }

  return {
    getTeamId,
    getTeamSlug
  }
}
