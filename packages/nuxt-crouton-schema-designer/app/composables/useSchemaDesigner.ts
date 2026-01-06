import type {
  SchemaDesignerState,
  SchemaField,
  FieldType,
  CollectionOptions,
  CollectionSchema,
  MultiCollectionState
} from '../types/schema'
import { FIELD_TYPES } from './useFieldTypes'

// Default Card.vue template for list/grid/cards layouts
const DEFAULT_CARD_TEMPLATE = `<div v-if="layout === 'list'" class="flex items-center gap-3">
  <span class="font-medium">{{ item.name || item.title || 'Item' }}</span>
</div>

<UCard v-else-if="layout === 'grid'" class="h-full">
  <template #header>
    <h3 class="font-semibold truncate">{{ item.title || item.name }}</h3>
  </template>
  <p class="text-sm text-muted line-clamp-2">{{ item.description }}</p>
</UCard>

<UCard v-else class="h-full">
  <div class="space-y-2">
    <h3 class="text-lg font-semibold">{{ item.title || item.name }}</h3>
    <p class="text-muted">{{ item.description }}</p>
  </div>
</UCard>`

function createDefaultOptions(): CollectionOptions {
  return {
    hierarchy: false,
    sortable: false,
    translatable: false,
    seed: false,
    seedCount: 25
  }
}

function createDefaultCollection(name: string = ''): CollectionSchema {
  return {
    id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    collectionName: name,
    fields: [],
    options: createDefaultOptions(),
    cardTemplate: DEFAULT_CARD_TEMPLATE
  }
}

function createDefaultMultiState(): MultiCollectionState {
  const defaultCollection = createDefaultCollection()
  return {
    layerName: '',
    collections: [defaultCollection],
    activeCollectionId: defaultCollection.id
  }
}

/**
 * Backwards compatibility: Create legacy SchemaDesignerState from the active collection
 */
function createLegacyState(multiState: MultiCollectionState): SchemaDesignerState {
  const active = multiState.collections.find(c => c.id === multiState.activeCollectionId)
  return {
    collectionName: active?.collectionName || '',
    layerName: multiState.layerName,
    fields: active?.fields || [],
    options: active?.options || createDefaultOptions(),
    cardTemplate: active?.cardTemplate || DEFAULT_CARD_TEMPLATE
  }
}

export function useSchemaDesigner() {
  // Multi-collection state (internal)
  const multiState = useState<MultiCollectionState>('schema-designer-multi', createDefaultMultiState)
  const selectedFieldId = useState<string | null>('selected-field', () => null)

  // Active collection computed
  const activeCollection = computed(() => {
    return multiState.value.collections.find(c => c.id === multiState.value.activeCollectionId) || null
  })

  // Backwards-compatible state (computed from multi-state)
  // This allows existing components to work without changes
  const state = computed<SchemaDesignerState>({
    get: () => createLegacyState(multiState.value),
    set: (newState) => {
      // When setting state directly (legacy), update the active collection
      const activeIndex = multiState.value.collections.findIndex(
        c => c.id === multiState.value.activeCollectionId
      )
      if (activeIndex !== -1) {
        const existingCollection = multiState.value.collections[activeIndex]
        if (existingCollection) {
          multiState.value.collections[activeIndex] = {
            id: existingCollection.id,
            collectionName: newState.collectionName,
            fields: newState.fields,
            options: newState.options,
            cardTemplate: newState.cardTemplate
          }
        }
        multiState.value.layerName = newState.layerName
      }
    }
  })

  // ===================
  // Collection Management
  // ===================

  function addCollection(name: string = '') {
    const newCollection = createDefaultCollection(name)
    multiState.value.collections.push(newCollection)
    multiState.value.activeCollectionId = newCollection.id
    selectedFieldId.value = null
    return newCollection.id
  }

  function removeCollection(id: string) {
    const index = multiState.value.collections.findIndex(c => c.id === id)
    if (index === -1) return false

    // Don't remove the last collection
    if (multiState.value.collections.length <= 1) return false

    multiState.value.collections.splice(index, 1)

    // If we removed the active collection, select another one
    if (multiState.value.activeCollectionId === id) {
      const newActive = multiState.value.collections[Math.max(0, index - 1)]
      multiState.value.activeCollectionId = newActive?.id || null
    }

    selectedFieldId.value = null
    return true
  }

  function setActiveCollection(id: string) {
    const collection = multiState.value.collections.find(c => c.id === id)
    if (collection) {
      multiState.value.activeCollectionId = id
      selectedFieldId.value = null
    }
  }

  function duplicateCollection(id: string, newName?: string) {
    const source = multiState.value.collections.find(c => c.id === id)
    if (!source) return null

    const duplicate: CollectionSchema = {
      id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      collectionName: newName || `${source.collectionName}_copy`,
      fields: source.fields.map(f => ({
        ...f,
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      })),
      options: { ...source.options },
      cardTemplate: source.cardTemplate
    }

    multiState.value.collections.push(duplicate)
    multiState.value.activeCollectionId = duplicate.id
    selectedFieldId.value = null
    return duplicate.id
  }

  function renameCollection(id: string, newName: string) {
    const collection = multiState.value.collections.find(c => c.id === id)
    if (collection) {
      collection.collectionName = newName
      return true
    }
    return false
  }

  // ===================
  // Legacy API (operates on active collection)
  // ===================

  function setCollectionName(name: string) {
    if (activeCollection.value) {
      activeCollection.value.collectionName = name
    }
  }

  function setLayerName(name: string) {
    multiState.value.layerName = name
  }

  function setOptions(options: Partial<CollectionOptions>) {
    if (activeCollection.value) {
      activeCollection.value.options = { ...activeCollection.value.options, ...options }
    }
  }

  function setCardTemplate(template: string) {
    if (activeCollection.value) {
      activeCollection.value.cardTemplate = template
    }
  }

  // Field CRUD (operates on active collection)
  function addField(type: FieldType, insertAt?: number) {
    if (!activeCollection.value) return null

    const fieldTypeConfig = FIELD_TYPES.find(ft => ft.type === type)
    const id = `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const newField: SchemaField = {
      id,
      name: '',
      type,
      meta: { ...fieldTypeConfig?.defaultMeta }
    }

    if (insertAt !== undefined && insertAt >= 0 && insertAt <= activeCollection.value.fields.length) {
      activeCollection.value.fields.splice(insertAt, 0, newField)
    } else {
      activeCollection.value.fields.push(newField)
    }

    // Select the new field for editing
    selectedFieldId.value = id

    return id
  }

  function updateField(id: string, updates: Partial<Omit<SchemaField, 'id'>>) {
    if (!activeCollection.value) return

    const index = activeCollection.value.fields.findIndex(f => f.id === id)
    if (index === -1) return

    const currentField = activeCollection.value.fields[index]
    if (!currentField) return

    activeCollection.value.fields[index] = {
      ...currentField,
      name: updates.name !== undefined ? updates.name : currentField.name,
      type: updates.type !== undefined ? updates.type : currentField.type,
      meta: {
        ...currentField.meta,
        ...(updates.meta || {})
      },
      refTarget: updates.refTarget !== undefined ? updates.refTarget : currentField.refTarget
    }
  }

  function removeField(id: string) {
    if (!activeCollection.value) return

    activeCollection.value.fields = activeCollection.value.fields.filter(f => f.id !== id)
    if (selectedFieldId.value === id) {
      selectedFieldId.value = null
    }
  }

  function moveField(fromIndex: number, toIndex: number) {
    if (!activeCollection.value) return

    const fields = [...activeCollection.value.fields]
    const [removed] = fields.splice(fromIndex, 1)
    if (removed) {
      fields.splice(toIndex, 0, removed)
      activeCollection.value.fields = fields
    }
  }

  // Selection
  function selectField(id: string | null) {
    selectedFieldId.value = id
  }

  const selectedField = computed(() => {
    if (!selectedFieldId.value || !activeCollection.value) return null
    return activeCollection.value.fields.find(f => f.id === selectedFieldId.value) || null
  })

  // ===================
  // Validation
  // ===================

  const validationErrors = computed(() => {
    const errors: string[] = []

    if (!multiState.value.layerName) {
      errors.push('Layer name is required')
    }

    if (multiState.value.collections.length === 0) {
      errors.push('At least one collection is required')
    }

    // Validate each collection
    const collectionNames = multiState.value.collections.map(c => c.collectionName).filter(Boolean)
    const duplicateCollections = collectionNames.filter((name, i) => collectionNames.indexOf(name) !== i)
    if (duplicateCollections.length > 0) {
      errors.push(`Duplicate collection names: ${[...new Set(duplicateCollections)].join(', ')}`)
    }

    for (const collection of multiState.value.collections) {
      if (!collection.collectionName) {
        errors.push('Collection name is required')
      }

      if (collection.fields.length === 0) {
        errors.push(`Collection "${collection.collectionName || 'unnamed'}" has no fields`)
      }

      const fieldNames = collection.fields.map(f => f.name).filter(Boolean)
      const duplicates = fieldNames.filter((name, i) => fieldNames.indexOf(name) !== i)
      if (duplicates.length > 0) {
        errors.push(`Duplicate field names in "${collection.collectionName}": ${[...new Set(duplicates)].join(', ')}`)
      }

      for (const field of collection.fields) {
        if (!field.name) {
          errors.push(`Field in "${collection.collectionName}" has no name`)
        }
      }
    }

    return errors
  })

  const isValid = computed(() => validationErrors.value.length === 0)

  // ===================
  // Reset & Load
  // ===================

  function reset() {
    multiState.value = createDefaultMultiState()
    selectedFieldId.value = null
  }

  /**
   * Load state from external source (backwards compatible)
   * Handles both single-collection (legacy) and multi-collection formats
   */
  function loadState(newState: Partial<SchemaDesignerState>) {
    const defaultOptions = createDefaultOptions()

    // Create a single collection from the legacy state
    const collection: CollectionSchema = {
      id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      collectionName: newState.collectionName || '',
      fields: newState.fields || [],
      options: {
        ...defaultOptions,
        ...newState.options
      },
      cardTemplate: newState.cardTemplate || DEFAULT_CARD_TEMPLATE
    }

    multiState.value = {
      layerName: newState.layerName || '',
      collections: [collection],
      activeCollectionId: collection.id
    }

    selectedFieldId.value = null
  }

  /**
   * Load multi-collection state (new format)
   */
  function loadMultiState(layerName: string, collections: CollectionSchema[]) {
    if (!collections || collections.length === 0) {
      // If no collections, create a default one
      const defaultCollection = createDefaultCollection()
      multiState.value = {
        layerName: layerName || '',
        collections: [defaultCollection],
        activeCollectionId: defaultCollection.id
      }
    } else {
      multiState.value = {
        layerName: layerName || '',
        collections: collections.map(c => ({
          ...c,
          // Ensure each collection has an ID
          id: c.id || `collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          options: { ...createDefaultOptions(), ...c.options },
          cardTemplate: c.cardTemplate || DEFAULT_CARD_TEMPLATE
        })),
        activeCollectionId: collections[0]?.id || null
      }
    }
    selectedFieldId.value = null
  }

  // Persistence
  function saveToLocalStorage() {
    if (import.meta.client) {
      localStorage.setItem('schema-designer-multi-state', JSON.stringify(multiState.value))
    }
  }

  function loadFromLocalStorage() {
    if (import.meta.client) {
      const saved = localStorage.getItem('schema-designer-multi-state')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Validate structure
          if (parsed.collections && Array.isArray(parsed.collections)) {
            multiState.value = parsed
          }
        } catch (e) {
          console.error('Failed to load schema designer state:', e)
        }
      }
    }
  }

  // Auto-save on changes
  watch(multiState, saveToLocalStorage, { deep: true })

  // Get all collection names (useful for reference field dropdowns)
  const collectionNames = computed(() =>
    multiState.value.collections.map(c => c.collectionName).filter(Boolean)
  )

  return {
    // Multi-collection state
    multiState,
    collections: computed(() => multiState.value.collections),
    activeCollectionId: computed(() => multiState.value.activeCollectionId),
    activeCollection,
    collectionNames,

    // Collection management
    addCollection,
    removeCollection,
    setActiveCollection,
    duplicateCollection,
    renameCollection,

    // Legacy/backwards-compatible state (operates on active collection)
    state,
    selectedFieldId,
    selectedField,
    validationErrors,
    isValid,

    // Legacy setters (operate on active collection)
    setCollectionName,
    setLayerName,
    setOptions,
    setCardTemplate,

    // Field operations (operate on active collection)
    addField,
    updateField,
    removeField,
    moveField,
    selectField,

    // Reset & Load
    reset,
    loadState,
    loadMultiState,
    loadFromLocalStorage
  }
}
