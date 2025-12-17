/**
 * Auth Initialization Plugin
 *
 * Validates auth configuration on server startup.
 * The actual Better Auth instance is lazily initialized on first request
 * since NuxtHub's D1 database binding is only available during request handling.
 */
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  // Validate required environment variables
  const secret = config.auth?.secret || process.env.BETTER_AUTH_SECRET
  if (!secret) {
    console.warn(
      '[@crouton/auth] BETTER_AUTH_SECRET is not set. Authentication will not work properly in production.'
    )
  }

  // Validate auth config exists
  const authConfig = config.public?.crouton?.auth
  if (!authConfig) {
    console.warn(
      '[@crouton/auth] No auth configuration found. Add crouton.auth config to nuxt.config.ts'
    )
    return
  }

  console.log(`[@crouton/auth] Auth plugin initialized (mode: ${authConfig.mode})`)
})
