/**
 * Auth Client Plugin
 *
 * Initializes the Better Auth client on the client-side.
 * Configures organization, passkey, 2FA, and Stripe client plugins based on @crouton/auth config.
 */
import { createAuthClient } from 'better-auth/client'
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'
import { stripeClient } from '@better-auth/stripe/client'
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
      hasTwoFactor: isTwoFactorEnabled(config),
      hasBilling: isBillingEnabled(config),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins: any[] = [
    // Organization client is always enabled
    organizationClient(),
  ]

  // Conditionally add passkey client
  if (isPasskeyEnabled(config)) {
    plugins.push(passkeyClient())
  }

  // Conditionally add 2FA client
  if (isTwoFactorEnabled(config)) {
    plugins.push(twoFactorClient())
  }

  // Conditionally add Stripe client for billing
  if (isBillingEnabled(config)) {
    plugins.push(stripeClient({
      // Enable subscription management
      subscription: true,
    }))
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

/**
 * Check if 2FA is enabled in the configuration
 */
function isTwoFactorEnabled(config?: CroutonAuthConfig): boolean {
  if (!config) return false

  const twoFactorConfig = config.methods?.twoFactor
  if (twoFactorConfig === undefined || twoFactorConfig === false) {
    return false
  }
  if (twoFactorConfig === true) {
    return true
  }
  return twoFactorConfig.enabled !== false
}

/**
 * Check if billing is enabled in the configuration
 */
function isBillingEnabled(config?: CroutonAuthConfig): boolean {
  if (!config) return false

  const billingConfig = config.billing
  if (!billingConfig?.enabled) {
    return false
  }
  // Also need Stripe configuration (at least publishable key for client-side)
  return !!billingConfig.stripe?.publishableKey
}
