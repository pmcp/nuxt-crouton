// Generator for Form.vue component
import { toCase } from '../utils/helpers.mjs'
import { referencesAssets, getAssetComponent } from '../utils/asset-detector.mjs'
import { detectAddressFields, getCoordinateFieldName } from '../utils/address-detector.mjs'

// Helper: Group fields by their group meta value
function groupFieldsByGroup(fields) {
  const grouped = new Map()
  fields.forEach(field => {
    const group = field.meta?.group || null
    if (!grouped.has(group)) {
      grouped.set(group, [])
    }
    grouped.get(group).push(field)
  })
  return grouped
}

// Helper: Convert 'seoSettings' to 'SEO Settings'
function humanizeGroupName(groupName) {
  if (!groupName) return 'General'
  return groupName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

export function generateFormComponent(data, config = {}) {
  const { pascalCase, pascalCasePlural, layerPascalCase, fields, singular, plural, layer } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  
  // Check for translations
  const translatableFieldNames = config?.translations?.collections?.[plural] || []
  const hasTranslations = translatableFieldNames.length > 0
  
  // Separate fields
  const translatableFields = fields.filter(f => translatableFieldNames.includes(f.name))
  const regularFields = fields.filter(f => f.name !== 'id' && !translatableFieldNames.includes(f.name))

  // Check if we have any date fields
  const hasDateFields = regularFields.some(field => field.type === 'date')

  // Detect address fields for map/geocoding functionality (only if useMaps flag is enabled)
  const useMaps = config?.flags?.useMaps === true
  const addressDetection = useMaps ? detectAddressFields(regularFields) : { hasAddress: false, addressFields: [], coordinateFields: [], hasCoordinates: false }
  const { hasAddress, addressFields, coordinateFields, hasCoordinates } = addressDetection
  const coordinateFieldName = hasAddress && hasCoordinates ? getCoordinateFieldName(coordinateFields) : null
  const shouldGenerateMap = useMaps && hasAddress && coordinateFieldName

  // Generate form fields for regular (non-translatable) fields only
  // Filter out coordinate fields if using maps (they'll be managed by the map component)
  const fieldsToDisplay = shouldGenerateMap
    ? regularFields.filter(field => field.name !== coordinateFieldName)
    : regularFields

  // Find the index of the last address field for proper map placement
  const lastAddressFieldIndex = shouldGenerateMap
    ? Math.max(...addressFields.map(af => fieldsToDisplay.findIndex(f => f.name === af.name)))
    : -1

  // Helper to resolve component names (handles editor component aliasing)
  const resolveComponentName = (componentName) => {
    // Transform EditorSimple to CroutonEditorSimple to match actual registration
    if (componentName === 'EditorSimple') {
      return 'CroutonEditorSimple'
    }
    return componentName
  }

  const generateFieldMarkup = (field) => {
    const fieldName = field.name.charAt(0).toUpperCase() + field.name.slice(1)

    // Check if a custom component is specified in meta
    if (field.meta?.component) {
      const componentName = resolveComponentName(field.meta.component)
      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <${componentName} v-model="state.${field.name}" />
        </UFormField>`
    }

    // Check if this is a dependent button group field
    if (field.meta?.displayAs === 'slotButtonGroup' && field.meta?.dependsOn && field.meta?.dependsOnField && field.meta?.dependsOnCollection) {
      const dependsOn = field.meta.dependsOn
      const dependsOnField = field.meta.dependsOnField
      const dependsOnCollection = field.meta.dependsOnCollection

      // Resolve the collection name with layer prefix
      const refCases = toCase(dependsOnCollection)
      const resolvedCollection = `${layerPascalCase.toLowerCase()}${refCases.pascalCasePlural}`

      // Determine dependent label (capitalize first letter)
      const dependentLabel = dependsOn.charAt(0).toUpperCase() + dependsOn.slice(1)

      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <CroutonFormDependentButtonGroup
            v-model="state.${field.name}"
            :dependent-value="state.${dependsOn}"
            dependent-collection="${resolvedCollection}"
            dependent-field="${dependsOnField}"
            dependent-label="${dependentLabel}"
          />
        </UFormField>`
    }

    // Check if this is a reference field (has refTarget)
    if (field.refTarget) {
      let resolvedCollection

      // Check refScope to determine how to resolve the reference
      if (field.refScope === 'adapter') {
        // Adapter-scoped reference: use target as-is (no layer prefix)
        // These are managed by connector packages (e.g., @friendlyinternet/nuxt-crouton-connector-supersaas)
        resolvedCollection = field.refTarget
      } else {
        // Local layer reference: add layer prefix
        const refCases = toCase(field.refTarget)
        resolvedCollection = `${layerPascalCase.toLowerCase()}${refCases.pascalCasePlural}`
      }

      // Auto-detect if this references an asset collection
      // If no custom component is specified and it references assets, use AssetsPicker
      const isAssetReference = referencesAssets(field, field.refTarget)
      const shouldUseAssetPicker = isAssetReference && !field.meta?.component

      // Check if this is a read-only reference field
      if (field.meta?.readOnly) {
        return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <CroutonItemCardMini
            v-if="state.${field.name}"
            :id="state.${field.name}"
            collection="${resolvedCollection}"
          />
          <span v-else class="text-gray-400 text-sm">Not set</span>
        </UFormField>`
      }

      // Use asset picker if this references an asset collection
      if (shouldUseAssetPicker) {
        const assetComponent = getAssetComponent()
        return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <${assetComponent}
            v-model="state.${field.name}"
            collection="${resolvedCollection}"
          />
        </UFormField>`
      }

      // Check if this is an array type (multi-select reference)
      if (field.type === 'array') {
        return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <CroutonFormReferenceSelect
            v-model="state.${field.name}"
            collection="${resolvedCollection}"
            label="${fieldName}"
            multiple
          />
        </UFormField>`
      }

      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <CroutonFormReferenceSelect
            v-model="state.${field.name}"
            collection="${resolvedCollection}"
            label="${fieldName}"
          />
        </UFormField>`
    }

    // Default component selection based on field type
    if (field.type === 'text') {
      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <UTextarea v-model="state.${field.name}" class="w-full" size="xl" />
        </UFormField>`
    } else if (field.type === 'boolean') {
      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <UCheckbox v-model="state.${field.name}" />
        </UFormField>`
    } else if (field.type === 'number' || field.type === 'decimal') {
      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <UInputNumber v-model="state.${field.name}" class="w-full" />
        </UFormField>`
    } else if (field.type === 'date') {
      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <CroutonCalendar v-model:date="state.${field.name}" />
        </UFormField>`
    } else if (field.type === 'repeater') {
      // Prefix repeater component with layer and collection to avoid conflicts
      const baseComponentName = field.meta?.repeaterComponent || 'RepeaterItem'
      const componentName = `${layerPascalCase}${pascalCasePlural}${baseComponentName}`
      const addLabel = field.meta?.addLabel || 'Add Item'
      const sortable = field.meta?.sortable !== false // Default to true

      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <CroutonFormRepeater
            v-model="state.${field.name}"
            component-name="${componentName}"
            add-label="${addLabel}"
            ${sortable ? ':sortable="true"' : ':sortable="false"'}
          />
        </UFormField>`
    } else {
      return `        <UFormField label="${fieldName}" name="${field.name}" class="not-last:pb-4">
          <UInput v-model="state.${field.name}" class="w-full" size="xl" />
        </UFormField>`
    }
  }

  // Generate map/geocoding section if address fields detected (define early so it can be used in formFields)
  const mapSection = shouldGenerateMap ? `

      <!-- Map Display (auto-updates with address changes) -->
      <UFormField label="Location on Map">
        <CroutonMapsMap
          :center="mapCenter"
          :zoom="mapCenter[0] === 0 && mapCenter[1] === 0 ? 2 : 14"
          height="300px"
          class="rounded-lg border"
        >
          <template #default="{ map }">
            <CroutonMapsMarker
              v-if="mapCenter[0] !== 0 || mapCenter[1] !== 0"
              :map="map"
              :position="mapCenter"
              color="red"
            />
          </template>
        </CroutonMapsMap>
      </UFormField>` : ''

  // Group fields by area and then by group
  const mainFields = fieldsToDisplay.filter(f => !f.meta?.area || f.meta.area === 'main')
  const sidebarFields = fieldsToDisplay.filter(f => f.meta?.area === 'sidebar')

  const mainGroups = groupFieldsByGroup(mainFields)
  const sidebarGroups = groupFieldsByGroup(sidebarFields)

  // Determine if we should use tabs (multiple main groups)
  const useTabs = mainGroups.size > 1
  const hasSidebar = sidebarGroups.size > 0

  // Generate navigation items from main groups
  const navigationItems = useTabs ? Array.from(mainGroups.keys()).map(groupName => ({
    label: humanizeGroupName(groupName),
    value: groupName || 'general'
  })) : []

  // Helper to generate a group section with flex layout
  const generateGroupSection = (groupName, groupFields, showConditionally = false) => {
    const title = humanizeGroupName(groupName)
    const groupValue = groupName || 'general'
    const fieldsMarkup = groupFields.map(generateFieldMarkup).join('\n')

    const conditionalWrapper = showConditionally
      ? `      <div v-show="!tabs || activeSection === '${groupValue}'" class="flex flex-col gap-4 p-1">\n`
      : `      <div class="flex flex-col gap-4 p-1">\n`

    return `${conditionalWrapper}${fieldsMarkup}
      </div>`
  }

  // Generate main area groups
  const mainAreaMarkup = Array.from(mainGroups.entries())
    .map(([groupName, groupFields]) => generateGroupSection(groupName, groupFields, useTabs))
    .join('\n\n')

  // Generate sidebar area groups
  const sidebarAreaMarkup = hasSidebar
    ? Array.from(sidebarGroups.entries())
        .map(([groupName, groupFields]) => generateGroupSection(groupName, groupFields, false))
        .join('\n\n')
    : ''

  // Build fieldComponents map for translatable fields with custom components
  const fieldComponentsMap = {}
  translatableFields.forEach(field => {
    if (field.meta?.component) {
      fieldComponentsMap[field.name] = resolveComponentName(field.meta.component)
    }
  })
  const hasFieldComponents = Object.keys(fieldComponentsMap).length > 0

  // Add CroutonI18nInput if there are translatable fields
  const translationField = hasTranslations ? `

      <CroutonI18nInput
        v-model="state.translations"
        :fields="[${translatableFieldNames.map(f => `'${f}'`).join(', ')}]"
        :default-values="{
          ${translatableFields.map(f => `${f.name}: state.${f.name}`).join(',\n          ')}
        }"${hasFieldComponents ? `
        :field-components="{
          ${Object.entries(fieldComponentsMap).map(([field, component]) => `${field}: '${component}'`).join(',\n          ')}
        }"` : ''}
        label="Translations"
      />` : ''

  // Generate initial state fields with proper defaults (excluding id)
  const stateFields = fields.filter(field => field.name !== 'id').map(field => {
    const defaultVal = field.type === 'boolean' ? 'false' :
                      field.type === 'number' || field.type === 'decimal' ? '0' :
                      field.type === 'date' ? 'null' :
                      field.type === 'repeater' ? '[]' :
                      field.type === 'array' ? '[]' : "''";
    return `  ${field.name}: ${defaultVal}`
  }).join(',\n')
  
  // Add translations to state if needed
  const translationsState = hasTranslations ? ',\n  translations: {}' : ''

  const typesPath = '../../types'

  // Generate navigation items array for the template
  const navigationItemsCode = useTabs
    ? `const navigationItems = [
  ${navigationItems.map(item => `{ label: '${item.label}', value: '${item.value}' }`).join(',\n  ')}
]

const tabs = ref(true)
const activeSection = ref('${navigationItems[0]?.value || 'general'}')`
    : 'const tabs = ref(false)'

  return `<template>
  <CroutonFormActionButton
    v-if="action === 'delete'"
    :action="action"
    :collection="collection"
    :items="items"
    :loading="loading"
    @click="handleSubmit"
  />

  <UForm
    v-else
    :schema="schema"
    :state="state"
    @submit="handleSubmit"
  >
    <CroutonFormLayout${useTabs ? ' :tabs="tabs" :navigation-items="navigationItems"' : ''}>
      <template #main${useTabs ? '="{ activeSection }"' : ''}>
${mainAreaMarkup}${translationField ? `\n\n      <div>\n${translationField}\n      </div>` : ''}
      </template>
${hasSidebar ? `
      <template #sidebar>
${sidebarAreaMarkup}
      </template>
` : ''}
      <template #footer>
        <CroutonFormActionButton
          :action="action"
          :collection="collection"
          :items="items"
          :loading="loading"
        />
      </template>
    </CroutonFormLayout>
  </UForm>
</template>

<script setup lang="ts">
import type { ${prefixedPascalCase}FormProps, ${prefixedPascalCase}FormData } from '${typesPath}'

const props = defineProps<${prefixedPascalCase}FormProps>()
const { defaultValue, schema, collection } = use${prefixedPascalCasePlural}()

// Form layout configuration
${navigationItemsCode}

// Use new mutation composable for data operations
const { create, update, deleteItems } = useCollectionMutation(collection)

// useCrouton still manages modal state
const { close } = useCrouton()

// Initialize form state with proper values (no watch needed!)
const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }${hasDateFields ? `

// Convert date strings to Date objects for date fields during editing
if (props.action === 'update' && props.activeItem?.id) {${regularFields
  .filter(f => f.type === 'date')
  .map(field => `
  if (initialValues.${field.name}) {
    initialValues.${field.name} = new Date(initialValues.${field.name})
  }`).join('')}
}` : ''}

const state = ref<${prefixedPascalCase}FormData & { id?: string | null }>(initialValues)${shouldGenerateMap ? `

// Map & Geocoding functionality
const { geocode, loading: geocoding } = useGeocode()

// Parse existing coordinates from location field (handle both array and string formats)
const parseCoordinates = (value: any): [number, number] | null => {
  if (!value) return null
  if (Array.isArray(value) && value.length === 2) {
    return [Number(value[0]), Number(value[1])]
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length === 2) {
        return [Number(parsed[0]), Number(parsed[1])]
      }
    } catch {
      return null
    }
  }
  return null
}

const initialCoordinates = parseCoordinates(state.value.${coordinateFieldName})
const mapCenter = ref<[number, number]>(initialCoordinates || [0, 0])

// Auto-geocode when address fields change
watchDebounced(
  () => [${addressFields.map(f => `state.value.${f.name}`).join(', ')}],
  async () => {
    if (canGeocode.value) {
      await handleGeocode()
    }
  },
  { debounce: 1000, maxWait: 3000 }
)

// Check if we have enough address data to geocode
const canGeocode = computed(() => {
  return ${addressFields.map(f => `!!state.value.${f.name}`).slice(0, 2).join(' || ')}
})

// Handle geocoding of address fields
const handleGeocode = async () => {
  try {
    // Build address query from all address fields
    const addressParts: string[] = []
    ${addressFields.map(f => `if (state.value.${f.name}) addressParts.push(state.value.${f.name} as string)`).join('\n    ')}

    const addressQuery = addressParts.join(', ')
    if (!addressQuery.trim()) return

    const result = await geocode(addressQuery)
    if (result) {
      mapCenter.value = result.coordinates

      // Update the coordinate field in the form state (store as JSON string)
      state.value.${coordinateFieldName} = JSON.stringify(result.coordinates)
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
  }
}` : ''}

const handleSubmit = async () => {
  try {${hasDateFields ? `
    // Serialize Date objects to ISO strings for API submission
    const serializedData = { ...state.value }${regularFields
  .filter(f => f.type === 'date')
  .map(field => `
    if (serializedData.${field.name} instanceof Date) {
      serializedData.${field.name} = serializedData.${field.name}.toISOString()
    }`).join('')}
` : ''}
    if (props.action === 'create') {
      await create(${hasDateFields ? 'serializedData' : 'state.value'})
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, ${hasDateFields ? 'serializedData' : 'state.value'})
    } else if (props.action === 'delete') {
      await deleteItems(props.items)
    }

    close()

  } catch (error) {
    console.error('Form submission failed:', error)
    // You can add toast notification here if available
    // toast.add({ title: 'Error', description: 'Failed to submit form', color: 'red' })
  }
}
</script>`
}
