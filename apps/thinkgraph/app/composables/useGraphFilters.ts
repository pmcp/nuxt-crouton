import type { ThinkgraphNode } from '../../layers/thinkgraph/collections/nodes/types'

export interface GraphFilterState {
  search: string
  branches: string[]
  nodeTypes: string[]
  pathTypes: string[]
  starred: boolean | null
  pinned: boolean | null
  versionTags: string[]
}

export function useGraphFilters(decisions: Ref<ThinkgraphNode[]>) {
  const filters = ref<GraphFilterState>({
    search: '',
    branches: [],
    nodeTypes: [],
    pathTypes: [],
    starred: null,
    pinned: null,
    versionTags: [],
  })

  const searchTerm = computed(() => filters.value.search)
  const debouncedSearch = refDebounced(searchTerm, 200)

  const availableBranches = computed(() => {
    const counts = new Map<string, number>()
    for (const d of decisions.value || []) {
      const branch = d.branchName || 'main'
      counts.set(branch, (counts.get(branch) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const availableVersionTags = computed(() => {
    const counts = new Map<string, number>()
    for (const d of decisions.value || []) {
      if (d.versionTag) {
        counts.set(d.versionTag, (counts.get(d.versionTag) || 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const filteredIds = computed<Set<string> | null>(() => {
    const f = filters.value
    const search = debouncedSearch.value
    const hasFilters = search || f.branches.length || f.nodeTypes.length
      || f.pathTypes.length || f.starred !== null || f.pinned !== null || f.versionTags.length

    if (!hasFilters) return null

    const ids = new Set<string>()
    const searchLower = search.toLowerCase()

    for (const d of decisions.value || []) {
      if (search && !d.content?.toLowerCase().includes(searchLower)) continue
      if (f.branches.length && !f.branches.includes(d.branchName || 'main')) continue
      if (f.nodeTypes.length && !f.nodeTypes.includes(d.nodeType)) continue
      if (f.pathTypes.length && (!d.pathType || !f.pathTypes.includes(d.pathType))) continue
      if (f.starred === true && !d.starred) continue
      if (f.starred === false && d.starred) continue
      if (f.pinned === true && !d.pinned) continue
      if (f.pinned === false && d.pinned) continue
      if (f.versionTags.length && (!d.versionTag || !f.versionTags.includes(d.versionTag))) continue
      ids.add(d.id)
    }
    return ids
  })

  const activeFilterCount = computed(() => {
    let count = 0
    if (filters.value.search) count++
    if (filters.value.branches.length) count++
    if (filters.value.nodeTypes.length) count++
    if (filters.value.pathTypes.length) count++
    if (filters.value.starred !== null) count++
    if (filters.value.pinned !== null) count++
    if (filters.value.versionTags.length) count++
    return count
  })

  function clearFilters() {
    filters.value = {
      search: '',
      branches: [],
      nodeTypes: [],
      pathTypes: [],
      starred: null,
      pinned: null,
      versionTags: [],
    }
  }

  return { filters, filteredIds, activeFilterCount, availableBranches, availableVersionTags, clearFilters }
}
