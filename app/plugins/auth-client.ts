/**
 * Auth Client Plugin
 *
 * Initializes the Better Auth client on the client-side.
 */
export default defineNuxtPlugin(() => {
  // TODO: Phase 2 - Initialize Better Auth client
  // const config = useRuntimeConfig().public.crouton.auth
  // const authClient = createAuthClient({
  //   baseURL: window.location.origin,
  //   plugins: [organizationClient()]
  // })

  console.log('[@crouton/auth] Client plugin initialized')

  return {
    provide: {
      // authClient
    },
  }
})
