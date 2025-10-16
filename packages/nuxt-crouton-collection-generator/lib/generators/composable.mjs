// Generator for use[Collection].ts composable
import { toCase } from '../utils/helpers.mjs'

export function generateComposable(data, config = {}) {
  const { singular, plural, pascalCase, pascalCasePlural, layerPascalCase, layer, fields } = data
  const prefixedSingular = `${layerPascalCase.toLowerCase()}${pascalCase}`
  const prefixedPlural = `${layerPascalCase.toLowerCase()}${pascalCasePlural}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`

  // Create kebab-case API path with layer prefix
  const apiPath = `${layer}-${plural}`

  // Runtime component handles default columns (created_at, updated_at, actions)
  const columns = data.fieldsColumns

  // Detect dependent fields and build dependentFieldComponents map
  const dependentFieldComponents = {}
  fields.forEach(field => {
    // Register Select components for: repeater fields, slotButtonGroup, or dependent fields
    if (field.type === 'repeater' || field.meta?.displayAs === 'slotButtonGroup' || field.meta?.dependsOn) {
      // Generate component name with full prefix: LayerCollectionFieldSelect
      const { pascalCase: fieldPascalCase } = toCase(field.name)
      dependentFieldComponents[field.name] = `${layerPascalCase}${pascalCasePlural}${fieldPascalCase}Select`
    }
  })

  const hasDependentFields = Object.keys(dependentFieldComponents).length > 0

  // Generate dependentFieldComponents config if needed
  const dependentFieldComponentsCode = hasDependentFields
    ? `,\n  dependentFieldComponents: {\n${Object.entries(dependentFieldComponents).map(([field, component]) => `    ${field}: '${component}'`).join(',\n')}\n  }`
    : ''

  return `import { z } from 'zod'

export const ${prefixedSingular}Schema = z.object({
  ${data.fieldsSchema}
})

export const ${prefixedPlural}Columns = [
  ${columns}
]

export const ${prefixedPlural}Config = {
  name: '${prefixedPlural}',
  layer: '${layer}',
  apiPath: '${apiPath}',
  componentName: '${layerPascalCase}${pascalCasePlural}Form',
  schema: ${prefixedSingular}Schema,
  defaultValues: {
    ${data.fieldsDefault}
  },
  columns: ${prefixedPlural}Columns${dependentFieldComponentsCode},
}

export const use${prefixedPascalCasePlural} = () => ${prefixedPlural}Config

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: ${prefixedPlural}Config.defaultValues,
    schema: ${prefixedPlural}Config.schema,
    columns: ${prefixedPlural}Config.columns,
    collection: ${prefixedPlural}Config.name
  }
}`
}