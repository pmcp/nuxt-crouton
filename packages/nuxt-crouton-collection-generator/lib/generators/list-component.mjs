// Generator for List.vue component

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
    </template>`).join('')}${referenceFields.map(field => `
    <template #${field.name}-cell="{ row }">
      <CroutonCardMini
        v-if="row.original.${field.name}"
        :id="row.original.${field.name}"
        collection="${field.refTarget}"
      />
    </template>`).join('')}${hasTranslations ? `
    <template #translations-cell="{ row }">
      <TranslationsListCards :item="row.original" :fields="['${translatableFields.join("', '")}']" />
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