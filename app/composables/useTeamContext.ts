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
 * The team context is populated by the global middleware (team-context.global.ts)
 * and stored in useState for SSR-safe access.
 *
 * @example
 * ```vue
 * <script setup>
 * const { teamId, teamSlug, buildDashboardUrl } = useTeamContext()
 *
 * // Use in API calls
 * const { data } = await useFetch(`/api/teams/${teamId.value}/bookings`)
 *
 * // Build dashboard URLs
 * const settingsUrl = buildDashboardUrl('/settings')
 * </script>
 * ```
 */
import type { CroutonAuthConfig } from '../../types/config'

/**
 * Team context resolution result
 */
export interface TeamContextResolution {
  teamId: string | null
  teamSlug: string | null
  needsRedirect: boolean
  redirectTo?: string
}

export function useTeamContext() {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const route = useRoute()

  // Get shared team state (populated by global middleware)
  const teamState = useTeamState()

  /**
   * Get the current team ID based on auth mode
   *
   * Priority:
   * 1. Resolved state from middleware (useState)
   * 2. Fallback to direct resolution (for edge cases)
   */
  const teamId = computed<string | null>(() => {
    // If middleware has resolved the team, use that
    if (teamState.isResolved.value && teamState.teamId.value) {
      return teamState.teamId.value
    }

    // Fallback to direct resolution
    switch (config?.mode) {
      case 'single-tenant':
        // Always return the default team ID
        return config?.defaultTeamId ?? 'default'

      case 'personal': {
        // Return user's personal team from session
        const { activeOrganization } = useSession()
        return activeOrganization.value?.id ?? null
      }

      case 'multi-tenant':
      default: {
        // From URL param first, then fall back to session's active org
        const urlTeam = route.params.team as string | undefined
        if (urlTeam) {
          // URL param could be slug or ID - we return as-is
          // The server will resolve it
          return urlTeam
        }
        const { activeOrganization } = useSession()
        return activeOrganization.value?.id ?? null
      }
    }
  })

  /**
   * Get the current team slug (for URL construction)
   */
  const teamSlug = computed<string | null>(() => {
    // If middleware has resolved the team, use that
    if (teamState.isResolved.value && teamState.teamSlug.value) {
      return teamState.teamSlug.value
    }

    // Fallback to direct resolution
    switch (config?.mode) {
      case 'single-tenant':
        return 'default'

      case 'personal': {
        const { activeOrganization } = useSession()
        return activeOrganization.value?.slug ?? null
      }

      case 'multi-tenant':
      default: {
        const urlTeam = route.params.team as string | undefined
        if (urlTeam) return urlTeam
        const { activeOrganization } = useSession()
        return activeOrganization.value?.slug ?? null
      }
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
   * Check if current route is a team-scoped dashboard route
   */
  const isTeamRoute = computed(() => {
    return route.path.startsWith('/dashboard') && !!route.params.team
  })

  /**
   * Get team param from current route (multi-tenant only)
   */
  const routeTeamParam = computed(() => {
    return route.params.team as string | undefined
  })

  /**
   * Check if URL team matches session's active team
   */
  const isTeamSynced = computed(() => {
    if (config?.mode !== 'multi-tenant') return true

    const routeTeam = routeTeamParam.value
    if (!routeTeam) return true // No team in URL is valid for some routes

    const { activeOrganization } = useSession()
    const activeSlug = activeOrganization.value?.slug
    const activeId = activeOrganization.value?.id

    return routeTeam === activeSlug || routeTeam === activeId
  })

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
      // No slug available - log warning but proceed
      console.warn('[@crouton/auth] buildDashboardUrl: No team slug available in multi-tenant mode')
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
      console.warn('[@crouton/auth] buildApiUrl called without team context')
      return `/api${cleanPath}`
    }

    return `/api/teams/${id}${cleanPath}`
  }

  /**
   * Resolve team from current route and sync with session
   *
   * This is called by the team-context middleware.
   * Returns resolution info including whether a redirect is needed.
   */
  async function resolveTeamFromRoute(): Promise<TeamContextResolution> {
    const mode = config?.mode ?? 'multi-tenant'
    const { isAuthenticated, activeOrganization } = useSession()

    // Not authenticated - no team context needed
    if (!isAuthenticated.value) {
      return {
        teamId: null,
        teamSlug: null,
        needsRedirect: false,
      }
    }

    // Handle based on mode
    if (mode === 'multi-tenant') {
      const urlTeamParam = route.params.team as string | undefined

      if (urlTeamParam) {
        // Team in URL - validate user has access
        const { teams, switchTeamBySlug } = useTeam()
        const targetTeam = teams.value.find(
          t => t.slug === urlTeamParam || t.id === urlTeamParam
        )

        if (!targetTeam) {
          // Team not found or no access - redirect to first available team
          const firstTeam = teams.value[0]
          if (firstTeam) {
            const newPath = route.path.replace(`/${urlTeamParam}`, `/${firstTeam.slug}`)
            return {
              teamId: firstTeam.id,
              teamSlug: firstTeam.slug,
              needsRedirect: true,
              redirectTo: newPath,
            }
          }
          // No teams at all
          return {
            teamId: null,
            teamSlug: null,
            needsRedirect: false,
          }
        }

        // Valid team - switch session if needed
        if (activeOrganization.value?.id !== targetTeam.id) {
          try {
            await switchTeamBySlug(urlTeamParam)
          }
          catch (e) {
            console.error('[@crouton/auth] Failed to switch team:', e)
          }
        }

        return {
          teamId: targetTeam.id,
          teamSlug: targetTeam.slug,
          needsRedirect: false,
        }
      }
      else {
        // No team in URL - check if we should add one
        const isDashboardRoute = route.path.startsWith('/dashboard')

        if (isDashboardRoute && activeOrganization.value) {
          // Dashboard route should have team in URL in multi-tenant mode
          const pathWithoutDashboard = route.path.replace(/^\/dashboard\/?/, '')
          return {
            teamId: activeOrganization.value.id,
            teamSlug: activeOrganization.value.slug,
            needsRedirect: true,
            redirectTo: `/dashboard/${activeOrganization.value.slug}${pathWithoutDashboard ? `/${pathWithoutDashboard}` : ''}`,
          }
        }

        // Non-dashboard route or no active org
        return {
          teamId: activeOrganization.value?.id ?? null,
          teamSlug: activeOrganization.value?.slug ?? null,
          needsRedirect: false,
        }
      }
    }
    else {
      // Single-tenant or personal mode - just use session's active org
      return {
        teamId: activeOrganization.value?.id ?? null,
        teamSlug: activeOrganization.value?.slug ?? null,
        needsRedirect: false,
      }
    }
  }

  /**
   * Navigate to a team-scoped route
   *
   * Convenience method that builds the URL and navigates
   */
  async function navigateToTeamRoute(path: string, teamSlugOverride?: string): Promise<void> {
    const url = buildDashboardUrl(path, teamSlugOverride)
    await navigateTo(url)
  }

  return {
    // Core values
    teamId,
    teamSlug,
    team: teamState.team,

    // State
    hasTeamContext,
    useTeamInUrl,
    isTeamRoute,
    routeTeamParam,
    isTeamSynced,
    isResolved: teamState.isResolved,
    hasError: teamState.hasError,
    error: teamState.error,

    // URL builders
    buildDashboardUrl,
    buildApiUrl,

    // Actions
    resolveTeamFromRoute,
    navigateToTeamRoute,

    // State management (for advanced use)
    setTeamContext: teamState.setTeamContext,
    clearTeamContext: teamState.clearTeamContext,
  }
}
