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
import { defineNuxtRouteMiddleware, navigateTo, createError, useSession, watch } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: sessionData, isPending, isAuthenticated } = useSession()

  // Wait for session to load if pending
  if (isPending.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(isPending, (val) => {
        if (!val) { stop(); resolve() }
      })
    })
  }

  // Check authentication first
  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }

  // Check super admin status from raw session data
  // The superAdmin field is stored on the user record
  const user = sessionData.value?.user as { superAdmin?: boolean } | undefined

  if (!user?.superAdmin) {
    // Not a super admin - show forbidden error
    throw createError({
      status: 403,
      statusText: 'Forbidden',
      message: 'Super admin access required'
    })
  }
})
