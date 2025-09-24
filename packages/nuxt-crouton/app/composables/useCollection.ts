/**
 * Client-side composable for working with collections that support pagination
 * Simplified version that works directly with the collections store
 * No SSR complexity - perfect for admin panels
 */
export function useCollection(collectionName: string) {
  const { getCollection, pagination, setPagination, getDefaultPagination } = useCrud()
  const collections = useCollections()
  const pending = ref(false)
  const error = ref<any>(null)

  // Initialize pagination with defaults
  const defaultPagination = getDefaultPagination(collectionName)
  setPagination(collectionName, defaultPagination)

  // Get the collection store
  const collectionStore = collections[collectionName as keyof typeof collections] as Ref<any[]> | undefined

  // Fetch function with loading state
  const refresh = async () => {
    pending.value = true
    error.value = null
    try {
      await getCollection(collectionName, {}, true)
    } catch (e) {
      error.value = e
    } finally {
      pending.value = false
    }
  }

  // Auto-fetch on mount
  onMounted(() => refresh())

  // Return reactive values directly from store
  // Components should handle pagination changes themselves
  return {
    items: computed(() => collectionStore?.value || []),
    pagination: computed(() => pagination.value[collectionName] || {}),
    pending: readonly(pending),
    error: readonly(error),
    refresh,
    collectionStore
  }
}

export default useCollection