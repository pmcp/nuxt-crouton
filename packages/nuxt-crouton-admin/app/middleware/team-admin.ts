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
import { defineNuxtRouteMiddleware, navigateTo, createError, useSession, useTeam } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server - let server-side middleware handle it
  if (import.meta.server) return

  const { data: sessionData, isPending, isAuthenticated } = useSession()
  const { currentTeam, isAdmin } = useTeam()

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

  // Check if user is in the right team
  const team = currentTeam.value
  if (!team || team.slug !== teamSlug) {
    // Try to switch to the team first
    const { switchTeamBySlug } = useTeam()
    try {
      await switchTeamBySlug(teamSlug)
      // Re-check after switching
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'You are not a member of this team'
      })
    }
  }

  // Check admin status
  if (!isAdmin.value) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Team admin or owner access required'
    })
  }
})
