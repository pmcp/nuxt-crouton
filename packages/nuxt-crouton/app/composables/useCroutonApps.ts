import type { CroutonAppConfig, CroutonAppRoute } from '../types/app'

/**
 * Composable for accessing auto-discovered Crouton apps and their routes.
 *
 * Collects all croutonApp configs from all layers via useAppConfig()
 * and provides computed properties for accessing routes by context.
 *
 * @example
 * ```typescript
 * const { apps, dashboardRoutes, adminRoutes, settingsRoutes } = useCroutonApps()
 *
 * // Access all registered apps
 * console.log(apps.value) // { bookings: {...}, inventory: {...} }
 *
 * // Build navigation from dashboard routes
 * const navItems = dashboardRoutes.value.map(route => ({
 *   label: t(route.label),
 *   icon: route.icon,
 *   to: buildDashboardUrl(route.path)
 * }))
 * ```
 */
export function useCroutonApps() {
  const appConfig = useAppConfig()

  /**
   * All registered Crouton apps from all layers.
   * Returns a record of app ID to app config.
   */
  const apps = computed<Record<string, CroutonAppConfig>>(() => {
    const registry = (appConfig.croutonApps || {}) as Record<string, CroutonAppConfig>
    return registry
  })

  /**
   * Array of all registered apps for iteration.
   */
  const appsList = computed<CroutonAppConfig[]>(() => {
    return Object.values(apps.value)
  })

  /**
   * All dashboard routes from all registered apps.
   * These routes are displayed in the user dashboard sidebar.
   * Filtered to exclude hidden routes.
   */
  const dashboardRoutes = computed<CroutonAppRoute[]>(() => {
    const routes: CroutonAppRoute[] = []

    for (const app of appsList.value) {
      if (app.dashboardRoutes) {
        routes.push(
          ...app.dashboardRoutes.filter((route: CroutonAppRoute) => !route.hidden)
        )
      }
    }

    return routes
  })

  /**
   * All admin routes from all registered apps.
   * These routes are displayed in the admin sidebar.
   * Filtered to exclude hidden routes.
   */
  const adminRoutes = computed<CroutonAppRoute[]>(() => {
    const routes: CroutonAppRoute[] = []

    for (const app of appsList.value) {
      if (app.adminRoutes) {
        routes.push(
          ...app.adminRoutes.filter((route: CroutonAppRoute) => !route.hidden)
        )
      }
    }

    return routes
  })

  /**
   * All settings routes from all registered apps.
   * These routes appear in the settings section of admin sidebar.
   * Filtered to exclude hidden routes.
   */
  const settingsRoutes = computed<CroutonAppRoute[]>(() => {
    const routes: CroutonAppRoute[] = []

    for (const app of appsList.value) {
      if (app.settingsRoutes) {
        routes.push(
          ...app.settingsRoutes.filter((route: CroutonAppRoute) => !route.hidden)
        )
      }
    }

    return routes
  })

  /**
   * Get a specific app by its ID.
   *
   * @param appId - The unique identifier of the app
   * @returns The app config or undefined if not found
   */
  function getApp(appId: string): CroutonAppConfig | undefined {
    return apps.value[appId]
  }

  /**
   * Check if an app is registered.
   *
   * @param appId - The unique identifier of the app
   * @returns True if the app is registered
   */
  function hasApp(appId: string): boolean {
    return appId in apps.value
  }

  /**
   * Get dashboard routes for a specific app.
   *
   * @param appId - The unique identifier of the app
   * @returns Array of dashboard routes for the app
   */
  function getAppDashboardRoutes(appId: string): CroutonAppRoute[] {
    const app = getApp(appId)
    if (!app?.dashboardRoutes) return []
    return app.dashboardRoutes.filter((route: CroutonAppRoute) => !route.hidden)
  }

  /**
   * Get admin routes for a specific app.
   *
   * @param appId - The unique identifier of the app
   * @returns Array of admin routes for the app
   */
  function getAppAdminRoutes(appId: string): CroutonAppRoute[] {
    const app = getApp(appId)
    if (!app?.adminRoutes) return []
    return app.adminRoutes.filter((route: CroutonAppRoute) => !route.hidden)
  }

  /**
   * Get settings routes for a specific app.
   *
   * @param appId - The unique identifier of the app
   * @returns Array of settings routes for the app
   */
  function getAppSettingsRoutes(appId: string): CroutonAppRoute[] {
    const app = getApp(appId)
    if (!app?.settingsRoutes) return []
    return app.settingsRoutes.filter((route: CroutonAppRoute) => !route.hidden)
  }

  return {
    // Reactive state
    apps,
    appsList,
    dashboardRoutes,
    adminRoutes,
    settingsRoutes,
    // Methods
    getApp,
    hasApp,
    getAppDashboardRoutes,
    getAppAdminRoutes,
    getAppSettingsRoutes
  }
}
