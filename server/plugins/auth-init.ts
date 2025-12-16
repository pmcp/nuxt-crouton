/**
 * Auth Initialization Plugin
 *
 * Initializes the Better Auth instance on server startup.
 */
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  // Validate required environment variables
  if (!config.auth?.secret) {
    console.warn(
      '[@crouton/auth] BETTER_AUTH_SECRET is not set. Authentication will not work properly.'
    )
  }

  // TODO: Phase 2 - Initialize Better Auth instance
  // const auth = createAuth(config.public.crouton.auth)

  console.log('[@crouton/auth] Auth plugin initialized')
})
