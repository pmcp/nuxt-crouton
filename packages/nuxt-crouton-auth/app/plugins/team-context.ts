/**
 * Team Context Plugin for Collection Integration
 *
 * This plugin provides team context to all parts of the application,
 * enabling seamless integration with nuxt-crouton collections.
 *
 * It exposes:
 * - $croutonAuth.getTeamId() - Get current team ID
 * - $croutonAuth.getTeamSlug() - Get current team slug
 * - $croutonAuth.getTeam() - Get full team object
 * - $croutonAuth.mode - Get current auth mode
 *
 * Collections can use this to scope queries and mutations to the current team.
 *
 * @example
 * ```typescript
 * // In a composable or component
 * const { $croutonAuth } = useNuxtApp()
 * const teamId = $croutonAuth.getTeamId()
 * ```
 */
import type { Team } from '../../types'
import type { CroutonAuthConfig } from '../../types/config'

export interface CroutonAuthContext {
  /**
   * Get the current team ID
   * Returns null if no team context is available
   */
  getTeamId: () => string | null

  /**
   * Get the current team slug (for URL construction)
   * Returns null if no team context is available
   */
  getTeamSlug: () => string | null

  /**
   * Get the full team object
   * Returns null if no team context is available
   */
  getTeam: () => Team | null

  /**
   * Get the current auth mode
   */
  mode: 'multi-tenant' | 'single-tenant' | 'personal'

  /**
   * Check if team context is available
   */
  hasTeamContext: () => boolean

  /**
   * Build an API URL with team context
   */
  buildApiUrl: (path: string) => string
}

declare module '#app' {
  interface NuxtApp {
    $croutonAuth: CroutonAuthContext
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $croutonAuth: CroutonAuthContext
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const mode = config?.mode ?? 'personal'

  // Create the context object
  const croutonAuth: CroutonAuthContext = {
    getTeamId: () => {
      // Use useTeamContext if available (composable context)
      try {
        const { teamId } = useTeamContext()
        return teamId.value
      }
      catch {
        // Fall back to useTeam
        try {
          const { currentTeam } = useTeam()
          return currentTeam.value?.id ?? null
        }
        catch {
          return null
        }
      }
    },

    getTeamSlug: () => {
      try {
        const { teamSlug } = useTeamContext()
        return teamSlug.value
      }
      catch {
        try {
          const { currentTeam } = useTeam()
          return currentTeam.value?.slug ?? null
        }
        catch {
          return null
        }
      }
    },

    getTeam: () => {
      try {
        const { currentTeam } = useTeam()
        return currentTeam.value
      }
      catch {
        return null
      }
    },

    mode,

    hasTeamContext: () => {
      return croutonAuth.getTeamId() !== null
    },

    buildApiUrl: (path: string) => {
      const teamId = croutonAuth.getTeamId()
      const cleanPath = path.startsWith('/') ? path : `/${path}`

      if (!teamId) {
        console.warn('[@crouton/auth] buildApiUrl called without team context')
        return `/api${cleanPath}`
      }

      return `/api/teams/${teamId}${cleanPath}`
    },
  }

  // Provide the context to the app
  nuxtApp.provide('croutonAuth', croutonAuth)

  // Emit a hook that other modules can listen to
  nuxtApp.hook('app:created', () => {
    // Emit custom hook for collection integration
    nuxtApp.callHook('croutonAuth:ready' as any, croutonAuth)
  })
})
