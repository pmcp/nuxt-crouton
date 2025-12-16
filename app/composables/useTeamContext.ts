/**
 * useTeamContext Composable
 *
 * Mode-aware team context resolution. This composable handles getting the current
 * team ID based on the configured auth mode:
 *
 * - Multi-tenant: From URL param or session
 * - Single-tenant: Always the default team
 * - Personal: User's personal team from session
 *
 * This is the LOW-LEVEL composable for team ID resolution.
 * For team management (switching, creating, members), use useTeam().
 *
 * @example
 * ```vue
 * <script setup>
 * const { teamId, teamSlug } = useTeamContext()
 *
 * // Use in API calls
 * const { data } = await useFetch(`/api/teams/${teamId.value}/bookings`)
 * </script>
 * ```
 */
export function useTeamContext() {
  const config = useRuntimeConfig().public.crouton?.auth
  const route = useRoute()
  const { data: session } = useSession()

  /**
   * Get the current team ID based on auth mode
   */
  const teamId = computed<string | null>(() => {
    switch (config?.mode) {
      case 'single-tenant':
        // Always return the default team ID
        // This is set during app initialization
        return (config as { defaultTeamId?: string }).defaultTeamId ?? 'default'

      case 'personal':
        // Return user's personal team from session
        // Personal team is auto-created on signup
        return session.value?.activeOrganization?.id ?? null

      case 'multi-tenant':
      default:
        // From URL param first, then fall back to session's active org
        const urlTeam = route.params.team as string | undefined
        if (urlTeam) {
          // URL param could be slug or ID - we return as-is
          // The server will resolve it
          return urlTeam
        }
        return session.value?.activeOrganization?.id ?? null
    }
  })

  /**
   * Get the current team slug (for URL construction)
   */
  const teamSlug = computed<string | null>(() => {
    switch (config?.mode) {
      case 'single-tenant':
        return 'default'

      case 'personal':
        return session.value?.activeOrganization?.slug ?? null

      case 'multi-tenant':
      default:
        const urlTeam = route.params.team as string | undefined
        if (urlTeam) return urlTeam
        return session.value?.activeOrganization?.slug ?? null
    }
  })

  /**
   * Whether team context is available
   */
  const hasTeamContext = computed(() => !!teamId.value)

  /**
   * Whether URLs should include team param
   * Only true for multi-tenant mode
   */
  const useTeamInUrl = computed(() => config?.mode === 'multi-tenant')

  /**
   * Build a dashboard URL with proper team context
   *
   * @example
   * buildDashboardUrl('/bookings') // multi-tenant: '/dashboard/acme/bookings'
   * buildDashboardUrl('/bookings') // single-tenant: '/dashboard/bookings'
   */
  function buildDashboardUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    if (useTeamInUrl.value && teamSlug.value) {
      return `/dashboard/${teamSlug.value}${cleanPath}`
    }

    return `/dashboard${cleanPath}`
  }

  /**
   * Build an API URL with team context
   *
   * @example
   * buildApiUrl('/bookings') // '/api/teams/team-123/bookings'
   */
  function buildApiUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const id = teamId.value

    if (!id) {
      console.warn('[@crouton/auth] buildApiUrl called without team context')
      return `/api${cleanPath}`
    }

    return `/api/teams/${id}${cleanPath}`
  }

  return {
    // Core values
    teamId,
    teamSlug,

    // State
    hasTeamContext,
    useTeamInUrl,

    // Helpers
    buildDashboardUrl,
    buildApiUrl,
  }
}
