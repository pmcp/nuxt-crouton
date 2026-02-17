import type { FieldTypeConfig, FieldType } from '../types/schema'

export const META_PROPERTIES = [
  { key: 'required', type: 'boolean', label: 'Required', description: 'Field must have a value' },
  { key: 'unique', type: 'boolean', label: 'Unique', description: 'Enforce unique values' },
  { key: 'label', type: 'string', label: 'Display Label', description: 'Human-readable label' },
  { key: 'area', type: 'select', label: 'Form Area', options: ['main', 'sidebar', 'meta'], description: 'Form layout area' },
  { key: 'maxLength', type: 'number', label: 'Max Length', description: 'Maximum character length' },
  { key: 'default', type: 'string', label: 'Default Value', description: 'Default value for new records' },
  { key: 'translatable', type: 'boolean', label: 'Translatable', description: 'Enable i18n' },
  { key: 'group', type: 'string', label: 'Field Group', description: 'Group related fields' },
  { key: 'displayAs', type: 'string', label: 'Display As', description: 'UI display variant' }
] as const

export function useFieldTypes() {
  const { t } = useT()
  const appConfig = useAppConfig()

  // Build FIELD_TYPES from manifest registry injected into appConfig
  const fieldTypesMap = (appConfig.crouton as any)?.fieldTypes as Record<string, any> ?? {}

  // Build the array, including alias entries with their alias name as the type
  const FIELD_TYPES: FieldTypeConfig[] = []
  const seen = new Set<string>()

  for (const [name, def] of Object.entries(fieldTypesMap)) {
    if (seen.has(name)) continue
    seen.add(name)

    const defaultMeta: Record<string, unknown> = {}
    if (def.meta) Object.assign(defaultMeta, def.meta)

    FIELD_TYPES.push({
      type: name as FieldType,
      label: def.label,
      icon: def.icon,
      description: def.description,
      defaultMeta,
    })
  }

  const translatedFieldTypes = computed<FieldTypeConfig[]>(() =>
    FIELD_TYPES.map(ft => ({
      ...ft,
      label: t(`designer.fieldTypes.${ft.type}`),
      description: t(`designer.fieldTypes.${ft.type}Description`)
    }))
  )

  function getFieldType(type: FieldType): FieldTypeConfig | undefined {
    return FIELD_TYPES.find(ft => ft.type === type)
  }

  function getFieldIcon(type: FieldType): string {
    return getFieldType(type)?.icon || 'i-lucide-circle'
  }

  function getTranslatedFieldType(type: FieldType): FieldTypeConfig | undefined {
    return translatedFieldTypes.value.find(ft => ft.type === type)
  }

  return {
    FIELD_TYPES,
    META_PROPERTIES,
    translatedFieldTypes,
    getFieldType,
    getFieldIcon,
    getTranslatedFieldType
  }
}
