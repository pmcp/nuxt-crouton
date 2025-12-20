/**
 * Team Context Resolution (Compatibility Wrapper)
 *
 * Smart helper to resolve team identifiers for API paths.
 * Tries to use the app's useTeam() composable if available (returns team ID),
 * otherwise falls back to route.params.team (might be slug or ID).
 *
 * When @crouton/auth is installed, this composable integrates with Better Auth's
 * mode-aware team resolution (multi-tenant, single-tenant, personal).
 *
 * API:
 * - getTeamId(): string | undefined - Function-based getter (original API)
 * - getTeamSlug(): string | undefined - Function-based getter (original API)
 * - teamId: ComputedRef<string | null> - Computed ref (@crouton/auth compatible)
 * - teamSlug: ComputedRef<string | null> - Computed ref (@crouton/auth compatible)
 * - buildDashboardUrl(path): string - Build team-scoped dashboard URLs
 * - buildApiUrl(path): string - Build team-scoped API URLs
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
 * const { getTeamId, buildDashboardUrl } = useTeamContext()
 * const teamId = getTeamId()
 * const apiPath = `/api/teams/${teamId}/members`
 * const settingsUrl = buildDashboardUrl('/settings')
 * ```
 */
export function useTeamContext() {
  const route = useRoute()
  const config = useRuntimeConfig().public.crouton?.auth as { mode?: string } | undefined

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
        return currentTeam.value.id
      }
    } catch {
      // useTeam not available in this app, that's fine
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

  // Also expose as computed refs for @crouton/auth compatibility
  const teamId = computed<string | null>(() => getTeamId() ?? null)
  const teamSlug = computed<string | null>(() => getTeamSlug() ?? null)

  /**
   * Whether URLs should include team param
   * Only true for multi-tenant mode
   */
  const useTeamInUrl = computed(() => config?.mode === 'multi-tenant')

  /**
   * Whether team context is available
   */
  const hasTeamContext = computed(() => !!teamId.value)

  /**
   * Build a dashboard URL with proper team context
   *
   * @example
   * buildDashboardUrl('/bookings') // multi-tenant: '/dashboard/acme/bookings'
   * buildDashboardUrl('/bookings') // single-tenant: '/dashboard/bookings'
   */
  function buildDashboardUrl(path: string, teamSlugOverride?: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    if (useTeamInUrl.value) {
      const slug = teamSlugOverride ?? teamSlug.value
      if (slug) {
        return `/dashboard/${slug}${cleanPath}`
      }
    }

    return `/dashboard${cleanPath}`
  }

  /**
   * Build an API URL with team context
   *
   * @example
   * buildApiUrl('/bookings') // '/api/teams/team-123/bookings'
   */
  function buildApiUrl(path: string, teamIdOverride?: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const id = teamIdOverride ?? teamId.value

    if (!id) {
      return `/api${cleanPath}`
    }

    return `/api/teams/${id}${cleanPath}`
  }

  return {
    // Function-based getters (original API)
    getTeamId,
    getTeamSlug,
    // Computed refs (@crouton/auth compatible API)
    teamId,
    teamSlug,
    // State
    hasTeamContext,
    useTeamInUrl,
    // URL builders
    buildDashboardUrl,
    buildApiUrl
  }
}
