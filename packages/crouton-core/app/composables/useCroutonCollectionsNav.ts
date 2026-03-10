/**
 * Composable for accessing registered Crouton collections for admin navigation.
 *
 * Reads from app.config.croutonCollections and returns navigation-ready items
 * filtered by adminNav.enabled, grouped by kind, and sorted by adminNav.order.
 *
 * @example
 * ```typescript
 * const { adminCollections, collectionsByKind } = useCroutonCollectionsNav()
 *
 * // Flat list (backwards-compatible):
 * // [{ name: 'blogPosts', label: 'Blog Posts', icon: 'i-lucide-database', order: 99, kind: 'content' }]
 *
 * // Grouped by kind:
 * // { content: [...], media: [...], data: [...] }
 * ```
 */
export function useCroutonCollectionsNav() {
  const appConfig = useAppConfig()
  const { collectionWithCapital } = useFormatCollections()

  type CollectionKind = 'data' | 'content' | 'media'

  interface CollectionNavItem {
    name: string
    label: string
    icon: string
    order: number
    kind: CollectionKind
  }

  /** Kind metadata for sidebar grouping */
  const kindMeta: Record<CollectionKind, { label: string; icon: string; order: number }> = {
    content: { label: 'Content', icon: 'i-lucide-file-text', order: 1 },
    media: { label: 'Media', icon: 'i-lucide-image', order: 2 },
    data: { label: 'Collections', icon: 'i-lucide-database', order: 3 },
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
        order: config.adminNav?.order ?? 99,
        kind: (config.kind || 'data') as CollectionKind
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
   * Collections grouped by kind, with only non-empty groups returned.
   * Each group has metadata (label, icon) and sorted collection items.
   */
  const collectionsByKind = computed(() => {
    const groups: { kind: CollectionKind; label: string; icon: string; items: CollectionNavItem[] }[] = []

    for (const [kind, meta] of Object.entries(kindMeta) as [CollectionKind, typeof kindMeta[CollectionKind]][]) {
      const items = adminCollections.value.filter(c => c.kind === kind)
      if (items.length > 0) {
        groups.push({ kind, label: meta.label, icon: meta.icon, items })
      }
    }

    // Sort groups by their defined order
    groups.sort((a, b) => kindMeta[a.kind].order - kindMeta[b.kind].order)

    return groups
  })

  /**
   * Check if any collections are available for admin navigation.
   */
  const hasCollections = computed(() => adminCollections.value.length > 0)

  return {
    adminCollections,
    collectionsByKind,
    kindMeta,
    hasCollections
  }
}

export default useCroutonCollectionsNav
