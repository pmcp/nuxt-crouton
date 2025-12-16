/**
 * Auth Client Plugin
 *
 * Initializes the Better Auth client on the client-side.
 * Configures organization and passkey client plugins based on @crouton/auth config.
 */
import { createAuthClient } from 'better-auth/client'
import { organizationClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'
import type { CroutonAuthConfig } from '../../types/config'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined

  // Build client plugins based on configuration
  const plugins = buildClientPlugins(config)

  // Create the Better Auth client
  const authClient = createAuthClient({
    baseURL: window.location.origin,
    plugins,
  })

  // Log initialization in debug mode
  if (config?.debug) {
    console.log('[@crouton/auth] Client plugin initialized', {
      hasPasskeys: isPasskeyEnabled(config),
      hasOrganization: true,
    })
  }

  return {
    provide: {
      authClient,
    },
  }
})

/**
 * Build array of Better Auth client plugins based on configuration
 */
function buildClientPlugins(config?: CroutonAuthConfig) {
  const plugins: ReturnType<typeof organizationClient | typeof passkeyClient>[] = [
    // Organization client is always enabled
    organizationClient(),
  ]

  // Conditionally add passkey client
  if (isPasskeyEnabled(config)) {
    plugins.push(passkeyClient())
  }

  return plugins
}

/**
 * Check if passkeys are enabled in the configuration
 */
function isPasskeyEnabled(config?: CroutonAuthConfig): boolean {
  if (!config) return false

  const passkeyConfig = config.methods?.passkeys
  if (passkeyConfig === undefined || passkeyConfig === false) {
    return false
  }
  if (passkeyConfig === true) {
    return true
  }
  return passkeyConfig.enabled !== false
}
