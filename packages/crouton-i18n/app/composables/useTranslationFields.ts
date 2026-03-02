import type { ComputedRef, Ref } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SingleFieldValue = Record<string, string>
export type MultiFieldValue = Record<string, Record<string, string>>
export type TranslationsValue = SingleFieldValue | MultiFieldValue | null

export interface CollabConnection {
  /** Get Y.XmlFragment for a specific locale */
  getXmlFragment: (locale: string) => any
  /** Get content from Yjs XmlFragment as JSON (for reading live editor content) */
  getContentJson?: (locale: string) => unknown
  /** Set content from JSON (updates Yjs XmlFragment directly). Use force=true to overwrite existing content. */
  setContentJson?: (locale: string, content: unknown, force?: boolean) => void
  /** Get collab provider for cursor awareness */
  connection?: { awareness?: any }
  /** Current user info */
  user?: { name: string; color?: string }
}

export interface FieldOptions {
  transform?: string | ((value: string) => string)
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useTranslationFields(
  modelValue: Ref<TranslationsValue>,
  fields: ComputedRef<string[]> | Ref<string[]>,
  fieldComponents: Ref<Record<string, string> | undefined>,
  locales: Ref<any[]>,
  editingLocale: Ref<string>,
  emit: (event: 'update:modelValue' | 'update:english', ...args: any[]) => void,
) {
  // Detect if we're in multi-field mode
  const isMultiField = computed(() => {
    const f = unref(fields)
    return f && f.length > 0
  })

  // Get the component name to use for a specific field
  function getFieldComponent(field: string): string {
    return fieldComponents.value?.[field] || 'UInput'
  }

  // Create a map of field to component name for each field
  const fieldComponentMap = computed(() => {
    const map: Record<string, string> = {}
    unref(fields)?.forEach((field) => {
      map[field] = getFieldComponent(field)
    })
    return map
  })

  // Check if a field uses a block editor (content is JSON, not plain text)
  function isBlockEditorField(field: string): boolean {
    const component = getFieldComponent(field)
    return (
      component === 'CroutonPagesEditorBlockEditor' ||
      component === 'CroutonPagesEditorBlockEditorWithPreview'
    )
  }

  // Check if a field uses a rich text editor (content is HTML)
  function isRichTextField(field: string): boolean {
    const component = getFieldComponent(field)
    return component === 'CroutonEditorSimple'
  }

  // Get value for a specific field and locale
  function getFieldValue(field: string, localeCode: string): string {
    if (!modelValue.value) return ''

    if (isMultiField.value) {
      // Multi-field mode: { en: { name: "...", description: "..." } }
      const localeData = modelValue.value[localeCode] as Record<string, string> | undefined
      return localeData?.[field] || ''
    } else {
      // Single field mode: { en: "value", nl: "waarde" }
      return (modelValue.value[localeCode] as string) || ''
    }
  }

  // Update a specific field for a specific locale
  function updateFieldValue(field: string, value: string, localeCode?: string) {
    const targetLocale = localeCode || editingLocale.value

    // Emit update:english when English value changes
    if (targetLocale === 'en') {
      emit('update:english', { field, value })
    }

    if (isMultiField.value) {
      // Multi-field mode
      const updated = { ...(modelValue.value || {}) } as MultiFieldValue

      if (!updated[targetLocale]) {
        updated[targetLocale] = {}
      }

      updated[targetLocale] = {
        ...updated[targetLocale],
        [field]: value,
      }

      emit('update:modelValue', updated)
    } else {
      // Single field mode (backwards compat)
      const updated = {
        ...(modelValue.value || {}),
        [targetLocale]: value,
      } as SingleFieldValue

      emit('update:modelValue', updated)
    }
  }

  // Check if a locale has all required fields filled
  function isLocaleComplete(localeCode: string): boolean {
    if (!modelValue.value) return false

    if (isMultiField.value) {
      const localeData = modelValue.value[localeCode] as Record<string, unknown> | undefined
      if (!localeData) return false

      return unref(fields).every((field) => {
        const value = localeData[field]
        if (!value) return false
        if (typeof value === 'string') return value.trim() !== ''
        if (typeof value === 'object') return true
        return !!value
      })
    } else {
      const value = modelValue.value[localeCode]
      if (!value) return false
      if (typeof value === 'string') return value.trim() !== ''
      return !!value
    }
  }

  // Translation status for all locales
  const translationStatus = computed(() => {
    return locales.value.map((loc) => {
      const localeCode = typeof loc === 'string' ? loc : loc.code
      return {
        locale: localeCode,
        complete: isLocaleComplete(localeCode),
      }
    })
  })

  return {
    isMultiField,
    fieldComponentMap,
    getFieldComponent,
    isBlockEditorField,
    isRichTextField,
    getFieldValue,
    updateFieldValue,
    isLocaleComplete,
    translationStatus,
  }
}
