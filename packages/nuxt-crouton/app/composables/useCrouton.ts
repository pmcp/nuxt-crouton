// v1.0.1 - Fixed inject() warning by moving useToast() calls inside methods
/**
 * useCrouton - Modal and form state management
 *
 * NOTE: This composable now only manages modal/form UI state.
 * For data operations, use:
 * - useCollectionQuery() for fetching data
 * - useCollectionMutation() for create/update/delete
 */

// Type definitions
type CroutonAction = 'create' | 'update' | 'delete' | 'view' | null
type LoadingState = 'notLoading' | 'create_send' | 'update_send' | 'delete_send' | 'view_send' | 'create_open' | 'update_open' | 'delete_open' | 'view_open'

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
  const route = useRoute()
  const { getTeamId } = useTeamContext()

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

  const open = async (actionIn: CroutonAction, collection: string, ids: string[] = [], container: 'slideover' | 'modal' | 'dialog' = 'slideover', initialData?: any): Promise<void> => {
    console.log('[Crouton.open] Called with:', { actionIn, collection, ids, container, initialData })

    const hasErrors = useCroutonError().foundErrors()
    if(hasErrors) {
      console.log('[Crouton.open] BLOCKING: foundErrors returned true, exiting')
      return
    }

    // Check if we've reached maximum depth
    if (croutonStates.value.length >= MAX_DEPTH) {
      console.log('[useCrouton v1.0.1] About to call useToast() for max depth warning')
      const toast = useToast()
      console.log('[useCrouton v1.0.1] useToast() called successfully')
      toast.add({
        title: 'Maximum depth reached',
        description: 'Cannot open more than 5 nested forms',
        icon: 'i-lucide-octagon-alert',
        color: 'primary'
      })
      return
    }

    // Create new state object
    const newState: CroutonState = {
      id: `crouton-${Date.now()}-${Math.random()}`,
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
    console.log('[Crouton.open] New state added, total states:', croutonStates.value.length)

    if (actionIn === 'update' || actionIn === 'view') {
      try {
        // Get the apiPath from config
        const collections = useCollections()
        const config = collections.getConfig(collection)
        const apiPath = config?.apiPath || collection
        const fetchStrategy = config?.fetchStrategy || 'query'

        // Determine base API path
        let basePath: string
        if (route.path.includes('/super-admin/')) {
          basePath = `/api/super-admin/${apiPath}`
        } else {
          const teamId = getTeamId()
          if (!teamId) {
            console.error('[useCrouton] Team context required but not available')
            throw new Error('Team context required to open form')
          }
          basePath = `/api/teams/${teamId}/${apiPath}`
        }

        // Build full path based on fetch strategy
        let fullApiPath: string
        let queryParams: Record<string, any> = {}

        if (fetchStrategy === 'restful') {
          // RESTful: /api/teams/{teamId}/{collection}/{itemId}
          fullApiPath = `${basePath}/${ids[0]}`
        } else {
          // Query-based: /api/teams/{teamId}/{collection}?ids=x,y,z
          fullApiPath = basePath
          queryParams = { ids: ids.join(',') }
        }

        console.log('[Crouton.open] Fetching item for edit:', fullApiPath, queryParams)

        // Fetch the item to edit
        const response = await $fetch<any>(fullApiPath, {
          method: 'GET',
          query: queryParams,
          credentials: 'include'
        })

        // Extract the active item from response
        let activeItem: any
        if (response?.items && response?.pagination) {
          activeItem = Array.isArray(response.items) ? response.items[0] : response.items
        } else {
          activeItem = Array.isArray(response) ? response[0] : response
        }

        // Update the state
        const stateIndex = croutonStates.value.findIndex((s: CroutonState) => s.id === newState.id)
        if (stateIndex !== -1) {
          croutonStates.value[stateIndex] = {
            ...croutonStates.value[stateIndex],
            activeItem: activeItem,
            loading: 'notLoading'
          } as CroutonState
        }
        return
      } catch (error) {
        console.error('[Crouton.open] Error fetching item:', error)
        console.log('[useCrouton v1.0.1] About to call useToast() for error message')
        const toast = useToast()
        console.log('[useCrouton v1.0.1] useToast() called successfully')
        toast.add({
          title: 'Uh oh! Something went wrong.',
          description: String(error),
          icon: 'i-lucide-octagon-alert',
          color: 'primary'
        })
        croutonStates.value.pop()
        return
      }
    }

    if(actionIn === 'create') {
      newState.activeItem = initialData || {}
    }

    if(actionIn === 'delete') {
      newState.items = ids
    }

    // Set loading to notLoading
    newState.loading = 'notLoading'
    console.log('[Crouton.open] Completed')
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
    // Modal state
    showCrouton,
    loading,
    action,
    items,
    activeItem,
    activeCollection,
    croutonStates,

    // Modal actions
    open,
    close,
    closeAll,
    removeState,
    reset,

    // Pagination (still needed for some components)
    pagination,
    setPagination,
    getPagination,
    getDefaultPagination
  }

}
