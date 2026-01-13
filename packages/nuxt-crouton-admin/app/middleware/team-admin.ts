/**
 * Team Admin Middleware
 *
 * Protects routes that require team admin or owner privileges.
 * Checks that the user is a member of the team in the route param
 * and has admin/owner role.
 *
 * @example
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: 'team-admin'
 * })
 * </script>
 * ```
 */
import { defineNuxtRouteMiddleware, navigateTo, createError, useSession, useTeam, useNuxtApp } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server - let server-side middleware handle it
  if (import.meta.server) return

  const { isPending, isAuthenticated } = useSession()
  const { teams, switchTeamBySlug } = useTeam()
  const nuxtApp = useNuxtApp()

  // Wait for session to load if pending
  if (isPending.value) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Check authentication first
  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }

  // Get team slug from route params
  const teamSlug = to.params.team as string
  if (!teamSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Team parameter is required'
    })
  }

  // Find the team and check role from teams list (includes role)
  let userTeams = teams.value

  // If teams not loaded, fetch from API
  if (userTeams.length === 0) {
    const authClient = nuxtApp.$authClient as any
    if (authClient?.organization?.list) {
      try {
        const result = await authClient.organization.list()
        if (result.data) {
          userTeams = result.data
        }
      } catch (e) {
        console.error('[@crouton/admin] Failed to fetch teams:', e)
      }
    }
  }

  // Find the target team
  const targetTeam = userTeams.find((t: any) => t.slug === teamSlug || t.id === teamSlug)

  if (!targetTeam) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You are not a member of this team'
    })
  }

  // Switch to the team if needed
  try {
    await switchTeamBySlug(teamSlug)
  } catch {
    // Ignore switch errors
  }

  // Check admin status by fetching full organization with members
  const authClient = nuxtApp.$authClient as any
  if (authClient?.organization?.getFullOrganization) {
    try {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: targetTeam.id }
      })

      if (result.data?.members) {
        const { user } = useSession()
        const userId = user.value?.id
        const membership = result.data.members.find((m: any) => m.userId === userId)

        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
          throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden',
            message: 'Team admin or owner access required'
          })
        }
        // User is admin/owner - allow access
        return
      }
    } catch (e: any) {
      if (e.statusCode === 403) throw e
      console.error('[@crouton/admin] Failed to check admin status:', e)
    }
  }

  // Fallback: allow access if we couldn't verify (let server handle it)
})
