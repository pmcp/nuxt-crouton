import type { SchemaDesignerState, SchemaField, FieldType, FieldMeta, CollectionOptions } from '../types/schema'
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

function createDefaultState(): SchemaDesignerState {
  return {
    collectionName: '',
    layerName: '',
    fields: [],
    options: {
      hierarchy: false,
      sortable: false,
      translatable: false,
      seed: false,
      seedCount: 25
    },
    cardTemplate: DEFAULT_CARD_TEMPLATE
  }
}

export function useSchemaDesigner() {
  const state = useState<SchemaDesignerState>('schema-designer', createDefaultState)
  const selectedFieldId = useState<string | null>('selected-field', () => null)

  // Collection settings
  function setCollectionName(name: string) {
    state.value.collectionName = name
  }

  function setLayerName(name: string) {
    state.value.layerName = name
  }

  function setOptions(options: Partial<CollectionOptions>) {
    state.value.options = { ...state.value.options, ...options }
  }

  function setCardTemplate(template: string) {
    state.value.cardTemplate = template
  }

  // Field CRUD
  function addField(type: FieldType, insertAt?: number) {
    const fieldTypeConfig = FIELD_TYPES.find(ft => ft.type === type)
    const id = `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const newField: SchemaField = {
      id,
      name: '',
      type,
      meta: { ...fieldTypeConfig?.defaultMeta }
    }

    if (insertAt !== undefined && insertAt >= 0 && insertAt <= state.value.fields.length) {
      state.value.fields.splice(insertAt, 0, newField)
    } else {
      state.value.fields.push(newField)
    }

    // Select the new field for editing
    selectedFieldId.value = id

    return id
  }

  function updateField(id: string, updates: Partial<Omit<SchemaField, 'id'>>) {
    const index = state.value.fields.findIndex(f => f.id === id)
    if (index === -1) return

    const currentField = state.value.fields[index]
    if (!currentField) return

    state.value.fields[index] = {
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
    state.value.fields = state.value.fields.filter(f => f.id !== id)
    if (selectedFieldId.value === id) {
      selectedFieldId.value = null
    }
  }

  function moveField(fromIndex: number, toIndex: number) {
    const fields = [...state.value.fields]
    const [removed] = fields.splice(fromIndex, 1)
    if (removed) {
      fields.splice(toIndex, 0, removed)
      state.value.fields = fields
    }
  }

  // Selection
  function selectField(id: string | null) {
    selectedFieldId.value = id
  }

  const selectedField = computed(() => {
    if (!selectedFieldId.value) return null
    return state.value.fields.find(f => f.id === selectedFieldId.value) || null
  })

  // Validation
  const validationErrors = computed(() => {
    const errors: string[] = []

    if (!state.value.collectionName) {
      errors.push('Collection name is required')
    }

    if (!state.value.layerName) {
      errors.push('Layer name is required')
    }

    if (state.value.fields.length === 0) {
      errors.push('At least one field is required')
    }

    const fieldNames = state.value.fields.map(f => f.name).filter(Boolean)
    const duplicates = fieldNames.filter((name, i) => fieldNames.indexOf(name) !== i)
    if (duplicates.length > 0) {
      errors.push(`Duplicate field names: ${[...new Set(duplicates)].join(', ')}`)
    }

    for (const field of state.value.fields) {
      if (!field.name) {
        errors.push(`Field has no name`)
      }
    }

    return errors
  })

  const isValid = computed(() => validationErrors.value.length === 0)

  // Reset
  function reset() {
    state.value = createDefaultState()
    selectedFieldId.value = null
  }

  // Load state from external source (e.g., project)
  function loadState(newState: Partial<SchemaDesignerState>) {
    state.value = {
      collectionName: newState.collectionName || '',
      layerName: newState.layerName || '',
      fields: newState.fields || [],
      options: {
        ...createDefaultState().options,
        ...newState.options
      },
      cardTemplate: newState.cardTemplate || DEFAULT_CARD_TEMPLATE
    }
    selectedFieldId.value = null
  }

  // Persistence
  function saveToLocalStorage() {
    if (import.meta.client) {
      localStorage.setItem('schema-designer-state', JSON.stringify(state.value))
    }
  }

  function loadFromLocalStorage() {
    if (import.meta.client) {
      const saved = localStorage.getItem('schema-designer-state')
      if (saved) {
        try {
          state.value = JSON.parse(saved)
        } catch (e) {
          console.error('Failed to load schema designer state:', e)
        }
      }
    }
  }

  // Auto-save on changes
  watch(state, saveToLocalStorage, { deep: true })

  return {
    state,
    selectedFieldId,
    selectedField,
    validationErrors,
    isValid,
    setCollectionName,
    setLayerName,
    setOptions,
    setCardTemplate,
    addField,
    updateField,
    removeField,
    moveField,
    selectField,
    reset,
    loadState,
    loadFromLocalStorage
  }
}