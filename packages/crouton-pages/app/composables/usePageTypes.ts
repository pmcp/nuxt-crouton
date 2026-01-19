import type { CroutonPageType } from '@fyit/crouton/app/types/app'

/**
 * Aggregated page type with app context.
 */
export interface AggregatedPageType extends CroutonPageType {
  /** The app ID this page type belongs to */
  appId: string
  /** The app name for display */
  appName: string
  /** Full unique identifier: 'appId:pageTypeId' */
  fullId: string
}

/**
 * Composable for aggregating all page types from registered apps.
 *
 * Page types are pre-built page templates/components that apps provide.
 * Admins can create pages of these types in the page management UI.
 *
 * @example
 * ```typescript
 * const { pageTypes, getPageType, pageTypesByCategory } = usePageTypes()
 *
 * // Get all available page types
 * console.log(pageTypes.value)
 *
 * // Get a specific page type by full ID
 * const calendarType = getPageType('bookings:calendar')
 *
 * // Get page types grouped by app
 * console.log(pageTypesByApp.value)
 * ```
 */
export function usePageTypes() {
  const { appsList } = useCroutonApps()

  /**
   * All page types from all registered apps, flattened into a single array.
   * Each page type is augmented with app context (appId, appName, fullId).
   */
  const pageTypes = computed<AggregatedPageType[]>(() => {
    const types: AggregatedPageType[] = []

    // Aggregate page types from all apps
    for (const app of appsList.value) {
      if (!app.pageTypes) continue

      for (const pageType of app.pageTypes) {
        types.push({
          ...pageType,
          appId: app.id,
          appName: app.name,
          fullId: `${app.id}:${pageType.id}`
        })
      }
    }

    return types
  })

  /**
   * Page types grouped by category.
   */
  const pageTypesByCategory = computed<Record<string, AggregatedPageType[]>>(() => {
    const groups: Record<string, AggregatedPageType[]> = {}

    for (const type of pageTypes.value) {
      const category = type.category || 'other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(type)
    }

    return groups
  })

  /**
   * Page types grouped by source app.
   */
  const pageTypesByApp = computed<Record<string, AggregatedPageType[]>>(() => {
    const groups: Record<string, AggregatedPageType[]> = {}

    for (const type of pageTypes.value) {
      if (!groups[type.appId]) {
        groups[type.appId] = []
      }
      groups[type.appId].push(type)
    }

    return groups
  })

  /**
   * Get a page type by its full ID ('appId:pageTypeId').
   */
  function getPageType(fullId: string): AggregatedPageType | undefined {
    return pageTypes.value.find(t => t.fullId === fullId)
  }

  /**
   * Get page types for a specific app.
   */
  function getAppPageTypes(appId: string): AggregatedPageType[] {
    return pageTypes.value.filter(t => t.appId === appId)
  }

  /**
   * Check if a page type exists.
   */
  function hasPageType(fullId: string): boolean {
    return pageTypes.value.some(t => t.fullId === fullId)
  }

  /**
   * Get the default page type (Regular Page).
   */
  function getDefaultPageType(): AggregatedPageType {
    return getPageType('pages:regular')!
  }

  return {
    pageTypes,
    pageTypesByCategory,
    pageTypesByApp,
    getPageType,
    getAppPageTypes,
    hasPageType,
    getDefaultPageType
  }
}
