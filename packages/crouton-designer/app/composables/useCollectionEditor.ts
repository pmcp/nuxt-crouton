import type { DesignerCollection, DesignerField, DisplayConfig, PackageExtensionPoint } from '../types/schema'

// --- Extension collection naming convention ---
// Extension fields for package collections are stored as real DB collections
// with names matching this prefix pattern: __ext:{packageAlias}:{collectionName}

export const EXT_COL_PREFIX = '__ext:'

export function isExtensionCollectionName(name: string): boolean {
  return name.startsWith(EXT_COL_PREFIX)
}

export function makeExtensionCollectionName(packageAlias: string, targetCollection: string): string {
  return `${EXT_COL_PREFIX}${packageAlias}:${targetCollection}`
}

// --- Types ---

export interface CollectionWithFields extends DesignerCollection {
  fields: DesignerField[]
}

/** A package-provided collection (virtual — not stored in DB as a user collection) */
export interface PackageCollectionEntry {
  /** Synthetic ID, e.g. 'pkg:bookings:booking' */
  id: string
  /** Collection name from the package manifest */
  name: string
  description?: string
  /** Package alias, e.g. 'bookings' */
  packageAlias: string
  /** Layer name for this collection (from package manifest layer.name, fallback to alias) */
  layerName: string
  /** Fields from the package manifest (read-only, not editable by users) */
  manifestSchema: Record<string, any> | undefined
  /** Extension points defined by the package for this collection */
  extensionPoints: PackageExtensionPoint[]
  /** User-added extension fields stored in the DB */
  extensionFields: DesignerField[]
  /** Real DB collection ID that holds extension fields (undefined if none added yet) */
  extensionCollectionId: string | undefined
}

interface ModuleAIContext {
  collections?: Array<{ name: string; description: string; schema?: Record<string, any> }>
}

interface ModuleEntry {
  alias: string
  description: string
  extensionPoints?: PackageExtensionPoint[]
  layer?: { name: string }
  ai?: ModuleAIContext
}

export function useCollectionEditor(projectId: Ref<string>, packages?: Ref<string[]>) {
  const { buildApiUrl } = useTeamContext()
  const appConfig = useAppConfig()
  const allModules = ((appConfig.crouton as any)?.modules ?? []) as ModuleEntry[]

  const collections = ref<DesignerCollection[]>([])
  const fields = ref<DesignerField[]>([])
  const loading = ref(false)

  // Fields grouped by collection ID
  const fieldsByCollection = computed(() => {
    const map = new Map<string, DesignerField[]>()
    for (const field of fields.value) {
      const existing = map.get(field.collectionId) || []
      existing.push(field)
      map.set(field.collectionId, existing)
    }
    return map
  })

  // Extension collections (DB rows used to store user-added package extension fields)
  const extensionCollectionsFromDB = computed(() =>
    collections.value.filter(c => isExtensionCollectionName(c.name))
  )

  // User collections (normal, editable — excludes extension containers)
  const userCollections = computed(() =>
    collections.value.filter(c => !isExtensionCollectionName(c.name))
  )

  // User collections enriched with their fields (used by AI prompt, seed data, validation)
  const collectionsWithFields = computed<CollectionWithFields[]>(() =>
    userCollections.value.map(col => ({
      ...col,
      fields: fieldsByCollection.value.get(col.id) || []
    }))
  )

  // Package virtual collections — derived from manifest + selected packages
  const packageCollections = computed<PackageCollectionEntry[]>(() => {
    const selectedAliases = packages?.value ?? []
    if (!selectedAliases.length) return []

    const entries: PackageCollectionEntry[] = []

    for (const alias of selectedAliases) {
      const mod = allModules.find(m => m.alias === alias)
      if (!mod?.ai?.collections?.length) continue

      for (const col of mod.ai.collections) {
        const extColName = makeExtensionCollectionName(alias, col.name)
        const extDBCol = extensionCollectionsFromDB.value.find(c => c.name === extColName)

        entries.push({
          id: `pkg:${alias}:${col.name}`,
          name: col.name,
          description: col.description,
          packageAlias: alias,
          layerName: mod.layer?.name ?? alias,
          manifestSchema: col.schema as Record<string, any> | undefined,
          extensionPoints: (mod.extensionPoints ?? []).filter(ep => ep.collection === col.name),
          extensionFields: extDBCol ? (fieldsByCollection.value.get(extDBCol.id) ?? []) : [],
          extensionCollectionId: extDBCol?.id,
        })
      }
    }

    return entries
  })

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

  async function createCollection(data: { name: string, description?: string, display?: DisplayConfig, publishable?: boolean }) {
    const result = await $fetch<DesignerCollection>(buildApiUrl('/designer-collections'), {
      method: 'POST',
      body: { ...data, projectId: projectId.value }
    })
    collections.value = [...collections.value, result]
    return result
  }

  async function updateCollection(id: string, updates: { name?: string, description?: string, display?: DisplayConfig, publishable?: boolean }) {
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
    const reordered = fieldIds.map(id => fields.value.find(f => f.id === id)).filter(Boolean) as DesignerField[]
    const otherFields = fields.value.filter(f => f.collectionId !== collectionId)
    fields.value = [...otherFields, ...reordered]
  }

  // --- Extension field helpers ---

  /** Ensure a DB collection container exists for package extension fields. Returns the collection ID. */
  async function ensureExtensionCollection(packageAlias: string, targetCollection: string): Promise<string> {
    const extColName = makeExtensionCollectionName(packageAlias, targetCollection)
    const existing = collections.value.find(c => c.name === extColName)
    if (existing) return existing.id

    const result = await $fetch<DesignerCollection>(buildApiUrl('/designer-collections'), {
      method: 'POST',
      body: { name: extColName, projectId: projectId.value }
    })
    collections.value = [...collections.value, result]
    return result.id
  }

  /** Add a field to a package collection's extension point. */
  async function addExtensionField(
    packageAlias: string,
    targetCollection: string,
    data: { name: string; type: string; meta?: Record<string, any> }
  ) {
    const collectionId = await ensureExtensionCollection(packageAlias, targetCollection)
    const existingCount = fieldsByCollection.value.get(collectionId)?.length ?? 0
    return addField({
      collectionId,
      name: data.name,
      type: data.type,
      meta: data.meta,
      sortOrder: String(existingCount),
    })
  }

  return {
    collections: readonly(collections),
    fields: readonly(fields),
    fieldsByCollection,
    collectionsWithFields,
    packageCollections,
    loading: readonly(loading),
    fetchAll,
    createCollection,
    updateCollection,
    deleteCollection,
    addField,
    updateField,
    deleteField,
    reorderFields,
    addExtensionField,
  }
}