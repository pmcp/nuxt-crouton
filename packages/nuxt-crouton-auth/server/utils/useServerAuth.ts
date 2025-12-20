/**
 * Server Auth Utility
 *
 * Provides lazy initialization and access to the Better Auth instance.
 * The auth instance is created on first access since NuxtHub's database
 * binding is only available during request handling.
 *
 * Supports both:
 * - NuxtHub D1 mode: hubDatabase() + drizzle-orm/d1
 * - NuxtHub v0.10+ multi-vendor mode: useDB() (already drizzle instance)
 *
 * @example
 * ```typescript
 * // In an API route
 * export default defineEventHandler(async (event) => {
 *   const auth = useServerAuth(event)
 *   const session = await auth.api.getSession({ headers: event.headers })
 * })
 * ```
 */
import type { H3Event } from 'h3'
import { createError, getRequestURL } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createAuth, type AuthInstance, setAuthInstance, getAuthInstance, isAuthInitialized } from '../lib/auth'
import type { CroutonAuthConfig } from '../../types/config'
import * as authSchema from '../database/schema/auth'

// NuxtHub v0.10+ provides 'db' from 'hub:db' as an auto-import
declare const db: any

/**
 * Get or create the Better Auth instance
 *
 * Lazily initializes the auth instance on first access.
 * Uses NuxtHub's hubDatabase() to get the D1 binding.
 *
 * @param event - H3 event (needed for database access in NuxtHub)
 * @returns Better Auth instance
 */
export function useServerAuth(event?: H3Event): AuthInstance {
  // Return cached instance if already initialized
  if (isAuthInitialized()) {
    return getAuthInstance()
  }

  // Get runtime config
  const config = useRuntimeConfig()
  const authConfig = config.public?.crouton?.auth as CroutonAuthConfig | undefined

  if (!authConfig) {
    throw new Error(
      '[crouton/auth] No auth configuration found. Add crouton.auth config to nuxt.config.ts'
    )
  }

  // Get secret from runtime config or environment
  const secret = (config.auth as { secret?: string })?.secret || process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error(
      '[crouton/auth] BETTER_AUTH_SECRET is required. Set it in your environment variables.'
    )
  }

  // Get base URL - use request URL if event available, otherwise fall back to config
  let baseURL = (config.auth as { baseUrl?: string })?.baseUrl
    || process.env.BETTER_AUTH_URL
    || config.public?.baseUrl

  // If we have an event, use the actual request origin (handles dynamic ports)
  if (!baseURL && event) {
    const url = getRequestURL(event)
    baseURL = `${url.protocol}//${url.host}`
  }

  baseURL = baseURL || 'http://localhost:3000'

  // Get database instance from NuxtHub v0.10+ (db from hub:db)
  if (typeof db === 'undefined' || db === null) {
    throw new Error('[crouton/auth] No database available. Ensure NuxtHub is configured with hub.db')
  }

  // Create the auth instance
  const auth = createAuth({
    config: authConfig,
    db,
    provider: 'sqlite',
    secret,
    baseURL,
    schema: authSchema
  })

  // Cache the instance
  setAuthInstance(auth)

  console.log('[crouton/auth] Auth instance initialized')

  return auth
}

/**
 * Get session from request
 *
 * Convenience wrapper around Better Auth's getSession API.
 *
 * @param event - H3 event
 * @returns Session with user data, or null if not authenticated
 */
export async function getServerSession(_event: H3Event) {
  const auth = useServerAuth(event)
  return auth.api.getSession({
    headers: event.headers
  })
}

/**
 * Verify the request is authenticated
 *
 * @param event - H3 event
 * @returns Session with user data
 * @throws 401 error if not authenticated
 */
export async function requireServerSession(_event: H3Event) {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  return session
}
