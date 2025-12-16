/**
 * Team Context Middleware (Global)
 *
 * Automatically resolves and injects team context based on auth mode.
 *
 * Multi-tenant: Resolves from URL param or session
 * Single-tenant/Personal: Auto-selects from session
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.crouton?.auth

  // TODO: Phase 3 - Implement team context resolution
  // const { currentTeam, teams } = useTeam()

  // Multi-tenant: Check URL for team slug
  // if (config?.mode === 'multi-tenant') {
  //   const teamSlug = to.params.team
  //   if (teamSlug) {
  //     // Switch to team from URL
  //   }
  // }

  // Single-tenant/Personal: Auto-select default team
  // if (config?.mode !== 'multi-tenant') {
  //   // Auto-select first/default team
  // }

  // Placeholder: log only
  if (config?.mode) {
    console.log(`[@crouton/auth] Team context (${config.mode}): route`, to.path)
  }
})
