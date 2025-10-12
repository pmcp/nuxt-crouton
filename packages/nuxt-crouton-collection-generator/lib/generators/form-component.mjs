// Generator for Form.vue component
import { toCase } from '../utils/helpers.mjs'
import { referencesAssets, getAssetComponent } from '../utils/asset-detector.mjs'

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

  // Generate form fields for regular (non-translatable) fields only
  const formFields = regularFields.map(field => {
    const fieldName = field.name.charAt(0).toUpperCase() + field.name.slice(1)

    // Check if a custom component is specified in meta
    if (field.meta?.component) {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <${field.meta.component} v-model="state.${field.name}" />
      </UFormField>`
    }

    // Check if this is a reference field (has refTarget)
    if (field.refTarget) {
      let resolvedCollection

      // Check if refTarget starts with : (colon) - indicates external/global collection
      if (field.refTarget.startsWith(':')) {
        // Use as-is without layer prefix, removing the : prefix
        resolvedCollection = field.refTarget.substring(1)
      } else {
        // Normal behavior: add layer prefix
        const refCases = toCase(field.refTarget)
        resolvedCollection = `${layerPascalCase.toLowerCase()}${refCases.pascalCasePlural}`
      }

      // Auto-detect if this references an asset collection
      // If no custom component is specified and it references assets, use AssetsPicker
      const isAssetReference = referencesAssets(field, field.refTarget)
      const shouldUseAssetPicker = isAssetReference && !field.meta?.component

      // Check if this is a read-only reference field
      if (field.meta?.readOnly) {
        return `      <UFormField label="${fieldName}" name="${field.name}">
        <CroutonCardMini
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
        return `      <UFormField label="${fieldName}" name="${field.name}">
        <${assetComponent}
          v-model="state.${field.name}"
          collection="${resolvedCollection}"
        />
      </UFormField>`
      }

      return `      <UFormField label="${fieldName}" name="${field.name}">
        <CroutonReferenceSelect
          v-model="state.${field.name}"
          collection="${resolvedCollection}"
          label="${fieldName}"
        />
      </UFormField>`
    }

    // Default component selection based on field type
    if (field.type === 'text') {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <UTextarea v-model="state.${field.name}" class="w-full" size="xl" />
      </UFormField>`
    } else if (field.type === 'boolean') {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <UCheckbox v-model="state.${field.name}" />
      </UFormField>`
    } else if (field.type === 'number' || field.type === 'decimal') {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <UInputNumber v-model="state.${field.name}" class="w-full" />
      </UFormField>`
    } else if (field.type === 'date') {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <CroutonCalendar v-model:date="state.${field.name}" />
      </UFormField>`
    } else {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <UInput v-model="state.${field.name}" class="w-full" size="xl" />
      </UFormField>`
    }
  }).join('\n\n')
  
  // Build fieldComponents map for translatable fields with custom components
  const fieldComponentsMap = {}
  translatableFields.forEach(field => {
    if (field.meta?.component) {
      fieldComponentsMap[field.name] = field.meta.component
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
                      field.type === 'date' ? 'null' : "''";
    return `  ${field.name}: ${defaultVal}`
  }).join(',\n')
  
  // Add translations to state if needed
  const translationsState = hasTranslations ? ',\n  translations: {}' : ''

  const typesPath = '../../types'

  return `<template>
  <div v-if="loading === 'notLoading'">
    <CroutonButton
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
      class="space-y-4 flex flex-col justify-between h-full gap-4"
      @submit="handleSubmit"
    >
${formFields}${translationField}

      <CroutonButton
        :action="action"
        :collection="collection"
        :items="items"
        :loading="loading"
      />
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { ${prefixedPascalCase}FormProps, ${prefixedPascalCase}FormData } from '${typesPath}'

const props = defineProps<${prefixedPascalCase}FormProps>()
const { defaultValue, schema, collection } = use${prefixedPascalCasePlural}()

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

const state = ref<${prefixedPascalCase}FormData & { id?: string | null }>(initialValues)

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
