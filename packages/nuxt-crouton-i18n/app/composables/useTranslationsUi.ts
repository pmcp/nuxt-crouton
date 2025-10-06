import { z } from 'zod'

/**
 * Zod schema for translation validation
 */
export const translationsUiSchema = z.object({
  keyPath: z.string().min(1, 'Key path is required'),
  category: z.string().min(1, 'Category is required'),
  values: z.record(z.string()).refine(
    (values) => values.en && values.en.trim() !== '',
    { message: 'English translation is required' }
  ),
  description: z.string().nullable().optional().default(''),
  namespace: z.string().optional().default('ui'),
  isOverrideable: z.boolean().optional().default(true)
})

/**
 * Table columns configuration for CroutonTable
 */
export const TRANSLATIONS_UI_COLUMNS = [
  { key: 'keyPath', label: 'Key Path' },
  { key: 'category', label: 'Category' },
  { key: 'values', label: 'Translations' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: 'Actions' }
]

/**
 * Default values for forms
 */
export const TRANSLATIONS_UI_DEFAULTS = {
  keyPath: '',
  category: '',
  namespace: 'ui',
  values: { en: '', nl: '', fr: '' },
  description: '',
  isOverrideable: true
}

/**
 * Default pagination settings
 */
export const TRANSLATIONS_UI_PAGINATION = {
  currentPage: 1,
  pageSize: 10,
  sortBy: 'keyPath',
  sortDirection: 'asc' as const
}

/**
 * Collection configuration for Crouton CRUD system
 */
export const translationsUiConfig = {
  name: 'translationsUi',
  apiPath: 'translations-ui',
  displayName: 'UI Translations',
  singularName: 'Translation',
  componentName: 'CroutonI18nUiForm',
  schema: translationsUiSchema,
  defaultValues: TRANSLATIONS_UI_DEFAULTS,
  columns: TRANSLATIONS_UI_COLUMNS,
  defaultPagination: TRANSLATIONS_UI_PAGINATION
}

/**
 * Main composable for translations UI collection
 * Provides configuration and utilities for Crouton integration
 */
export function useTranslationsUi() {
  return {
    schema: translationsUiSchema,
    columns: TRANSLATIONS_UI_COLUMNS,
    defaultValue: TRANSLATIONS_UI_DEFAULTS,
    defaultPagination: TRANSLATIONS_UI_PAGINATION,
    config: translationsUiConfig,
    collection: 'translationsUi'
  }
}

// Default export for auto-import compatibility
export default useTranslationsUi
