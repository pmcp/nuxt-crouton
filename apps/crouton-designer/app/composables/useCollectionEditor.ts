import type { DesignerCollection } from '~~/layers/designer/collections/collections/types'
import type { DesignerField } from '~~/layers/designer/collections/fields/types'

export interface CollectionWithFields extends DesignerCollection {
  fields: DesignerField[]
}

export function useCollectionEditor(projectId: Ref<string>) {
  const { buildApiUrl } = useTeamContext()

  const collections = ref<DesignerCollection[]>([])
  const fields = ref<DesignerField[]>([])
  const loading = ref(false)

  // Fields grouped by collection
  const fieldsByCollection = computed(() => {
    const map = new Map<string, DesignerField[]>()
    for (const field of fields.value) {
      const existing = map.get(field.collectionId) || []
      existing.push(field)
      map.set(field.collectionId, existing)
    }
    return map
  })

  // Collections enriched with their fields
  const collectionsWithFields = computed<CollectionWithFields[]>(() =>
    collections.value.map(col => ({
      ...col,
      fields: fieldsByCollection.value.get(col.id) || []
    }))
  )

  // --- Fetch ---

  async function fetchAll() {
    loading.value = true
    try {
      const [allCollections, allFields] = await Promise.all([
        $fetch<DesignerCollection[]>(buildApiUrl('/designer-collections')),
        $fetch<DesignerField[]>(buildApiUrl('/designer-fields'))
      ])
      collections.value = allCollections.filter(c => c.projectId === projectId.value)
      const collectionIds = new Set(collections.value.map(c => c.id))
      fields.value = allFields.filter(f => collectionIds.has(f.collectionId))
    }
    finally {
      loading.value = false
    }
  }

  // --- Collection CRUD ---

  async function createCollection(data: { name: string, description?: string }) {
    const result = await $fetch<DesignerCollection>(buildApiUrl('/designer-collections'), {
      method: 'POST',
      body: { ...data, projectId: projectId.value }
    })
    collections.value = [...collections.value, result]
    return result
  }

  async function updateCollection(id: string, updates: { name?: string, description?: string }) {
    const result = await $fetch<DesignerCollection>(buildApiUrl(`/designer-collections/${id}`), {
      method: 'PATCH',
      body: updates
    })
    collections.value = collections.value.map(c => c.id === id ? { ...c, ...result } : c)
    return result
  }

  async function deleteCollection(id: string) {
    await $fetch(buildApiUrl(`/designer-collections/${id}`), { method: 'DELETE' })
    collections.value = collections.value.filter(c => c.id !== id)
    // Also remove fields belonging to this collection
    fields.value = fields.value.filter(f => f.collectionId !== id)
  }

  // --- Field CRUD ---

  async function addField(data: { collectionId: string, name: string, type: string, meta?: Record<string, any>, refTarget?: string, sortOrder?: string }) {
    const result = await $fetch<DesignerField>(buildApiUrl('/designer-fields'), {
      method: 'POST',
      body: data
    })
    fields.value = [...fields.value, result]
    return result
  }

  async function updateField(id: string, updates: { name?: string, type?: string, meta?: Record<string, any>, refTarget?: string, sortOrder?: string }) {
    const result = await $fetch<DesignerField>(buildApiUrl(`/designer-fields/${id}`), {
      method: 'PATCH',
      body: updates
    })
    fields.value = fields.value.map(f => f.id === id ? { ...f, ...result } : f)
    return result
  }

  async function deleteField(id: string) {
    await $fetch(buildApiUrl(`/designer-fields/${id}`), { method: 'DELETE' })
    fields.value = fields.value.filter(f => f.id !== id)
  }

  async function reorderFields(collectionId: string, fieldIds: string[]) {
    const updates = fieldIds.map((id, index) =>
      updateField(id, { sortOrder: String(index) })
    )
    await Promise.all(updates)
    // Reorder local state
    const reordered = fieldIds.map(id => fields.value.find(f => f.id === id)).filter(Boolean) as DesignerField[]
    const otherFields = fields.value.filter(f => f.collectionId !== collectionId)
    fields.value = [...otherFields, ...reordered]
  }

  return {
    collections: readonly(collections),
    fields: readonly(fields),
    fieldsByCollection,
    collectionsWithFields,
    loading: readonly(loading),
    fetchAll,
    createCollection,
    updateCollection,
    deleteCollection,
    addField,
    updateField,
    deleteField,
    reorderFields,
    // Expose mutable refs for AI tool call integration
    _collections: collections,
    _fields: fields
  }
}
