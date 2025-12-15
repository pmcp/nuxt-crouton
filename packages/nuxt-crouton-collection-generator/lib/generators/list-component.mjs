// Generator for List.vue component
import { toCase } from '../utils/helpers.mjs'

export function generateListComponent(data, config = {}) {
  const { plural, pascalCasePlural, layerPascalCase, layer, fields } = data
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  const prefixedCamelCasePlural = `${layer}${pascalCasePlural}`
  const apiPath = `${layer}-${plural}`

  // Check for translations
  const translatableFields = config?.translations?.collections?.[plural] || []
  const hasTranslations = translatableFields.length > 0

  // Check for reference fields (fields with refTarget property)
  const referenceFields = fields.filter(f => f.refTarget)

  // Check for date fields
  const dateFields = fields.filter(f => f.type === 'date')

  // Check for repeater fields
  const repeaterFields = fields.filter(f => f.type === 'repeater')

  // Check for dependent fields
  const dependentFields = fields.filter(f => f.meta?.dependsOn)

  // Check for editor fields (fields using nuxt-crouton-editor components)
  const editorFields = fields.filter(f =>
    f.meta?.component &&
    (f.meta.component === 'EditorSimple' || f.meta.component.startsWith('Editor'))
  )

  // Check for map/location fields (fields with group: "map" or type: "geojson")
  const mapFields = fields.filter(f =>
    f.meta?.group === 'map' ||
    f.type === 'geojson'
  )

  return `<template>
  <CroutonCollection
    :layout="layout"
    collection="${prefixedCamelCasePlural}"
    :columns="columns"
    :rows="${plural} || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="${prefixedPascalCasePlural}"
        :collection="'${prefixedCamelCasePlural}'"
        createButton
      />
    </template>${translatableFields.map(field => `
    <template #${field}-cell="{ row }">
      {{ t(row.original, '${field}') }}
    </template>`).join('')}${referenceFields.map(field => {
      // Resolve collection name based on refScope
      let resolvedCollection

      // Check refScope to determine how to resolve the reference
      if (field.refScope === 'adapter') {
        // Adapter-scoped reference: use target as-is (no layer prefix)
        // These are managed by connector packages (e.g., @friendlyinternet/nuxt-crouton-supersaas)
        resolvedCollection = field.refTarget
      } else {
        // Local layer reference: add layer prefix
        const refCases = toCase(field.refTarget)
        resolvedCollection = `${layerPascalCase.toLowerCase()}${refCases.pascalCasePlural}`
      }

      // Check if this is an array-type reference (multi-select)
      if (field.type === 'array') {
        return `
    <template #${field.name}-cell="{ row }">
      <div v-if="row.original.${field.name} && row.original.${field.name}.length > 0" class="flex flex-wrap gap-1">
        <CroutonItemCardMini
          v-for="itemId in row.original.${field.name}"
          :key="itemId"
          :id="itemId"
          collection="${resolvedCollection}"
        />
      </div>
      <span v-else class="text-gray-400">—</span>
    </template>`
      }

      // Single reference
      return `
    <template #${field.name}-cell="{ row }">
      <CroutonItemCardMini
        v-if="row.original.${field.name}"
        :id="row.original.${field.name}"
        collection="${resolvedCollection}"
      />
    </template>`
    }).join('')}${dateFields.map(field => `
    <template #${field.name}-cell="{ row }">
      <CroutonDate :date="row.original.${field.name}"></CroutonDate>
    </template>`).join('')}${repeaterFields.map(field => {
      const fieldCases = toCase(field.name)
      const cardMiniComponent = `${layerPascalCase}${pascalCasePlural}${fieldCases.pascalCase}CardMini`

      return `
    <template #${field.name}-cell="{ row }">
      <${cardMiniComponent} :value="row.original.${field.name}" />
    </template>`
    }).join('')}${dependentFields.map(field => {
      // Resolve the dependent collection with layer prefix
      const dependentCollectionCases = toCase(field.meta.dependsOnCollection)
      const resolvedDependentCollection = `${layerPascalCase.toLowerCase()}${dependentCollectionCases.pascalCasePlural}`

      return `
    <template #${field.name}-cell="{ row }">
      <CroutonDependentFieldCardMini
        v-if="row.original.${field.name} && row.original.${field.meta.dependsOn}"
        :value="row.original.${field.name}"
        :dependent-value="row.original.${field.meta.dependsOn}"
        dependent-collection="${resolvedDependentCollection}"
        dependent-field="${field.meta.dependsOnField}"
      />
      <span v-else class="text-gray-400">—</span>
    </template>`
    }).join('')}${editorFields.map(field => `
    <template #${field.name}-cell="{ row }">
      <CroutonEditorPreview :content="row.original.${field.name}" />
    </template>`).join('')}${mapFields.map(field => `
    <template #${field.name}-cell="{ row }">
      <CroutonMapsPreview :location="row.original.${field.name}" />
    </template>`).join('')}${hasTranslations ? `
    <template #translations-cell="{ row }">
      <CroutonI18nListCards :item="row.original" :fields="['${translatableFields.join("', '")}']" />
    </template>` : ''}
  </CroutonCollection>
</template>

<script setup lang="ts">
import use${prefixedPascalCasePlural} from '../composables/use${prefixedPascalCasePlural}'

const props = withDefaults(defineProps<{
  layout?: any
}>(), {
  layout: 'table'
})
${hasTranslations ? `
const { t } = useEntityTranslations()
const { locale } = useI18n()` : ''}
const { columns } = use${prefixedPascalCasePlural}()

const { items: ${plural}, pending } = await useCollectionQuery(
  '${prefixedCamelCasePlural}'
)
</script>`
}