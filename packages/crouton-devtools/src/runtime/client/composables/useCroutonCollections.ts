export interface CroutonCollection {
  key: string
  name: string
  layer?: string
  apiPath?: string
  componentName?: string | null
  meta?: {
    label?: string
    description?: string
    icon?: string
  }
  defaultValues?: Record<string, any>
  columns?: string[]
  schema?: any
}

export interface CollectionsResponse {
  success: boolean
  data: CroutonCollection[]
  count: number
}

export function useCroutonCollections() {
  const collections = ref<CroutonCollection[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const fetchCollections = async () => {
    try {
      loading.value = true
      error.value = null

      const response = await $fetch<CollectionsResponse>('/__nuxt_crouton_devtools/api/collections')

      collections.value = response.data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch collections'
      console.error('Failed to fetch collections:', e)
    } finally {
      loading.value = false
    }
  }

  return {
    collections,
    loading,
    error,
    fetchCollections
  }
}
