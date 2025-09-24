// Generator for TypeScript types
import { getImportPath } from '../utils/paths.mjs'

export function generateTypes(data) {
  const { pascalCase, pascalCasePlural, layerPascalCase, singular, layer, plural } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  const prefixedSingular = `${layerPascalCase.toLowerCase()}${pascalCase}`

  const composablePath = getImportPath('fromTypesToComposable', {
    layerName: layer,
    collectionName: plural,
    composableName: `use${prefixedPascalCasePlural}`
  })

  return `import type { z } from 'zod'
import type { ${prefixedSingular}Schema } from '${composablePath}'

export interface ${prefixedPascalCase} {
  id: string
  teamId: string
  userId: string
  ${data.fieldsTypes}
  createdAt: Date
  updatedAt: Date
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type ${prefixedPascalCase}FormData = z.infer<typeof ${prefixedSingular}Schema>
export type New${prefixedPascalCase} = Omit<${prefixedPascalCase}, 'id' | 'createdAt' | 'updatedAt'>

// Props type for the Form component
export interface ${prefixedPascalCase}FormProps {
  items: string[] // Array of IDs for delete action
  activeItem: ${prefixedPascalCase} | Record<string, never> // ${prefixedPascalCase} for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}`
}