/**
 * Better Auth API Handler
 *
 * Catch-all route handler that delegates to Better Auth.
 * All auth endpoints are handled through /api/auth/*
 */
export default defineEventHandler(async (event) => {
  // TODO: Phase 2 - Implement Better Auth handler
  // const auth = useServerAuth()
  // return auth.handler(toWebRequest(event))

  // Placeholder response
  throw createError({
    statusCode: 501,
    message: '@crouton/auth: Auth handler not yet implemented. Complete Phase 2 to enable.',
  })
})
