import { z } from 'zod'

export const translationsUiSchema = z.object({
  keyPath: z.string().min(1, 'Key path is required'),
  category: z.string().min(1, 'Category is required'),
  values: z.record(z.string()).refine(
    (values) => values.en && values.en.trim() !== '',
    { message: 'English translation is required' }
  ),
  description: z.string().nullable().optional(),
  namespace: z.string().optional(),
  isOverrideable: z.boolean().optional()
})

export const translationsUiColumns = [
  { accessorKey: 'keyPath', header: 'Key Path' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'values', header: 'Translations' },
  { accessorKey: 'description', header: 'Description' }
]

export const translationsUiDefaultValues = {
  keyPath: '',
  category: '',
  namespace: 'ui',
  values: { en: '', nl: '', fr: '' },
  description: '',
  isOverrideable: true
}

/**
 * Config for app.config.ts registration
 */
export const translationsUiConfig = {
  name: 'translationsUi',
  layer: 'crouton-i18n',
  apiPath: 'translations-ui',
  componentName: 'CroutonI18nUiForm',
  schema: translationsUiSchema,
  defaultValues: translationsUiDefaultValues,
  columns: translationsUiColumns
}

/**
 * Composable for use in components - matches generator pattern
 */
export function useTranslationsUi() {
  return {
    defaultValue: translationsUiDefaultValues,
    schema: translationsUiSchema,
    columns: translationsUiColumns,
    collection: 'translationsUi'
  }
}

// Default export for auto-import compatibility
export default useTranslationsUi
