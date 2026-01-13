/**
 * Crouton App Auto-Discovery Types
 *
 * This module provides type definitions for the app auto-discovery system
 * that allows packages like crouton-bookings to automatically register
 * their routes and appear in sidebars.
 *
 * @example
 * // In your package's app.config.ts:
 * export default defineAppConfig({
 *   croutonApps: {
 *     bookings: {
 *       id: 'bookings',
 *       name: 'Bookings',
 *       icon: 'i-lucide-calendar',
 *       dashboardRoutes: [
 *         { path: '/bookings', label: 'navigation.bookings', icon: 'i-lucide-calendar' },
 *         { path: '/my-bookings', label: 'navigation.myBookings', icon: 'i-lucide-list' }
 *       ],
 *       adminRoutes: [
 *         { path: '/admin/bookings', label: 'navigation.manageBookings', icon: 'i-lucide-settings' }
 *       ],
 *       settingsRoutes: [
 *         { path: '/settings/booking-rules', label: 'navigation.bookingRules' }
 *       ]
 *     }
 *   }
 * })
 */

/**
 * A route that can be registered in the navigation sidebar.
 * Routes can be nested via children for hierarchical navigation.
 */
export interface CroutonAppRoute {
  /**
   * The path segment for the route.
   * Will be prefixed appropriately based on context (dashboard/admin).
   * @example '/bookings', '/my-bookings', '/settings/rules'
   */
  path: string

  /**
   * Translation key for the route label.
   * Should be a valid i18n key that resolves to the display text.
   * @example 'navigation.bookings', 'bookings.sidebar.myBookings'
   */
  label: string

  /**
   * Optional icon class for the route.
   * Uses Lucide icons with 'i-lucide-' prefix.
   * @example 'i-lucide-calendar', 'i-lucide-settings'
   */
  icon?: string

  /**
   * Optional nested routes for hierarchical navigation.
   * Children will be displayed as sub-items in the navigation.
   */
  children?: CroutonAppRoute[]

  /**
   * Optional badge text to display next to the route.
   * Useful for showing counts or status indicators.
   */
  badge?: string | number

  /**
   * Whether to hide this route from the navigation.
   * The route still exists but won't appear in sidebars.
   * @default false
   */
  hidden?: boolean
}

/**
 * Configuration for a Crouton app that can register routes
 * across different navigation contexts (dashboard, admin, settings).
 */
export interface CroutonAppConfig {
  /**
   * Unique identifier for the app.
   * Used as the key in the croutonApps registry.
   * @example 'bookings', 'inventory', 'reports'
   */
  id: string

  /**
   * Display name for the app.
   * Used in UI elements that reference the app.
   */
  name: string

  /**
   * Optional icon for the app.
   * Used when displaying the app in lists or headers.
   */
  icon?: string

  /**
   * Routes to display in the user dashboard sidebar.
   * These are team-scoped routes available to all team members.
   * Paths will be prefixed with '/dashboard/[team]'.
   */
  dashboardRoutes?: CroutonAppRoute[]

  /**
   * Routes to display in the admin sidebar.
   * These are admin-only routes for managing the app.
   * Paths will be prefixed with '/admin/[team]' or '/super-admin'.
   */
  adminRoutes?: CroutonAppRoute[]

  /**
   * Routes to display in the settings section of admin.
   * These appear under a "Settings" group in the admin sidebar.
   * Paths will be prefixed appropriately.
   */
  settingsRoutes?: CroutonAppRoute[]
}

/**
 * Registry of all Crouton apps.
 * This interface is augmented by app packages to register their apps.
 */
export interface CroutonAppsRegistry {
  // Empty by default - augmented by app packages
}

/**
 * Helper type for extracting app IDs from the registry.
 */
export type CroutonAppId = keyof CroutonAppsRegistry

/**
 * Type for the croutonApps section of app.config.ts
 * Used for type casting when accessing useAppConfig().croutonApps
 *
 * @example
 * ```typescript
 * const appConfig = useAppConfig()
 * const apps = (appConfig.croutonApps || {}) as CroutonAppsConfig
 * ```
 */
export type CroutonAppsConfig = Record<string, CroutonAppConfig>
