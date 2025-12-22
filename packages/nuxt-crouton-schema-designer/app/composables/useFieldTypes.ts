import type { FieldTypeConfig, FieldType } from '../types/schema'

export const FIELD_TYPES: FieldTypeConfig[] = [
  {
    type: 'string',
    label: 'String',
    icon: 'i-lucide-type',
    description: 'Short text (VARCHAR 255)',
    defaultMeta: {}
  },
  {
    type: 'text',
    label: 'Text',
    icon: 'i-lucide-file-text',
    description: 'Long text content',
    defaultMeta: {}
  },
  {
    type: 'number',
    label: 'Number',
    icon: 'i-lucide-hash',
    description: 'Integer value',
    defaultMeta: {}
  },
  {
    type: 'decimal',
    label: 'Decimal',
    icon: 'i-lucide-percent',
    description: 'Decimal number (10,2)',
    defaultMeta: { precision: 10, scale: 2 }
  },
  {
    type: 'boolean',
    label: 'Boolean',
    icon: 'i-lucide-toggle-left',
    description: 'True/false toggle',
    defaultMeta: { default: false }
  },
  {
    type: 'date',
    label: 'Date',
    icon: 'i-lucide-calendar',
    description: 'Date only',
    defaultMeta: {}
  },
  {
    type: 'datetime',
    label: 'DateTime',
    icon: 'i-lucide-calendar-clock',
    description: 'Date and time',
    defaultMeta: {}
  },
  {
    type: 'integer',
    label: 'Integer',
    icon: 'i-lucide-binary',
    description: 'Whole number',
    defaultMeta: {}
  },
  {
    type: 'json',
    label: 'JSON',
    icon: 'i-lucide-braces',
    description: 'JSON object',
    defaultMeta: {}
  },
  {
    type: 'repeater',
    label: 'Repeater',
    icon: 'i-lucide-layers',
    description: 'Repeatable items array',
    defaultMeta: {}
  },
  {
    type: 'array',
    label: 'Array',
    icon: 'i-lucide-list',
    description: 'String array',
    defaultMeta: {}
  }
]

export const META_PROPERTIES = [
  { key: 'required', type: 'boolean', label: 'Required', description: 'Field must have a value' },
  { key: 'maxLength', type: 'number', label: 'Max Length', description: 'Maximum character length' },
  { key: 'label', type: 'string', label: 'Display Label', description: 'Human-readable label' },
  { key: 'translatable', type: 'boolean', label: 'Translatable', description: 'Enable i18n' },
  { key: 'area', type: 'select', label: 'Form Area', options: ['main', 'sidebar', 'meta'], description: 'Form layout area' },
  { key: 'unique', type: 'boolean', label: 'Unique', description: 'Enforce unique values' },
  { key: 'default', type: 'string', label: 'Default Value', description: 'Default value for new records' },
  { key: 'group', type: 'string', label: 'Field Group', description: 'Group related fields' }
] as const

export function useFieldTypes() {
  function getFieldType(type: FieldType): FieldTypeConfig | undefined {
    return FIELD_TYPES.find(ft => ft.type === type)
  }

  function getFieldIcon(type: FieldType): string {
    return getFieldType(type)?.icon || 'i-lucide-circle'
  }

  return {
    FIELD_TYPES,
    META_PROPERTIES,
    getFieldType,
    getFieldIcon
  }
}