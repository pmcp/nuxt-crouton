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

  return `<template>
  <CroutonList
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
      // Resolve collection name (handle : prefix for external collections)
      let resolvedCollection
      if (field.refTarget.startsWith(':')) {
        // External/global collection - remove : prefix
        resolvedCollection = field.refTarget.substring(1)
      } else {
        // Add layer prefix
        const refCases = toCase(field.refTarget)
        resolvedCollection = `${layerPascalCase.toLowerCase()}${refCases.pascalCasePlural}`
      }

      return `
    <template #${field.name}-cell="{ row }">
      <CroutonCardMini
        v-if="row.original.${field.name}"
        :id="row.original.${field.name}"
        collection="${resolvedCollection}"
      />
    </template>`
    }).join('')}${hasTranslations ? `
    <template #translations-cell="{ row }">
      <CroutonI18nListCards :item="row.original" :fields="['${translatableFields.join("', '")}']" />
    </template>` : ''}
  </CroutonList>
</template>

<script setup lang="ts">
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