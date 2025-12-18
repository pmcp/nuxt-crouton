/**
 * Global Team Context Middleware
 *
 * Automatically resolves and syncs team context based on auth mode.
 * Runs on ALL routes (global middleware) to ensure team context is available.
 *
 * Behavior by mode:
 * - Multi-tenant: Validates team in URL, redirects if invalid, syncs with session
 * - Single-tenant: Uses default team from config
 * - Personal: Uses user's personal workspace from session
 *
 * Team context is stored in:
 * - useState('crouton-auth-team') - for reactive access in components
 * - Server: event.context.team (via server middleware)
 */
import type { CroutonAuthConfig } from '../../types/config'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const mode = config?.mode ?? 'multi-tenant'

  // Get team state (shared via useState)
  const {
    setTeamContext,
    setTeamError,
    clearTeamContext,
    markUnresolved,
  } = useTeamState()

  // Skip for auth routes - no team context needed
  if (to.path.startsWith('/auth')) {
    clearTeamContext()
    return
  }

  // Get session state
  const { isAuthenticated, activeOrganization, isPending } = useSession()

  // Wait for session to load (important for initial navigation)
  if (isPending.value) {
    // Mark as unresolved - will be resolved when session loads
    markUnresolved()
    return
  }

  // Not authenticated - clear team context
  if (!isAuthenticated.value) {
    clearTeamContext()

    // If trying to access dashboard without auth, let the auth middleware handle it
    if (to.path.startsWith('/dashboard')) {
      return
    }
    return
  }

  // Debug logging
  if (config?.debug) {
    console.log(`[@crouton/auth] Team context middleware: ${to.path}, mode=${mode}`)
  }

  try {
    // Resolve team based on mode
    switch (mode) {
      case 'single-tenant': {
        // Always use the default team
        const teamId = config?.defaultTeamId ?? 'default'
        setTeamContext({
          teamId,
          teamSlug: 'default',
          team: activeOrganization.value ?? null,
        })
        break
      }

      case 'personal': {
        // Use user's personal workspace from session
        if (activeOrganization.value) {
          setTeamContext({
            teamId: activeOrganization.value.id,
            teamSlug: activeOrganization.value.slug,
            team: activeOrganization.value,
          })
        } else {
          setTeamError('No personal workspace found')
        }
        break
      }

      case 'multi-tenant':
      default: {
        // Handle multi-tenant mode with URL-based team resolution
        const resolution = await resolveMultiTenantTeam(to, config)

        if (resolution.error) {
          setTeamError(resolution.error)
        } else if (resolution.teamId) {
          setTeamContext({
            teamId: resolution.teamId,
            teamSlug: resolution.teamSlug,
            team: activeOrganization.value ?? null,
          })
        } else {
          clearTeamContext()
        }

        // Handle redirects
        if (resolution.needsRedirect && resolution.redirectTo) {
          if (config?.debug) {
            console.log(`[@crouton/auth] Redirecting to: ${resolution.redirectTo}`)
          }
          return navigateTo(resolution.redirectTo, { replace: true })
        }
        break
      }
    }
  } catch (error) {
    console.error('[@crouton/auth] Team context middleware error:', error)
    setTeamError(error instanceof Error ? error.message : 'Team resolution failed')
    // Don't block navigation - let the page handle the error
  }
})

/**
 * Resolve team context for multi-tenant mode
 */
async function resolveMultiTenantTeam(
  to: ReturnType<typeof useRoute>,
  config: CroutonAuthConfig | undefined
): Promise<{
  teamId: string | null
  teamSlug: string | null
  needsRedirect: boolean
  redirectTo?: string
  error?: string
}> {
  const { activeOrganization } = useSession()
  const { teams, switchTeamBySlug } = useTeam()

  const urlTeamParam = to.params.team as string | undefined
  const isDashboardRoute = to.path.startsWith('/dashboard')

  if (urlTeamParam) {
    // Team specified in URL - validate user has access
    const targetTeam = teams.value.find(
      t => t.slug === urlTeamParam || t.id === urlTeamParam
    )

    if (!targetTeam) {
      // Team not found or no access - redirect to first available team
      const firstTeam = teams.value[0]
      if (firstTeam) {
        const newPath = to.path.replace(`/${urlTeamParam}`, `/${firstTeam.slug}`)
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
        error: 'No teams available',
      }
    }

    // Valid team - switch session if needed
    if (activeOrganization.value?.id !== targetTeam.id) {
      try {
        await switchTeamBySlug(urlTeamParam)
      } catch (e) {
        console.error('[@crouton/auth] Failed to switch team:', e)
      }
    }

    return {
      teamId: targetTeam.id,
      teamSlug: targetTeam.slug,
      needsRedirect: false,
    }
  } else if (isDashboardRoute && activeOrganization.value) {
    // Dashboard route without team in URL - add team to URL
    const pathWithoutDashboard = to.path.replace(/^\/dashboard\/?/, '')
    return {
      teamId: activeOrganization.value.id,
      teamSlug: activeOrganization.value.slug,
      needsRedirect: true,
      redirectTo: `/dashboard/${activeOrganization.value.slug}${pathWithoutDashboard ? `/${pathWithoutDashboard}` : ''}`,
    }
  } else {
    // Non-dashboard route or no active org
    return {
      teamId: activeOrganization.value?.id ?? null,
      teamSlug: activeOrganization.value?.slug ?? null,
      needsRedirect: false,
    }
  }
}
