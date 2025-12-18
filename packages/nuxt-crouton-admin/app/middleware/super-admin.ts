/**
 * Super Admin Middleware
 *
 * Protects routes that require super admin privileges.
 * Redirects non-admins to a 403 forbidden page.
 *
 * @example
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: 'super-admin'
 * })
 * </script>
 * ```
 */
import { defineNuxtRouteMiddleware, navigateTo, createError } from '#imports'
import { useSession } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server - let server-side middleware handle it
  if (import.meta.server) return

  const { data: sessionData, isPending, isAuthenticated } = useSession()

  // Wait for session to load if pending
  if (isPending.value) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Check authentication first
  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath },
    })
  }

  // Check super admin status from raw session data
  // The superAdmin field is stored on the user record
  const user = sessionData.value?.user as { superAdmin?: boolean } | undefined

  if (!user?.superAdmin) {
    // Not a super admin - show forbidden error
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Super admin access required',
    })
  }
})
