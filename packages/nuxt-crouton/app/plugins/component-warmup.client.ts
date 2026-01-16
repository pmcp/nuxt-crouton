/**
 * Component Warmup Plugin (Dev Only)
 *
 * Pre-registers form components from croutonCollections to prevent
 * HMR page reloads when opening forms for the first time.
 *
 * This is a dev-only optimization - in production all components
 * are bundled at build time.
 */
export default defineNuxtPlugin({
  name: 'crouton-component-warmup',
  enforce: 'pre',
  setup() {
    // Only run in development
    if (!import.meta.dev) return

    const appConfig = useAppConfig()
    const collections = appConfig.croutonCollections as Record<string, { componentName?: string }> | undefined

    if (!collections) return

    // Get current Vue app instance
    const nuxtApp = useNuxtApp()

    // Warm up all form components by resolving them
    const componentNames = new Set<string>()

    for (const config of Object.values(collections)) {
      if (config?.componentName) {
        componentNames.add(config.componentName)

        // Also warm up the Detail variant if it exists
        const detailName = config.componentName.replace(/Form$/, 'Detail')
        componentNames.add(detailName)

        // And the List variant
        const listName = config.componentName.replace(/Form$/, 'List')
        componentNames.add(listName)
      }
    }

    // Resolve each component to trigger registration
    for (const name of componentNames) {
      try {
        resolveComponent(name)
      } catch {
        // Component doesn't exist, that's fine
      }
    }

    if (componentNames.size > 0) {
      console.debug(`[crouton] Warmed up ${componentNames.size} components`)
    }
  }
})