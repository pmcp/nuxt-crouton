/**
 * Composable for accessing registered Crouton collections for admin navigation.
 *
 * Reads from app.config.croutonCollections and returns navigation-ready items
 * filtered by adminNav.enabled and sorted by adminNav.order.
 *
 * @example
 * ```typescript
 * const { adminCollections } = useCroutonCollectionsNav()
 *
 * // Returns array of collections with nav metadata:
 * // [{ name: 'blogPosts', label: 'Blog Posts', icon: 'i-lucide-database', order: 99 }]
 * ```
 */
export function useCroutonCollectionsNav() {
  const appConfig = useAppConfig()
  const { collectionWithCapital } = useFormatCollections()

  interface CollectionNavItem {
    name: string
    label: string
    icon: string
    order: number
  }

  /**
   * All collections configured for admin navigation.
   * Filtered to exclude collections where adminNav.enabled === false.
   * Sorted by adminNav.order (default: 99) then alphabetically.
   */
  const adminCollections = computed<CollectionNavItem[]>(() => {
    const collections = (appConfig.croutonCollections || {}) as Record<string, any>

    return Object.entries(collections)
      .filter(([_, config]) => {
        // Include by default unless explicitly disabled
        return config?.adminNav?.enabled !== false
      })
      .map(([name, config]) => ({
        name,
        label: config.adminNav?.label || config.displayName || collectionWithCapital(name),
        icon: config.adminNav?.icon || 'i-lucide-database',
        order: config.adminNav?.order ?? 99
      }))
      .sort((a, b) => {
        // First sort by order
        if (a.order !== b.order) {
          return a.order - b.order
        }
        // Then alphabetically by label
        return a.label.localeCompare(b.label)
      })
  })

  /**
   * Check if any collections are available for admin navigation.
   */
  const hasCollections = computed(() => adminCollections.value.length > 0)

  return {
    adminCollections,
    hasCollections
  }
}

export default useCroutonCollectionsNav
