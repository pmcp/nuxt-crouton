/**
 * Single-Tenant Initialization Plugin
 *
 * For single-tenant mode: creates the default organization on first boot.
 */
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  // Only run for single-tenant mode
  if (config.public.crouton?.auth?.mode !== 'single-tenant') {
    return
  }

  // TODO: Phase 3 - Create default organization
  // const defaultOrg = await getOrCreateDefaultOrganization()

  console.log('[@crouton/auth] Single-tenant mode: Default organization setup pending')
})
