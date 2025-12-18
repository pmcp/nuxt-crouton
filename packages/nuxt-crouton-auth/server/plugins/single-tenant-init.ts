/**
 * Single-Tenant Initialization Plugin
 *
 * For single-tenant mode: logs initialization status.
 *
 * Note: The default organization is created lazily on first user signup
 * because NuxtHub's D1 database is only available during request handling,
 * not at Nitro plugin startup time.
 *
 * @see server/lib/auth.ts - buildDatabaseHooks() handles the lazy creation
 */
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  // Only run for single-tenant mode
  if (config.public.crouton?.auth?.mode !== 'single-tenant') {
    return
  }

  const defaultTeamId = config.public.crouton.auth.defaultTeamId ?? 'default'
  const appName = config.public.crouton.auth.appName ?? 'Default Workspace'

  // Note: Can't create default org here - database only available during requests
  // The default org will be created lazily on first user signup via databaseHooks
  console.log(`[@crouton/auth] Single-tenant mode enabled`)
  console.log(`[@crouton/auth] Default org "${appName}" (ID: ${defaultTeamId}) will be created on first user signup`)
})
