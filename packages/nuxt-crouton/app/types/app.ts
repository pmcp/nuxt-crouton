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
 * Configuration field definition for page type settings.
 * Used to define configurable options when creating a page of a specific type.
 */
export interface CroutonPageTypeConfigField {
  /**
   * Field name (used as key in config object).
   * @example 'locationId', 'showFilters', 'pageSize'
   */
  name: string

  /**
   * Display label for the field.
   * @example 'Default Location', 'Show Filters'
   */
  label: string

  /**
   * Field input type.
   */
  type: 'string' | 'boolean' | 'number' | 'select' | 'reference'

  /**
   * Default value for the field.
   */
  default?: unknown

  /**
   * Whether the field is required.
   */
  required?: boolean

  /**
   * Options for select fields.
   */
  options?: { value: string; label: string }[]

  /**
   * Collection name for reference fields.
   * @example 'bookingsLocations'
   */
  referenceCollection?: string
}

/**
 * A page type that an app provides for CMS use.
 * Page types are pre-built templates/components that render specific app functionality.
 * Admins can create pages of these types in the page management UI.
 */
export interface CroutonPageType {
  /**
   * Unique identifier for this page type within the app.
   * Combined with appId creates global uniqueness: 'bookings:calendar'
   * @example 'calendar', 'wizard', 'my-bookings'
   */
  id: string

  /**
   * Display name for the page type.
   * Shown in admin UI when selecting page type.
   * @example 'Booking Calendar', 'Booking Wizard'
   */
  name: string

  /**
   * Description of what this page type provides.
   * @example 'Shows an interactive calendar for customers to make bookings'
   */
  description?: string

  /**
   * Icon for the page type.
   * Uses Lucide icons with 'i-lucide-' prefix.
   * @example 'i-lucide-calendar', 'i-lucide-list'
   */
  icon?: string

  /**
   * The Vue component name to render for this page type.
   * Must be a globally registered component from the app package.
   * @example 'CroutonBookingsCalendar', 'CroutonBookingsCustomerBookingWizard'
   */
  component: string

  /**
   * Default props to pass to the component.
   * Page-specific overrides can be stored in the page record.
   */
  defaultProps?: Record<string, unknown>

  /**
   * Configuration schema for page-specific settings.
   * These appear in the admin form when creating/editing a page of this type.
   */
  configSchema?: CroutonPageTypeConfigField[]

  /**
   * Category for organizing page types in the UI.
   * @example 'customer', 'admin', 'display'
   */
  category?: string

  /**
   * Whether this page type requires authentication.
   * @default false
   */
  requiresAuth?: boolean

  /**
   * Preview image URL for the page type.
   * Shown in admin selection UI.
   */
  previewImage?: string
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

  /**
   * Page types this app provides for CMS use.
   * These appear in the admin page creation flow, allowing admins
   * to create pages that render app-specific components.
   * @example
   * ```typescript
   * pageTypes: [
   *   {
   *     id: 'calendar',
   *     name: 'Booking Calendar',
   *     component: 'CroutonBookingsCalendar',
   *     icon: 'i-lucide-calendar',
   *     category: 'customer'
   *   }
   * ]
   * ```
   */
  pageTypes?: CroutonPageType[]
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
