/**
 * Nitro plugin — eagerly load all dispatch services at startup.
 * This ensures services are registered before any API request hits.
 */
export default defineNitroPlugin(async () => {
  const { ensureServicesLoaded } = await import('../utils/dispatch-registry')
  await ensureServicesLoaded()
})
