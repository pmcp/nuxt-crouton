// Generator for Form.vue component
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
        <UInput v-model.number="state.${field.name}" type="number" class="w-full" size="xl" />
      </UFormField>`
    } else if (field.type === 'date') {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <UInput
          :value="formatDateForInput(state.${field.name})"
          @input="handleDateChange($event, '${field.name}')"
          type="datetime-local"
          class="w-full"
          size="xl"
        />
      </UFormField>`
    } else {
      return `      <UFormField label="${fieldName}" name="${field.name}">
        <UInput v-model="state.${field.name}" class="w-full" size="xl" />
      </UFormField>`
    }
  }).join('\n\n')
  
  // Add TranslationsInput if there are translatable fields
  const translationField = hasTranslations ? `

      <!-- Translation fields -->
      <TranslationsInput
        v-model="state.translations"
        :fields="[${translatableFieldNames.map(f => `'${f}'`).join(', ')}]"
        :default-values="{
          ${translatableFields.map(f => `${f.name}: state.${f.name}`).join(',\n          ')}
        }"
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
    <!-- DELETE BUTTON-->
    <CroutonButton
      v-if="action === 'delete'"
      :action="action"
      :collection="collection"
      :items="items"
      :loading="loading"
    />

    <!-- FORM FOR EDIT OR CREATE -->
    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="space-y-4 flex flex-col justify-between h-full gap-4"
      @submit="send(action, collection, state)"
      size="lg"
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

const { send } = useCrouton()
const props = defineProps<${prefixedPascalCase}FormProps>()
const { defaultValue, schema, collection } = use${prefixedPascalCasePlural}()

// Initialize form state with proper values (no watch needed!)
const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }

const state = ref<${prefixedPascalCase}FormData & { id?: string | null }>(initialValues)${hasDateFields ? `

// Date field helper functions
const formatDateForInput = (date: Date | null | undefined): string => {
  if (!date || !(date instanceof Date)) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return \`\${year}-\${month}-\${day}T\${hours}:\${minutes}\`
}

const handleDateChange = (event: Event, fieldName: string) => {
  const target = event.target as HTMLInputElement
  if (target.value) {
    ;(state.value as any)[fieldName] = new Date(target.value)
  } else {
    ;(state.value as any)[fieldName] = null
  }
}` : ''}
</script>`
}
