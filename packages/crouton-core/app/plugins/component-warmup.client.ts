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

    // Access components through Vue app's registry to trigger any lazy loading
    // Note: resolveComponent() can only be used in render/setup context,
    // so we access the registry directly instead
    const registry = nuxtApp.vueApp._context.components
    let warmedCount = 0

    for (const name of componentNames) {
      // Accessing the component in the registry may trigger lazy resolution
      if (registry[name]) {
        warmedCount++
      }
    }

    if (warmedCount > 0) {
      console.debug(`🍞 crouton:core Warmed up ${warmedCount}/${componentNames.size} components`)
    }
  }
})