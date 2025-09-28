import {
  applyOptimisticCreate,
  applyOptimisticUpdate,
  applyOptimisticDelete,
  replaceByOptimisticId,
  rollbackCreate,
  apiGet,
  apiPost,
  apiPatch,
  apiDelete
} from '../utils/functional';
import useCollections from './useCollections';

// Type definitions
type CroutonAction = 'create' | 'update' | 'delete' | null
type LoadingState = 'notLoading' | 'create_send' | 'update_send' | 'delete_send' | 'create_open' | 'update_open' | 'delete_open'

interface CroutonState {
  id: string
  action: CroutonAction
  collection: string | null
  activeItem: any
  items: any[]
  loading: LoadingState
  isOpen: boolean
  containerType: 'slideover' | 'modal' | 'dialog'
}

interface PaginationState {
  currentPage: number
  pageSize: number
  sortBy: string
  sortDirection: 'asc' | 'desc'
  totalItems?: number
  totalPages?: number
}

interface PaginationMap {
  [collection: string]: PaginationState
}

interface PaginatedResponse<T = any> {
  items: T[]
  pagination: PaginationState
}

// Default pagination settings for all collections
const DEFAULT_PAGINATION: PaginationState = {
  currentPage: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
}


export default function () {
  const toast = useToast()
  const route = useRoute()
  // TODO
  const { currentTeam } = useTeam()

  // Helper function to get the correct API base path
  const getApiBasePath = (apiPath: string) => {
    // Check if we're in super-admin context
    if (route.path.includes('/super-admin/')) {
      return `/api/super-admin/${apiPath}`
    }
    // Default to team-based path using route params
    return `/api/teams/${route.params.team}/${apiPath}`
  }

  const pagination = useState<PaginationMap>('pagination', () => ({}))


  // useState - now using array of states for multiple slideovers
  const croutonStates = useState<CroutonState[]>('croutonStates', () => [])
  const MAX_DEPTH = 5 // Maximum nesting depth

  // Computed values for backward compatibility
  const showCrouton = computed(() => croutonStates.value.length > 0)
  const loading = computed(() => croutonStates.value[croutonStates.value.length - 1]?.loading || 'notLoading')
  const action = computed(() => croutonStates.value[croutonStates.value.length - 1]?.action || null)
  const activeCollection = computed(() => croutonStates.value[croutonStates.value.length - 1]?.collection || null)
  const items = computed(() => croutonStates.value[croutonStates.value.length - 1]?.items || [])
  const activeItem = computed(() => croutonStates.value[croutonStates.value.length - 1]?.activeItem || {})

  // Simple vars - removed unused actions object

  // Functions

  // Create a composable function for fetch calls
  const createFetchable = (collection: string, options: Record<string, any> = {}) => {
    return useFetch(`/api/${collection}`, {
      key: `${collection}-${Date.now()}`, // Unique key for each call
      ...options
    })
  }


  async function getCollection(collection: string, query: Record<string, any> = {}, usePagination: boolean = false) {
    if(useCroutonError().foundErrors()) return;

    // Get test reference before async operations
    const collections = useCollections();
    const collectionRef = collections[collection as keyof typeof collections] as Ref<any[]> | undefined;

    try {
      // Get the correct API path based on context
      const config = collections.getConfig(collection)
      const apiPath = config?.apiPath || collection
      const fullApiPath = route.path.includes('/super-admin/')
        ? `/api/super-admin/${apiPath}`
        : `/api/teams/${route.params.team}/${apiPath}`

      // Add pagination parameters if requested
      if (usePagination && pagination.value[collection]) {
        query.page = pagination.value[collection].currentPage || 1
        query.limit = pagination.value[collection].pageSize || 10
        query.sortBy = pagination.value[collection].sortBy
        query.sortDirection = pagination.value[collection].sortDirection
      }

      // Use $fetch for API calls with proper error handling
      const res = await $fetch<any>(fullApiPath, {
        method: 'GET',
        query: query,
        credentials: 'include'
      })

      // Check if response has pagination structure
      if(res && 'items' in res && 'pagination' in res) {
        // Paginated response
        if(collectionRef) {
          collectionRef.value = res.items
        }
        // Update pagination state for this collection
        pagination.value[collection] = {
          ...pagination.value[collection],
          ...res.pagination
        }
        return res;
      } else if(res && Array.isArray(res)) {
        // Non-paginated response (backward compatibility)
        if(collectionRef) {
          collectionRef.value = res
        }
        // Clear pagination for this collection
        if(pagination.value[collection]) {
          delete pagination.value[collection]
        }
        return res;
      } else if(res && res.items && collectionRef) {
        // Has items but no pagination
        collectionRef.value = res.items
        return res;
      }

      return res;
    } catch (error: any) {
      const errorMessage = error.data?.message || error.data || `Error fetching ${collection}`;
      toast.add({
        title: 'Uh oh! Something went wrong.',
        description: errorMessage,
        icon: 'i-lucide-octagon-alert',
        color: 'primary'
      })

      // Set empty collection on error to prevent UI issues
      if (collectionRef) {
        collectionRef.value = [];
      }

      return null;
    }
  }


  // Pure functional optimistic update
  function optimisticUpdate(action: string, collection: string, data: any): any {

    // Get test reference
    const collections = useCollections();
    const collectionItems = collections[collection as keyof typeof collections] as Ref<any[]> | undefined
    if (!collectionItems) return null

    // Apply the appropriate optimistic transformation
    if (action === 'delete') {
      const { collection: newCollection, deletedIds } = applyOptimisticDelete(
        collectionItems.value,
        data // data is array of ids for delete
      )
      collectionItems.value = newCollection

      // Clear selected rows
      const selectedRows = useState<any[]>('selectedRows')
      selectedRows.value = []

      return deletedIds
    }

    if (action === 'create') {
      const { collection: newCollection, optimisticItem } = applyOptimisticCreate(
        collectionItems.value,
        data
      )
      collectionItems.value = newCollection
      return optimisticItem
    }

    if (action === 'update') {
      console.log('[optimisticUpdate] UPDATE action:', { collection, data, currentItems: collectionItems.value?.length })

      // Log the item BEFORE update
      const originalItem = collectionItems.value.find((item: any) => item.id === data.id)
      console.log('[optimisticUpdate] Original item before update:', originalItem)
      console.log('[optimisticUpdate] Update data being applied:', data)

      const { collection: newCollection, optimisticItem } = applyOptimisticUpdate(
        collectionItems.value,
        data.id,
        data
      )

      console.log('[optimisticUpdate] After applyOptimisticUpdate:', {
        optimisticItem,
        optimisticId: optimisticItem?.optimisticId,
        newCollectionLength: newCollection.length
      })

      if (optimisticItem) {
        collectionItems.value = newCollection
        console.log('[optimisticUpdate] Updated collection store with optimistic item')

        // Verify the update in the store
        const updatedItem = collectionItems.value.find((item: any) => item.id === data.id)
        console.log('[optimisticUpdate] Item in store after optimistic update:', updatedItem)

        // Update the actual state, not the computed property
        const currentState = croutonStates.value[croutonStates.value.length - 1]
        if (currentState) {
          currentState.activeItem = optimisticItem
        }
      }

      return optimisticItem
    }

    return null
  }

  async function send(action: string, collection: string, data: any): Promise<any> {
    if(useCroutonError().foundErrors()) return;

    // Find the state that initiated this send
    const currentState = croutonStates.value[croutonStates.value.length - 1]
    if (!currentState) return;

    currentState.loading = `${action}_send` as LoadingState

    // Get test reference before async operations
    const collections = useCollections();
    const collectionRef = collections[collection as keyof typeof collections] as Ref<any[]> | undefined;

    // Get the apiPath from config, fallback to collection name
    const config = collections.getConfig(collection)
    const apiPath = config?.apiPath || collection

    // Store items before delete for potential rollback
    let itemsBeforeDelete: any[] = []
    if (action === 'delete' && collectionRef && Array.isArray(data)) {
      // Store the full items that are about to be deleted
      itemsBeforeDelete = data.map((id: string) => {
        return collectionRef.value.find((item: any) => item.id === id)
      }).filter(Boolean)
    }

    const optimisticItem = optimisticUpdate(action, collection, data)

    try {
      let res: any;
      // Use the correct API base path based on context
      const baseUrl = getApiBasePath(apiPath)

      // Use functional API helpers
      if (action === 'update') {
        console.log('[send] UPDATE - Sending to API:', { baseUrl, id: data.id, data })
        // Send the entire data object, not just specific fields
        res = await apiPatch(`${baseUrl}/${data.id}`)(data)
        console.log('[send] UPDATE - API Response:', res)
      }

      if (action === 'create') {
        res = await apiPost(baseUrl)(data)
      }

      if (action === 'delete') {
        // For delete, we need to delete each item individually
        // since the API expects DELETE /api/teams/[teamId]/posts/[postId]
        const deletePromises = data.map((id: string) =>
          apiDelete(`${baseUrl}/${id}`)()
        )
        res = await Promise.all(deletePromises)
      }


      if(action === 'create' || action === 'update') {
        // Use functional helper to replace optimistic item with server response
        if (optimisticItem && optimisticItem.optimisticId && collectionRef) {
          console.log('[send] Before replaceByOptimisticId:', {
            optimisticId: optimisticItem.optimisticId,
            optimisticItem,
            serverResponse: res,
            collectionLength: collectionRef.value.length
          })

          const itemBeforeReplace = collectionRef.value.find((item: any) => item.optimisticId === optimisticItem.optimisticId)
          console.log('[send] Item with optimisticId in collection:', itemBeforeReplace)

          collectionRef.value = replaceByOptimisticId(
            collectionRef.value,
            optimisticItem.optimisticId,
            res
          )

          console.log('[send] After replaceByOptimisticId:', {
            collectionLength: collectionRef.value.length
          })

          const itemAfterReplace = collectionRef.value.find((item: any) => item.id === res.id)
          console.log('[send] Item after replacement:', itemAfterReplace)
        } else {
          console.log('[send] NOT replacing - no optimisticItem or optimisticId:', {
            hasOptimisticItem: !!optimisticItem,
            optimisticId: optimisticItem?.optimisticId
          })
        }
      }

      // Show success toast only when operation succeeds
      // For users collection, show more specific message
      if (collection === 'users' && action === 'create') {
        const wasExistingUser = optimisticItem.isExistingUser;
        if (wasExistingUser) {
          toast.add({
            title: 'User added to organisation successfully'
          });
        } else {
          toast.add({
            title: 'User created and added to organisation'
          });
        }
      } else {
        toast.add(
          {
            title: 'Succes!',
            description: `${useFormatCollections().collectionWithCapitalSingular(collection)} ${action}d`,
            icon: 'i-lucide-check',
            color: 'primary'
          })

      }

      // Trigger closing animation instead of immediately removing state
      if (currentState) {
        currentState.isOpen = false
      }

      // No longer need to trigger refresh - components will auto-fetch on mount

      // Return the response for the caller to use
      return res

    } catch (error: any) {
      const errorMessage = error.data?.message || error.data || 'Operation failed';
      toast.add({
        title: 'Uh oh! Something went wrong.',
        description: errorMessage,
        icon: 'i-lucide-octagon-alert',
        color: 'primary'
      })


      // Rollback optimistic update using functional helpers
      if(action === 'create' && optimisticItem?.optimisticId && collectionRef) {
        collectionRef.value = rollbackCreate(collectionRef.value, optimisticItem.optimisticId)
      } else if(action === 'update' && optimisticItem && collectionRef) {
        // For update rollback, remove the optimistic flags
        const index = collectionRef.value.findIndex((item: any) => item.id === optimisticItem.id)
        if(index !== -1) {
          // Remove optimistic flags but keep the item
          const cleanItem = { ...collectionRef.value[index] }
          delete cleanItem.optimisticAction
          delete cleanItem.optimisticId
          collectionRef.value[index] = cleanItem
        }
      } else if(action === 'delete' && collectionRef && itemsBeforeDelete.length > 0) {
        // Restore the deleted items back to the collection
        // We need to maintain the original order, so we'll insert them at their original positions
        const currentItems = [...collectionRef.value]

        // Add back each deleted item
        itemsBeforeDelete.forEach(item => {
          // Remove any optimistic flags from the item
          const cleanItem = { ...item }
          delete cleanItem.optimisticAction
          delete cleanItem.optimisticId

          // Find the appropriate position to insert (maintaining order by createdAt or id)
          // For simplicity, we'll add them at the beginning since they were likely near the top
          currentItems.unshift(cleanItem)
        })

        collectionRef.value = currentItems
      }

      // Keep the modal open on error so user can retry
      if (currentState) {
        currentState.loading = 'notLoading'
      }

    }
  }

  const open = async (actionIn: CroutonAction, collection: string, ids: string[], container: 'slideover' | 'modal' | 'dialog' = 'slideover', initialData?: any): Promise<void> => {
    if(useCroutonError().foundErrors()) return;

    // Check if we've reached maximum depth
    if (croutonStates.value.length >= MAX_DEPTH) {
      const toast = useToast()
      toast.add({
        title: 'Maximum depth reached',
        description: 'Cannot open more than 5 nested forms',
        icon: 'i-lucide-octagon-alert',
        color: 'primary'
      })
      return;
    }

    // Create new state object
    const newState: CroutonState = {
      id: `crouton-${Date.now()}-${Math.random()}`, // Unique ID for Vue key
      action: actionIn,
      collection: collection,
      activeItem: {},
      items: [],
      loading: `${actionIn}_open` as LoadingState,
      isOpen: true,
      containerType: container
    }

    // Add new state to array
    croutonStates.value.push(newState)

    if (actionIn === 'update') {
      try {
        // Get the apiPath from config, fallback to collection name
        const collections = useCollections()
        const config = collections.getConfig(collection)
        const apiPath = config?.apiPath || collection

        // Use the correct API base path based on context
        const fullApiPath = getApiBasePath(apiPath)

        console.log('[Crouton Update] Fetching item for edit:', {
          collection,
          apiPath,
          fullApiPath,
          ids: ids.join(',')
        })

        // Use $fetch for API calls with proper error handling
        const response = await $fetch<any>(fullApiPath, {
          method: 'GET',
          query: { ids: ids.join(',') }
        });

        console.log('[Crouton Update] Response received:', {
          response,
          isArray: Array.isArray(response),
          hasItems: response?.items !== undefined,
          hasPagination: response?.pagination !== undefined
        })

        // Check if response is paginated
        let activeItem: any;
        if (response?.items && response?.pagination) {
          // Response is paginated, extract items
          console.log('[Crouton Update] Paginated response detected, extracting items')
          activeItem = Array.isArray(response.items) ? response.items[0] : response.items
        } else {
          // Regular response
          activeItem = Array.isArray(response) ? response[0] : response
        }

        console.log('[Crouton Update] Active item extracted:', activeItem)

        // Find the state index and update it reactively
        const stateIndex = croutonStates.value.findIndex((s: CroutonState) => s.id === newState.id)
        if (stateIndex !== -1) {
          croutonStates.value[stateIndex] = {
            ...croutonStates.value[stateIndex],
            activeItem: activeItem,
            loading: 'notLoading'
          } as CroutonState
        }
        return; // Exit early since we've already set loading to notLoading
      } catch (error) {
        console.error('[Crouton Update] Error fetching item:', error)
        toast.add({
          title: 'Uh oh! Something went wrong.',
          description: String(error),
          icon: 'i-lucide-octagon-alert',
          color: 'primary'
        })
        // Remove the state we just added
        croutonStates.value.pop();
        return;
      }
    }

    if(actionIn === 'create') {
      // For create, use initial data if provided, otherwise start with empty activeItem
      newState.activeItem = initialData || {}
    }

    if(actionIn === 'delete') {
      // For delete, store IDs in items array
      newState.items = ids
    }

    // Set loading to notLoading (update actions have already returned)
    newState.loading = 'notLoading'
  }




  const close = (stateId?: string): void => {
    if (stateId) {
      // Find the state and set isOpen to false to trigger animation
      const state = croutonStates.value.find((s: CroutonState) => s.id === stateId)
      if (state) {
        state.isOpen = false
      }
    } else {
      // Close the topmost state (backward compatibility)
      const topState = croutonStates.value[croutonStates.value.length - 1]
      if (topState) {
        topState.isOpen = false
      }
    }
  }

  // New function to actually remove the state from the array (called after animation)
  const removeState = (stateId: string): void => {
    const index = croutonStates.value.findIndex((s: CroutonState) => s.id === stateId)
    if (index !== -1) {
      croutonStates.value.splice(index, 1)
    }
  }

  // New function to close all states
  const closeAll = (): void => {
    // Set all states to closed to trigger animations
    croutonStates.value.forEach((state: CroutonState) => {
      state.isOpen = false
    })
    // After a delay, clear all states (fallback in case after:leave doesn't fire)
    setTimeout(() => {
      croutonStates.value = []
    }, 300)
  }

  // Reset function for navigation scenarios
  const reset = (): void => {
    croutonStates.value = []
  }

  // Function to update pagination for a collection
  function setPagination(collection: string, paginationData: Partial<PaginationState>) {
    console.log('[useCrouton] setPagination called:', { collection, paginationData })
    const oldValue = pagination.value[collection]
    pagination.value[collection] = {
      ...DEFAULT_PAGINATION,
      ...pagination.value[collection],
      ...paginationData
    }
    console.log('[useCrouton] pagination state updated from:', oldValue, 'to:', pagination.value[collection])
  }

  // Function to get pagination for a collection
  function getPagination(collection: string): PaginationState {
    return pagination.value[collection] || {
      currentPage: 1,
      pageSize: 10,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      totalItems: 0,
      totalPages: 0
    }
  }

  // Function to get default pagination for a collection
  function getDefaultPagination(collection: string): PaginationState {
    // Try to get collection-specific defaults first
    const collections = useCollections()
    const config = collections.getConfig?.(collection)

    // Return collection-specific defaults or global defaults
    return config?.defaultPagination || DEFAULT_PAGINATION
  }


  return {
    pagination, // Already exported - the reactive state
    showCrouton,
    loading,
    action,
    items,
    activeItem,
    activeCollection,
    croutonStates,
    send,
    open,
    close,
    closeAll,
    removeState,
    reset,
    getCollection,
    setPagination,
    getPagination,
    getDefaultPagination
  }

}
