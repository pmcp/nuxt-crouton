/**
 * Server Team Context Middleware
 *
 * Automatically resolves team context for API routes and injects
 * it into `event.context.team` based on the configured auth mode.
 *
 * Mode-specific behavior:
 * - Multi-tenant: Resolves from URL param ([team] or [id]) or session
 * - Single-tenant: Always uses the default team
 * - Personal: Uses user's personal workspace from session
 *
 * Note: This middleware runs on all routes but only populates context
 * for authenticated requests. API routes should use `requireTeamMember()`
 * for authorization checks.
 */
import type { Team } from '../../types'
import type { CroutonAuthConfig } from '../../types/config'
import { getServerSession } from '../utils/useServerAuth'

// Extend H3EventContext to include team
declare module 'h3' {
  interface H3EventContext {
    team?: Team | null
    teamId?: string | null
    teamSlug?: string | null
    authMode?: 'multi-tenant' | 'single-tenant' | 'personal'
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const mode = config?.mode ?? 'multi-tenant'

  // Set the auth mode in context for downstream use
  event.context.authMode = mode

  // Skip for non-API routes (let Nuxt handle pages)
  const path = getRequestPath(event)
  if (!path.startsWith('/api/')) {
    return
  }

  // Skip for auth routes - they handle their own context
  if (path.startsWith('/api/auth/')) {
    return
  }

  // Try to resolve team context (won't throw, just sets null if not available)
  try {
    // Get session if available (non-blocking)
    const session = await getServerSession(event)

    if (!session?.user) {
      // No authenticated session - skip team resolution
      event.context.team = null
      event.context.teamId = null
      event.context.teamSlug = null
      return
    }

    let teamId: string | null = null
    let teamSlug: string | null = null

    switch (mode) {
      case 'single-tenant':
        // Always use the default team
        teamId = config?.defaultTeamId ?? 'default'
        teamSlug = 'default'
        break

      case 'personal':
        // Use session's active org (personal workspace)
        teamId = session.session.activeOrganizationId ?? null
        // Slug will be resolved from team data below
        break

      case 'multi-tenant':
      default: {
        // Check URL params first: /api/teams/[id]/... or /dashboard/[team]/...
        const urlTeamParam = getRouterParam(event, 'id') ?? getRouterParam(event, 'team')

        if (urlTeamParam) {
          // URL param could be ID or slug
          teamId = urlTeamParam
          teamSlug = urlTeamParam
        } else {
          // Fall back to session's active org
          teamId = session.session.activeOrganizationId ?? null
        }
        break
      }
    }

    // Store in context
    event.context.teamId = teamId
    event.context.teamSlug = teamSlug

    // Optionally fetch full team data (can be expensive, so we just store IDs by default)
    // Full team data is fetched by resolveTeamAndCheckMembership() when needed
    event.context.team = null

    // Debug logging
    if (config?.debug) {
      console.log(`[@crouton/auth] Server team context: mode=${mode}, teamId=${teamId}, teamSlug=${teamSlug}`)
    }
  } catch (error) {
    // Don't throw - just log and continue without team context
    // This allows public API routes to work
    if (config?.debug) {
      console.log('[@crouton/auth] Server team context middleware: No session available')
    }
    event.context.team = null
    event.context.teamId = null
    event.context.teamSlug = null
  }
})
