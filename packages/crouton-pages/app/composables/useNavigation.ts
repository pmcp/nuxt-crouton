/**
 * Navigation Composable
 *
 * Builds navigation from published pages in the pagesPages collection.
 * Supports hierarchical navigation with parent-child relationships.
 *
 * @example
 * ```vue
 * <script setup>
 * const { navigation, flatNavigation, isLoading } = useNavigation()
 * </script>
 *
 * <template>
 *   <nav v-if="!isLoading">
 *     <template v-for="item in navigation" :key="item.id">
 *       <NuxtLink :to="item.path">{{ item.title }}</NuxtLink>
 *       <template v-if="item.children?.length">
 *         <NuxtLink
 *           v-for="child in item.children"
 *           :key="child.id"
 *           :to="child.path"
 *         >
 *           {{ child.title }}
 *         </NuxtLink>
 *       </template>
 *     </template>
 *   </nav>
 * </template>
 * ```
 */
export interface NavigationItem {
  id: string
  title: string
  slug: string
  path: string
  icon?: string
  pageType: string
  depth: number
  order: number
  children?: NavigationItem[]
}

export function useNavigation(teamSlug?: MaybeRef<string | null>) {
  const route = useRoute()
  const { locale } = useI18n()
  const { isCustomDomain, hideTeamInUrl } = useDomainContext()

  // Resolve team from prop, route, or domain context
  const team = computed(() => {
    const teamValue = toValue(teamSlug)
    if (teamValue) return teamValue
    return (route.params.team as string) || null
  })

  // Fetch published pages for the team with locale for translated titles/slugs
  const { data: pages, pending: isLoading, refresh } = useFetch(() => {
    if (!team.value) return null
    return `/api/teams/${team.value}/pages`
  }, {
    params: { locale },
    default: () => [],
    transform: (data: any) => data?.data || data || []
  })

  // Refresh navigation when pages collection is mutated (reorder, move, create, update, delete)
  const nuxtApp = useNuxtApp()
  nuxtApp.hook('crouton:mutation' as any, (event: any) => {
    if (event?.collection === 'pagesPages') {
      refresh()
    }
  })

  // Build hierarchical navigation tree
  const navigation = computed<NavigationItem[]>(() => {
    if (!pages.value || !Array.isArray(pages.value)) return []

    // Filter to only published pages that should show in navigation
    const navPages = pages.value.filter((p: any) =>
      p.status === 'published' &&
      p.showInNavigation !== false &&
      p.visibility !== 'hidden'
    )

    // Build path prefix based on domain context (includes locale)
    const teamPrefix = hideTeamInUrl.value ? '' : `/${team.value}`
    const pathPrefix = `${teamPrefix}/${locale.value}`

    // Convert to NavigationItem format
    const items: NavigationItem[] = navPages.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      path: `${pathPrefix}/${p.slug || ''}`.replace(/\/+$/, '') || pathPrefix,
      icon: p.icon,
      pageType: p.pageType,
      depth: p.depth || 0,
      order: p.order || 0,
      parentId: p.parentId
    }))

    // Build tree structure
    const rootItems: NavigationItem[] = []
    const itemMap = new Map<string, NavigationItem>()

    // First pass: create map
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    // Second pass: build tree
    items.forEach(item => {
      const current = itemMap.get(item.id)!
      const parentId = (item as any).parentId

      if (parentId && itemMap.has(parentId)) {
        const parent = itemMap.get(parentId)!
        if (!parent.children) parent.children = []
        parent.children.push(current)
      } else {
        rootItems.push(current)
      }
    })

    // Sort by order at each level
    const sortByOrder = (items: NavigationItem[]) => {
      items.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      items.forEach(item => {
        if (item.children?.length) {
          sortByOrder(item.children)
        }
      })
    }
    sortByOrder(rootItems)

    return rootItems
  })

  // Flat navigation (no hierarchy, just a list)
  const flatNavigation = computed<NavigationItem[]>(() => {
    const flatten = (items: NavigationItem[]): NavigationItem[] => {
      return items.reduce((acc, item) => {
        acc.push(item)
        if (item.children?.length) {
          acc.push(...flatten(item.children))
        }
        return acc
      }, [] as NavigationItem[])
    }
    return flatten(navigation.value)
  })

  // Check if current route matches a navigation item
  const isActive = (item: NavigationItem) => {
    return route.path === item.path || route.path.startsWith(`${item.path}/`)
  }

  // Get current page from navigation
  const currentPage = computed(() => {
    return flatNavigation.value.find(item => isActive(item))
  })

  return {
    /** Hierarchical navigation tree */
    navigation,
    /** Flat list of all navigation items */
    flatNavigation,
    /** Whether navigation is loading */
    isLoading,
    /** Current active page */
    currentPage,
    /** Check if a navigation item is active */
    isActive,
    /** Refresh navigation data */
    refresh,
    /** Current team slug */
    team
  }
}
