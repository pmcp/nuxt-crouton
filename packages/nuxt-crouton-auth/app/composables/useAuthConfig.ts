/**
 * useAuthConfig Composable
 *
 * Provides type-safe access to the @crouton/auth configuration.
 * This composable handles the runtime config type casting in one place.
 *
 * @example
 * ```vue
 * <script setup>
 * const config = useAuthConfig()
 * const isMultiTenant = config?.mode === 'multi-tenant'
 * </script>
 * ```
 */
import type { CroutonAuthConfig } from '../../types/config'

/**
 * Runtime config type as it appears after Nuxt serialization.
 * This is a looser type that matches what Nuxt actually provides.
 */
interface RuntimeAuthConfig {
  mode?: string
  defaultTeamId?: string
  appName?: string
  methods?: {
    password?: boolean | object
    oauth?: object
    passkeys?: boolean | object
    twoFactor?: boolean | object
    magicLink?: boolean | object
    phone?: boolean | object
  }
  teams?: {
    allowCreate?: boolean
    limit?: number
    memberLimit?: number
    requireInvite?: boolean
    invitationExpiry?: number
    requireEmailVerification?: boolean
    defaultRole?: string
    roles?: Array<{ id: string; name: string; permissions?: string[] }>
  }
  ui?: {
    theme?: string
    redirects?: {
      afterLogin?: string
      afterLogout?: string
      afterRegister?: string
      unauthenticated?: string
      authenticated?: string
    }
    showRememberMe?: boolean
    showSocialLogin?: boolean
    darkMode?: boolean
  }
  session?: {
    expiresIn?: number
    updateAge?: number
    cookieName?: string
    secure?: boolean
    sameSite?: string
  }
  debug?: boolean
}

/**
 * Get the auth configuration with proper typing
 *
 * @returns The auth config or undefined if not configured
 */
export function useAuthConfig(): CroutonAuthConfig | undefined {
  const runtimeConfig = useRuntimeConfig()
  const rawConfig = runtimeConfig.public.crouton?.auth as RuntimeAuthConfig | undefined

  if (!rawConfig) return undefined

  // Return as properly typed config
  // The runtime config structure matches CroutonAuthConfig after validation in module.ts
  return rawConfig as unknown as CroutonAuthConfig
}

/**
 * @deprecated Mode-based architecture has been replaced with flag-based configuration.
 * Use config.teams flags directly instead:
 * - `autoCreateOnSignup` for personal workspace behavior
 * - `defaultTeamSlug` for company app behavior
 * - `allowCreate`, `showSwitcher`, `showManagement` for UI control
 *
 * @returns A computed mode based on current flags for backward compatibility
 */
export function useAuthMode(): 'multi-tenant' | 'single-tenant' | 'personal' {
  const config = useAuthConfig()
  const teams = config?.teams

  // Infer "mode" from flags for backward compatibility
  if (teams?.autoCreateOnSignup && !teams?.allowCreate) {
    return 'personal'
  }
  if (teams?.defaultTeamSlug && !teams?.allowCreate) {
    return 'single-tenant'
  }
  return 'multi-tenant'
}

/**
 * @deprecated Use config.teams.allowCreate and other flags directly.
 * Check if users can create additional teams.
 */
export function useIsMultiTenant(): boolean {
  const config = useAuthConfig()
  return config?.teams?.allowCreate !== false
}

/**
 * Get redirect URLs from config with defaults
 */
export function useAuthRedirects() {
  const config = useAuthConfig()
  return {
    afterLogin: config?.ui?.redirects?.afterLogin ?? '/dashboard',
    afterLogout: config?.ui?.redirects?.afterLogout ?? '/',
    afterRegister: config?.ui?.redirects?.afterRegister ?? '/dashboard',
    unauthenticated: config?.ui?.redirects?.unauthenticated ?? '/auth/login',
    authenticated: config?.ui?.redirects?.authenticated ?? '/dashboard'
  }
}
