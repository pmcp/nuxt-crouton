/**
 * Route prefixes that should NOT be treated as team slugs.
 * Used by both the public-pages middleware and useNavigation composable.
 *
 * 'api' is included for composable-side URL validation — API routes never
 * reach the route middleware (handled by Nitro server routes).
 */
export const RESERVED_PREFIXES = ['auth', 'api', 'admin', 'dashboard', '_nuxt', '__nuxt']
